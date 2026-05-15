import { resolveRemainingClusterMainUserPhraseId } from "@/lib/server/expression-clusters/logic";
import { UserPhraseReviewStatus } from "@/lib/server/db/types";

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

export const resolveSavedPhraseReviewState = (params: {
  learningItemType: "expression" | "sentence";
  existingReviewStatus?: UserPhraseReviewStatus | null;
  existingNextReviewAt?: string | null;
  now: string;
}) => {
  if (params.learningItemType === "sentence") {
    return {
      reviewStatus: "archived" as const,
      nextReviewAt: null,
    };
  }

  const reviewStatus =
    params.existingReviewStatus === "archived"
      ? ("saved" as const)
      : (params.existingReviewStatus ?? ("saved" as const));

  return {
    reviewStatus,
    nextReviewAt:
      params.existingNextReviewAt ??
      (params.existingReviewStatus === "mastered" ? null : params.now),
  };
};
