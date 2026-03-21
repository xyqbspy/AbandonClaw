import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";

type RequireCurrentProfile = () => Promise<{ user: { id: string } }>;

type MoveExpressionClusterMember = (params: {
  userId: string;
  targetClusterId: string;
  userPhraseId: string;
  targetMainUserPhraseId?: string;
}) => Promise<unknown>;

type EnsureExpressionClusterForPhrase = (params: {
  userId: string;
  userPhraseId: string;
  title?: string;
}) => Promise<unknown>;

type DetachExpressionClusterMember = (params: {
  userId: string;
  clusterId: string;
  userPhraseId: string;
  nextMainUserPhraseId?: string;
  createNewCluster?: boolean;
}) => Promise<unknown>;

export const handleMoveExpressionClusterMemberPost = async (
  request: Request,
  deps: {
    requireCurrentProfile: RequireCurrentProfile;
    moveExpressionClusterMember: MoveExpressionClusterMember;
  },
) => {
  try {
    const { user } = await deps.requireCurrentProfile();
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

    const result = await deps.moveExpressionClusterMember({
      userId: user.id,
      targetClusterId,
      userPhraseId,
      targetMainUserPhraseId: targetMainUserPhraseId || undefined,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to move expression cluster member.");
  }
};

export const handleEnsureExpressionClusterPost = async (
  request: Request,
  deps: {
    requireCurrentProfile: RequireCurrentProfile;
    ensureExpressionClusterForPhrase: EnsureExpressionClusterForPhrase;
  },
) => {
  try {
    const { user } = await deps.requireCurrentProfile();
    const payload = (await request.json()) as {
      userPhraseId?: unknown;
      title?: unknown;
    };

    const userPhraseId =
      typeof payload.userPhraseId === "string" ? payload.userPhraseId.trim() : "";
    const title = typeof payload.title === "string" ? payload.title.trim() : "";

    if (!userPhraseId) {
      throw new ValidationError("userPhraseId is required.");
    }

    const result = await deps.ensureExpressionClusterForPhrase({
      userId: user.id,
      userPhraseId,
      title: title || undefined,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to ensure expression cluster.");
  }
};

export const handleDetachExpressionClusterMemberPost = async (
  request: Request,
  context: { params: Promise<{ clusterId: string; userPhraseId: string }> },
  deps: {
    requireCurrentProfile: RequireCurrentProfile;
    detachExpressionClusterMember: DetachExpressionClusterMember;
  },
) => {
  try {
    const { user } = await deps.requireCurrentProfile();
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

    const result = await deps.detachExpressionClusterMember({
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
};
