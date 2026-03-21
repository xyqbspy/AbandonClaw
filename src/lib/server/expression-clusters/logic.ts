import { UserExpressionClusterMemberRole } from "@/lib/server/db/types";

type NullableString = string | null | undefined;

const pickPreferredId = (candidates: string[], requestedId?: NullableString) => {
  const normalizedRequestedId = requestedId?.trim() ?? "";
  if (normalizedRequestedId && candidates.includes(normalizedRequestedId)) {
    return normalizedRequestedId;
  }
  return "";
};

export const resolveMergedClusterMainUserPhraseId = (params: {
  mergedMemberIds: string[];
  requestedMainUserPhraseId?: NullableString;
  targetClusterMainUserPhraseId?: NullableString;
  sourceClusterMainUserPhraseId?: NullableString;
}) => {
  return (
    pickPreferredId(params.mergedMemberIds, params.requestedMainUserPhraseId) ||
    pickPreferredId(params.mergedMemberIds, params.targetClusterMainUserPhraseId) ||
    pickPreferredId(params.mergedMemberIds, params.sourceClusterMainUserPhraseId) ||
    params.mergedMemberIds[0]
  );
};

export const resolveRemainingClusterMainUserPhraseId = (params: {
  remainingMemberIds: string[];
  requestedMainUserPhraseId?: NullableString;
  currentMainUserPhraseId?: NullableString;
}) => {
  return (
    pickPreferredId(params.remainingMemberIds, params.requestedMainUserPhraseId) ||
    pickPreferredId(params.remainingMemberIds, params.currentMainUserPhraseId) ||
    params.remainingMemberIds[0]
  );
};

export const resolveTargetClusterMainUserPhraseId = (params: {
  targetMemberIds: string[];
  requestedMainUserPhraseId?: NullableString;
  targetClusterMainUserPhraseId?: NullableString;
  movedUserPhraseId: string;
}) => {
  return (
    pickPreferredId(params.targetMemberIds, params.requestedMainUserPhraseId) ||
    pickPreferredId(params.targetMemberIds, params.targetClusterMainUserPhraseId) ||
    params.targetMemberIds[0] ||
    params.movedUserPhraseId
  );
};

export const resolveMoveExpressionClusterAction = (params: {
  sourceClusterId?: NullableString;
  sourceRole?: UserExpressionClusterMemberRole | null;
}) => {
  if (params.sourceClusterId && params.sourceRole === "main") {
    return "merged_cluster" as const;
  }
  if (params.sourceClusterId) {
    return "moved_member" as const;
  }
  return "attached_member" as const;
};
