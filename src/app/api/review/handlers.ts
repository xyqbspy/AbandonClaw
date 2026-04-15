import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  getDueReviewItems,
  getDueScenePracticeReviewItems,
  getReviewSummary,
  submitPhraseReview,
} from "@/lib/server/review/service";
import {
  normalizeReviewSubmitPayload,
  parseReviewSubmitRequest,
} from "@/lib/server/request-schemas";
import { ValidationError } from "@/lib/server/errors";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  buildDeterministicIdempotencyKey,
  getRequestIdempotencyKey,
  runIdempotentMutation,
} from "@/lib/server/idempotency";

const parseLimit = (raw: string | null) => {
  if (!raw) return 20;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError("limit must be a positive number.");
  }
  return Math.min(100, Math.floor(parsed));
};

interface ReviewDueHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  getDueReviewItems: typeof getDueReviewItems;
  getDueScenePracticeReviewItems: typeof getDueScenePracticeReviewItems;
}

const defaultReviewDueDependencies: ReviewDueHandlerDependencies = {
  requireCurrentProfile,
  getDueReviewItems,
  getDueScenePracticeReviewItems,
};

export async function handleReviewDueGet(
  request: Request,
  dependencies: ReviewDueHandlerDependencies = defaultReviewDueDependencies,
) {
  try {
    const { user } = await dependencies.requireCurrentProfile();
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const [rows, scenePracticeRows] = await Promise.all([
      dependencies.getDueReviewItems(user.id, { limit }),
      dependencies.getDueScenePracticeReviewItems(user.id, { limit: Math.min(limit, 6) }),
    ]);
    return NextResponse.json({ rows, total: rows.length, scenePracticeRows }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load due review items.");
  }
}

interface ReviewSubmitHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  submitPhraseReview: typeof submitPhraseReview;
  getReviewSummary: typeof getReviewSummary;
}

const defaultReviewSubmitDependencies: ReviewSubmitHandlerDependencies = {
  requireCurrentProfile,
  submitPhraseReview,
  getReviewSummary,
};

export async function handleReviewSubmitPost(
  request: Request,
  dependencies: ReviewSubmitHandlerDependencies = defaultReviewSubmitDependencies,
) {
  try {
    assertAllowedOrigin(request);
    const { user } = await dependencies.requireCurrentProfile();
    const payload = await parseReviewSubmitRequest(request);
    const normalizedPayload = normalizeReviewSubmitPayload(payload);
    const idempotencyKey = getRequestIdempotencyKey(
      request,
      buildDeterministicIdempotencyKey("review-submit", user.id, normalizedPayload),
    );
    const { item, summary } = await runIdempotentMutation({
      scope: "review-submit",
      key: idempotencyKey,
      execute: async () => {
        const item = await dependencies.submitPhraseReview(user.id, normalizedPayload);
        const summary = await dependencies.getReviewSummary(user.id);
        return { item, summary };
      },
    });
    return NextResponse.json({ item, summary }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to submit review.", { request });
  }
}
