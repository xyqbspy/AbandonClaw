import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  parseJsonBody,
  parseOptionalBoolean,
  parseOptionalJsonObject,
  parseOptionalTrimmedString,
  parsePracticeAssessmentLevel,
  parsePracticeMode,
  parseRequiredTrimmedString,
  parseSourceType,
} from "@/lib/server/validation";
import { recordScenePracticeAttempt } from "@/lib/server/learning/practice-service";

interface RecordScenePracticeAttemptPayload extends Record<string, unknown> {
  practiceSetId?: unknown;
  mode?: unknown;
  sourceType?: unknown;
  sourceVariantId?: unknown;
  exerciseId?: unknown;
  sentenceId?: unknown;
  userAnswer?: unknown;
  assessmentLevel?: unknown;
  isCorrect?: unknown;
  metadata?: unknown;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const payload = await parseJsonBody<RecordScenePracticeAttemptPayload>(request);
    const result = await recordScenePracticeAttempt(user.id, slug, {
      practiceSetId: parseRequiredTrimmedString(payload.practiceSetId, "practiceSetId", 120),
      mode: parsePracticeMode(payload.mode),
      sourceType: parseSourceType(payload.sourceType),
      sourceVariantId: parseOptionalTrimmedString(payload.sourceVariantId, "sourceVariantId", 64),
      exerciseId: parseRequiredTrimmedString(payload.exerciseId, "exerciseId", 120),
      sentenceId: parseOptionalTrimmedString(payload.sentenceId, "sentenceId", 120),
      userAnswer: parseRequiredTrimmedString(payload.userAnswer, "userAnswer", 10000),
      assessmentLevel: parsePracticeAssessmentLevel(payload.assessmentLevel),
      isCorrect: parseOptionalBoolean(payload.isCorrect, "isCorrect") ?? false,
      metadata: parseOptionalJsonObject(payload.metadata, "metadata"),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to record scene practice attempt.");
  }
}
