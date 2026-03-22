import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { submitPhraseReview, getReviewSummary } from "@/lib/server/review/service";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
  parseRequiredTrimmedString,
  parseReviewResult,
} from "@/lib/server/validation";

interface SubmitReviewPayload {
  userPhraseId?: unknown;
  reviewResult?: unknown;
  source?: unknown;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = await parseJsonBody<SubmitReviewPayload>(request);
    const item = await submitPhraseReview(user.id, {
      userPhraseId: parseRequiredTrimmedString(payload.userPhraseId, "userPhraseId", 64),
      reviewResult: parseReviewResult(payload.reviewResult),
      source: parseOptionalTrimmedString(payload.source, "source", 80),
    });
    const summary = await getReviewSummary(user.id);
    return NextResponse.json({ item, summary }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to submit review.");
  }
}
