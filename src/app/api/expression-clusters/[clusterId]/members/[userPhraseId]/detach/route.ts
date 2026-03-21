import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { detachExpressionClusterMember } from "@/lib/server/expression-clusters/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ clusterId: string; userPhraseId: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { clusterId, userPhraseId } = await context.params;
    const payload = (await request.json()) as {
      nextMainUserPhraseId?: unknown;
      createNewCluster?: unknown;
    };

    if (!clusterId?.trim() || !userPhraseId?.trim()) {
      throw new ValidationError("clusterId and userPhraseId are required.");
    }

    const nextMainUserPhraseId =
      typeof payload.nextMainUserPhraseId === "string" ? payload.nextMainUserPhraseId.trim() : "";
    const createNewCluster =
      typeof payload.createNewCluster === "boolean" ? payload.createNewCluster : true;

    const result = await detachExpressionClusterMember({
      userId: user.id,
      clusterId: clusterId.trim(),
      userPhraseId: userPhraseId.trim(),
      nextMainUserPhraseId: nextMainUserPhraseId || undefined,
      createNewCluster,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to detach expression cluster member.");
  }
}
