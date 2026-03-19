import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { enrichAiExpressionLearningInfo } from "@/lib/server/phrases/service";
import { parseOptionalTrimmedString } from "@/lib/server/validation";

interface EnrichPayload {
  userPhraseId?: unknown;
  baseExpression?: unknown;
  differenceLabel?: unknown;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = (await request.json()) as EnrichPayload;

    const userPhraseId = parseOptionalTrimmedString(payload.userPhraseId, "userPhraseId", 80);
    if (!userPhraseId) {
      return NextResponse.json({ error: "userPhraseId is required." }, { status: 400 });
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
    return toApiErrorResponse(error, "Failed to enrich similar expression.");
  }
}
