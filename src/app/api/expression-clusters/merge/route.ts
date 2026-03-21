import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { mergeExpressionClusters } from "@/lib/server/expression-clusters/service";

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = (await request.json()) as {
      targetClusterId?: unknown;
      sourceClusterId?: unknown;
      mainUserPhraseId?: unknown;
    };

    const targetClusterId =
      typeof payload.targetClusterId === "string" ? payload.targetClusterId.trim() : "";
    const sourceClusterId =
      typeof payload.sourceClusterId === "string" ? payload.sourceClusterId.trim() : "";
    const mainUserPhraseId =
      typeof payload.mainUserPhraseId === "string" ? payload.mainUserPhraseId.trim() : "";

    if (!targetClusterId || !sourceClusterId) {
      throw new ValidationError("targetClusterId and sourceClusterId are required.");
    }

    const result = await mergeExpressionClusters({
      userId: user.id,
      targetClusterId,
      sourceClusterId,
      mainUserPhraseId: mainUserPhraseId || undefined,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to merge expression clusters.");
  }
}
