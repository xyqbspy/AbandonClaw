import { NextResponse } from "next/server";
import {
  assertProfileCanGenerate,
  assertProfileCanWrite,
  requireCurrentProfile,
} from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { enrichAiExpressionLearningInfo } from "@/lib/server/phrases/service";
import { parseJsonBody, parseOptionalTrimmedString } from "@/lib/server/validation";

interface EnrichPayload extends Record<string, unknown> {
  userPhraseId?: unknown;
  baseExpression?: unknown;
  differenceLabel?: unknown;
}

export async function POST(request: Request) {
  try {
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanGenerate(profile);
    assertProfileCanWrite(profile);
    const payload = await parseJsonBody<EnrichPayload>(request);

    const userPhraseId = parseOptionalTrimmedString(payload.userPhraseId, "userPhraseId", 80);
    if (!userPhraseId) {
      throw new ValidationError("userPhraseId is required.");
    }

    const result = await enrichAiExpressionLearningInfo({
      userId: user.id,
      userPhraseId,
      baseExpression: parseOptionalTrimmedString(payload.baseExpression, "baseExpression", 200) ?? undefined,
      differenceLabel:
        parseOptionalTrimmedString(payload.differenceLabel, "differenceLabel", 40) ?? undefined,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to enrich similar expression.", { request });
  }
}
