import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { moveExpressionClusterMember } from "@/lib/server/expression-clusters/service";

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = (await request.json()) as {
      targetClusterId?: unknown;
      userPhraseId?: unknown;
      targetMainUserPhraseId?: unknown;
    };

    const targetClusterId =
      typeof payload.targetClusterId === "string" ? payload.targetClusterId.trim() : "";
    const userPhraseId =
      typeof payload.userPhraseId === "string" ? payload.userPhraseId.trim() : "";
    const targetMainUserPhraseId =
      typeof payload.targetMainUserPhraseId === "string"
        ? payload.targetMainUserPhraseId.trim()
        : "";

    if (!targetClusterId || !userPhraseId) {
      throw new ValidationError("targetClusterId and userPhraseId are required.");
    }

    const result = await moveExpressionClusterMember({
      userId: user.id,
      targetClusterId,
      userPhraseId,
      targetMainUserPhraseId: targetMainUserPhraseId || undefined,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to move expression cluster member.");
  }
}
