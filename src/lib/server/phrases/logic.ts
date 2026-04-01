import { resolveRemainingClusterMainUserPhraseId } from "@/lib/server/expression-clusters/logic";

type NullableString = string | null | undefined;

export const resolveDeleteExpressionClusterResult = (params: {
  remainingMemberIds: string[];
  currentMainUserPhraseId?: NullableString;
}) => {
  if (params.remainingMemberIds.length === 0) {
    return {
      clusterDeleted: true,
      nextMainUserPhraseId: null,
    };
  }

  return {
    clusterDeleted: false,
    nextMainUserPhraseId: resolveRemainingClusterMainUserPhraseId({
      remainingMemberIds: params.remainingMemberIds,
      currentMainUserPhraseId: params.currentMainUserPhraseId,
    }),
  };
};
