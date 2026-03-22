import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { enrichAiExpressionLearningInfo } from "@/lib/server/phrases/service";
import { parseJsonBody, parseOptionalTrimmedString } from "@/lib/server/validation";

interface EnrichItemPayload {
  userPhraseId?: unknown;
  baseExpression?: unknown;
  differenceLabel?: unknown;
}

interface EnrichAllPayload {
  items?: unknown;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = await parseJsonBody<EnrichAllPayload>(request);
    if (!Array.isArray(payload.items)) {
      throw new ValidationError("items must be an array.");
    }
    const items = payload.items.slice(0, 50) as EnrichItemPayload[];
    if (items.length === 0) {
      throw new ValidationError("items is empty.");
    }

    const results: Array<{ userPhraseId: string; status: "done" | "failed"; error?: string }> = [];
    for (const item of items) {
      const userPhraseId = parseOptionalTrimmedString(item.userPhraseId, "userPhraseId", 80);
      if (!userPhraseId) {
        results.push({
          userPhraseId: "",
          status: "failed",
          error: "userPhraseId is required.",
        });
        continue;
      }
      try {
        const result = await enrichAiExpressionLearningInfo({
          userId: user.id,
          userPhraseId,
          baseExpression:
            parseOptionalTrimmedString(item.baseExpression, "baseExpression", 200) ?? undefined,
          differenceLabel:
            parseOptionalTrimmedString(item.differenceLabel, "differenceLabel", 40) ?? undefined,
        });
        results.push({ userPhraseId: result.userPhraseId, status: "done" });
      } catch (error) {
        results.push({
          userPhraseId,
          status: "failed",
          error: error instanceof Error ? error.message : "Failed",
        });
      }
    }
    return NextResponse.json({ items: results }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to enrich similar expressions in batch.");
  }
}
