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
  parseJsonBody,
  parseOptionalReviewFullOutputStatus,
  parseOptionalReviewOutputConfidence,
  parseOptionalReviewRecognitionState,
  parseOptionalTrimmedString,
  parseRequiredTrimmedString,
  parseReviewResult,
} from "@/lib/server/validation";
import { ValidationError } from "@/lib/server/errors";

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

interface SubmitReviewPayload extends Record<string, unknown> {
  userPhraseId?: unknown;
  reviewResult?: unknown;
  source?: unknown;
  recognitionState?: unknown;
  outputConfidence?: unknown;
  fullOutputStatus?: unknown;
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
    const { user } = await dependencies.requireCurrentProfile();
    const payload = await parseJsonBody<SubmitReviewPayload>(request);
    const item = await dependencies.submitPhraseReview(user.id, {
      userPhraseId: parseRequiredTrimmedString(payload.userPhraseId, "userPhraseId", 64),
      reviewResult: parseReviewResult(payload.reviewResult),
      source: parseOptionalTrimmedString(payload.source, "source", 80),
      recognitionState: parseOptionalReviewRecognitionState(payload.recognitionState),
      outputConfidence: parseOptionalReviewOutputConfidence(payload.outputConfidence),
      fullOutputStatus: parseOptionalReviewFullOutputStatus(payload.fullOutputStatus),
    });
    const summary = await dependencies.getReviewSummary(user.id);
    return NextResponse.json({ item, summary }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to submit review.");
  }
}
