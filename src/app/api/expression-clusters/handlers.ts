import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";

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

type MergeExpressionClusters = (params: {
  userId: string;
  targetClusterId: string;
  sourceClusterId: string;
  mainUserPhraseId?: string;
}) => Promise<unknown>;

type SetExpressionClusterMain = (params: {
  userId: string;
  clusterId: string;
  mainUserPhraseId: string;
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
    const payload = await parseJsonBody<{
      targetClusterId?: unknown;
      userPhraseId?: unknown;
      targetMainUserPhraseId?: unknown;
    }>(request);

    const targetClusterId = parseRequiredTrimmedString(
      payload.targetClusterId,
      "targetClusterId",
      120,
    );
    const userPhraseId = parseRequiredTrimmedString(payload.userPhraseId, "userPhraseId", 120);
    const targetMainUserPhraseId = parseOptionalTrimmedString(
      payload.targetMainUserPhraseId,
      "targetMainUserPhraseId",
      120,
    );

    const result = await deps.moveExpressionClusterMember({
      userId: user.id,
      targetClusterId,
      userPhraseId,
      targetMainUserPhraseId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to move expression cluster member.", { request });
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
    const payload = await parseJsonBody<{
      userPhraseId?: unknown;
      title?: unknown;
    }>(request);

    const userPhraseId = parseRequiredTrimmedString(payload.userPhraseId, "userPhraseId", 120);
    const title = parseOptionalTrimmedString(payload.title, "title", 200);

    const result = await deps.ensureExpressionClusterForPhrase({
      userId: user.id,
      userPhraseId,
      title,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to ensure expression cluster.", { request });
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
    const payload = await parseJsonBody<{
      nextMainUserPhraseId?: unknown;
      createNewCluster?: unknown;
    }>(request);

    const normalizedClusterId = parseRequiredTrimmedString(clusterId, "clusterId", 120);
    const normalizedUserPhraseId = parseRequiredTrimmedString(userPhraseId, "userPhraseId", 120);
    const nextMainUserPhraseId = parseOptionalTrimmedString(
      payload.nextMainUserPhraseId,
      "nextMainUserPhraseId",
      120,
    );
    const createNewCluster =
      typeof payload.createNewCluster === "boolean" ? payload.createNewCluster : true;

    const result = await deps.detachExpressionClusterMember({
      userId: user.id,
      clusterId: normalizedClusterId,
      userPhraseId: normalizedUserPhraseId,
      nextMainUserPhraseId,
      createNewCluster,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to detach expression cluster member.", { request });
  }
};

export const handleMergeExpressionClustersPost = async (
  request: Request,
  deps: {
    requireCurrentProfile: RequireCurrentProfile;
    mergeExpressionClusters: MergeExpressionClusters;
  },
) => {
  try {
    const { user } = await deps.requireCurrentProfile();
    const payload = await parseJsonBody<{
      targetClusterId?: unknown;
      sourceClusterId?: unknown;
      mainUserPhraseId?: unknown;
    }>(request);

    const targetClusterId = parseRequiredTrimmedString(
      payload.targetClusterId,
      "targetClusterId",
      120,
    );
    const sourceClusterId = parseRequiredTrimmedString(
      payload.sourceClusterId,
      "sourceClusterId",
      120,
    );
    const mainUserPhraseId = parseOptionalTrimmedString(
      payload.mainUserPhraseId,
      "mainUserPhraseId",
      120,
    );

    const result = await deps.mergeExpressionClusters({
      userId: user.id,
      targetClusterId,
      sourceClusterId,
      mainUserPhraseId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to merge expression clusters.", { request });
  }
};

export const handleSetExpressionClusterMainPost = async (
  request: Request,
  context: { params: Promise<{ clusterId: string }> },
  deps: {
    requireCurrentProfile: RequireCurrentProfile;
    setExpressionClusterMain: SetExpressionClusterMain;
  },
) => {
  try {
    const { user } = await deps.requireCurrentProfile();
    const { clusterId } = await context.params;
    const payload = await parseJsonBody<{
      mainUserPhraseId?: unknown;
    }>(request);

    const normalizedClusterId = parseRequiredTrimmedString(clusterId, "clusterId", 120);
    const mainUserPhraseId = parseRequiredTrimmedString(
      payload.mainUserPhraseId,
      "mainUserPhraseId",
      120,
    );

    const result = await deps.setExpressionClusterMain({
      userId: user.id,
      clusterId: normalizedClusterId,
      mainUserPhraseId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to set expression cluster main.", { request });
  }
};
