import { useCallback, useState } from "react";

import { MoveIntoClusterCandidate } from "@/features/chunks/components/types";
import {
  detachExpressionClusterMemberFromApi,
  ensureExpressionClusterForPhraseFromApi,
  moveExpressionClusterMemberFromApi,
  setExpressionClusterMainFromApi,
} from "@/lib/utils/expression-clusters-api";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

type UseExpressionClusterActionsDeps = {
  detachExpressionClusterMemberFromApi: typeof detachExpressionClusterMemberFromApi;
  ensureExpressionClusterForPhraseFromApi: typeof ensureExpressionClusterForPhraseFromApi;
  moveExpressionClusterMemberFromApi: typeof moveExpressionClusterMemberFromApi;
  setExpressionClusterMainFromApi: typeof setExpressionClusterMainFromApi;
};

const defaultDeps: UseExpressionClusterActionsDeps = {
  detachExpressionClusterMemberFromApi,
  ensureExpressionClusterForPhraseFromApi,
  moveExpressionClusterMemberFromApi,
  setExpressionClusterMainFromApi,
};

export const useExpressionClusterActions = ({
  focusExpression,
  focusDetailSavedItem,
  moveIntoClusterCandidates,
  selectedMoveIntoClusterMap,
  loadPhrases,
  onInvalidateSavedRelations,
  onAssignFocusMainExpression,
  onResetMoveSelection,
  onOpenMoveSheet,
  onCloseMoveSheet,
  onCloseFocusDetail,
  onCloseFocusActions,
  onClearDetailConfirm,
  onSuccess,
  onError,
  labels,
  deps = defaultDeps,
}: {
  focusExpression: UserPhraseItemResponse | null;
  focusDetailSavedItem: UserPhraseItemResponse | null;
  moveIntoClusterCandidates: MoveIntoClusterCandidate[];
  selectedMoveIntoClusterMap: Record<string, boolean>;
  loadPhrases: () => Promise<void>;
  onInvalidateSavedRelations: (userPhraseIds: string[]) => void;
  onAssignFocusMainExpression: (item: UserPhraseItemResponse) => void;
  onResetMoveSelection: () => void;
  onOpenMoveSheet: () => void;
  onCloseMoveSheet: () => void;
  onCloseFocusDetail: () => void;
  onCloseFocusActions: () => void;
  onClearDetailConfirm: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  labels: {
    loadFailed: string;
    detachClusterMemberSuccess: string;
    moveIntoClusterSelectOne: string;
    moveIntoClusterSuccess: string;
    moveIntoClusterPartialFailed: string;
  };
  deps?: UseExpressionClusterActionsDeps;
}) => {
  const [detachingClusterMember, setDetachingClusterMember] = useState(false);
  const [moveIntoClusterOpen, setMoveIntoClusterOpen] = useState(false);
  const [movingIntoCluster, setMovingIntoCluster] = useState(false);
  const [ensuringMoveTargetCluster, setEnsuringMoveTargetCluster] = useState(false);

  const detachFocusDetailFromCluster = useCallback(async () => {
    const savedItem = focusDetailSavedItem;
    const clusterId = savedItem?.expressionClusterId ?? "";
    if (!savedItem || !clusterId) return;

    setDetachingClusterMember(true);
    try {
      await deps.detachExpressionClusterMemberFromApi({
        clusterId,
        userPhraseId: savedItem.userPhraseId,
        createNewCluster: true,
      });
      await loadPhrases();
      onInvalidateSavedRelations(
        [savedItem.userPhraseId, focusExpression?.userPhraseId ?? ""].filter(Boolean),
      );
      onSuccess?.(labels.detachClusterMemberSuccess);
      onClearDetailConfirm();
      onCloseFocusDetail();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : labels.loadFailed);
    } finally {
      setDetachingClusterMember(false);
    }
  }, [
    deps,
    focusDetailSavedItem,
    focusExpression?.userPhraseId,
    labels.detachClusterMemberSuccess,
    labels.loadFailed,
    loadPhrases,
    onClearDetailConfirm,
    onCloseFocusDetail,
    onError,
    onInvalidateSavedRelations,
    onSuccess,
  ]);

  const setFocusDetailAsClusterMain = useCallback(async () => {
    const savedItem = focusDetailSavedItem;
    if (!savedItem) return;

    try {
      if (savedItem.expressionClusterId) {
        await deps.setExpressionClusterMainFromApi({
          clusterId: savedItem.expressionClusterId,
          mainUserPhraseId: savedItem.userPhraseId,
        });
      }
      onAssignFocusMainExpression(savedItem);
      onCloseFocusActions();
      onClearDetailConfirm();
      onCloseFocusDetail();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : labels.loadFailed);
    }
  }, [
    deps,
    focusDetailSavedItem,
    labels.loadFailed,
    onAssignFocusMainExpression,
    onClearDetailConfirm,
    onCloseFocusActions,
    onCloseFocusDetail,
    onError,
  ]);

  const handleMoveSelectedIntoCurrentCluster = useCallback(async () => {
    const targetClusterId = focusExpression?.expressionClusterId ?? "";
    const targetMainUserPhraseId = focusExpression?.userPhraseId ?? "";
    if (!targetClusterId || !targetMainUserPhraseId) return;

    const selectedCandidates = moveIntoClusterCandidates.filter(
      (candidate) => selectedMoveIntoClusterMap[candidate.row.userPhraseId],
    );
    if (selectedCandidates.length === 0) {
      onError?.(labels.moveIntoClusterSelectOne);
      return;
    }

    setMovingIntoCluster(true);
    let successCount = 0;
    let mergedClusterCount = 0;
    let movedMemberCount = 0;
    let attachedMemberCount = 0;
    const coveredSourceClusterIds = new Set<string>();
    const failedMessages: string[] = [];

    try {
      for (const candidate of selectedCandidates) {
        if (candidate.sourceClusterId && coveredSourceClusterIds.has(candidate.sourceClusterId)) {
          continue;
        }

        try {
          const result = await deps.moveExpressionClusterMemberFromApi({
            targetClusterId,
            userPhraseId: candidate.row.userPhraseId,
            targetMainUserPhraseId,
          });
          successCount += 1;
          if (result.action === "merged_cluster") {
            mergedClusterCount += 1;
            if (candidate.sourceClusterId) {
              coveredSourceClusterIds.add(candidate.sourceClusterId);
            }
          } else if (result.action === "moved_member") {
            movedMemberCount += 1;
          } else {
            attachedMemberCount += 1;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : labels.loadFailed;
          if (message.includes("already belongs to the target cluster")) {
            continue;
          }
          failedMessages.push(`${candidate.row.text}：${message}`);
        }
      }

      if (successCount > 0) {
        await loadPhrases();
        onInvalidateSavedRelations([
          focusExpression?.userPhraseId ?? "",
          ...selectedCandidates.map((candidate) => candidate.row.userPhraseId),
        ]);

        const summary = [
          mergedClusterCount ? `${mergedClusterCount} 个整组` : "",
          movedMemberCount ? `${movedMemberCount} 个子表达` : "",
          attachedMemberCount ? `${attachedMemberCount} 个独立表达` : "",
        ]
          .filter(Boolean)
          .join("，");
        onSuccess?.(
          `${labels.moveIntoClusterSuccess} ${successCount} 项${summary ? `（${summary}）` : ""}`,
        );
        setMoveIntoClusterOpen(false);
        onCloseMoveSheet();
        onResetMoveSelection();
      }

      if (failedMessages.length > 0) {
        onError?.(`${labels.moveIntoClusterPartialFailed}：${failedMessages[0]}`);
      }
    } finally {
      setMovingIntoCluster(false);
    }
  }, [
    deps,
    focusExpression,
    labels.loadFailed,
    labels.moveIntoClusterPartialFailed,
    labels.moveIntoClusterSelectOne,
    labels.moveIntoClusterSuccess,
    loadPhrases,
    moveIntoClusterCandidates,
    onCloseMoveSheet,
    onError,
    onInvalidateSavedRelations,
    onResetMoveSelection,
    onSuccess,
    selectedMoveIntoClusterMap,
  ]);

  const openMoveIntoCurrentCluster = useCallback(async () => {
    if (!focusExpression || moveIntoClusterCandidates.length === 0) return;

    onCloseFocusActions();
    onResetMoveSelection();

    if (!focusExpression.expressionClusterId) {
      setEnsuringMoveTargetCluster(true);
      try {
        await deps.ensureExpressionClusterForPhraseFromApi({
          userPhraseId: focusExpression.userPhraseId,
          title: focusExpression.text,
        });
        await loadPhrases();
      } catch (error) {
        onError?.(error instanceof Error ? error.message : labels.loadFailed);
        return;
      } finally {
        setEnsuringMoveTargetCluster(false);
      }
    }

    setMoveIntoClusterOpen(true);
    onOpenMoveSheet();
  }, [
    deps,
    focusExpression,
    labels.loadFailed,
    loadPhrases,
    moveIntoClusterCandidates.length,
    onCloseFocusActions,
    onError,
    onOpenMoveSheet,
    onResetMoveSelection,
  ]);

  return {
    detachingClusterMember,
    moveIntoClusterOpen,
    setMoveIntoClusterOpen,
    movingIntoCluster,
    ensuringMoveTargetCluster,
    detachFocusDetailFromCluster,
    setFocusDetailAsClusterMain,
    handleMoveSelectedIntoCurrentCluster,
    openMoveIntoCurrentCluster,
  };
};
