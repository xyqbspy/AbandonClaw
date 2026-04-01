import { useCallback, useState } from "react";

import { MoveIntoClusterCandidate } from "@/features/chunks/components/types";
import {
  detachExpressionClusterMemberFromApi,
  ensureExpressionClusterForPhraseFromApi,
  moveExpressionClusterMemberFromApi,
  setExpressionClusterMainFromApi,
} from "@/lib/utils/expression-clusters-api";
import {
  deleteUserPhraseFromApi,
  DeleteUserPhraseResponse,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";

type UseExpressionClusterActionsDeps = {
  detachExpressionClusterMemberFromApi: typeof detachExpressionClusterMemberFromApi;
  ensureExpressionClusterForPhraseFromApi: typeof ensureExpressionClusterForPhraseFromApi;
  moveExpressionClusterMemberFromApi: typeof moveExpressionClusterMemberFromApi;
  setExpressionClusterMainFromApi: typeof setExpressionClusterMainFromApi;
  deleteUserPhraseFromApi?: typeof deleteUserPhraseFromApi;
};

const defaultDeps: UseExpressionClusterActionsDeps = {
  detachExpressionClusterMemberFromApi,
  ensureExpressionClusterForPhraseFromApi,
  moveExpressionClusterMemberFromApi,
  setExpressionClusterMainFromApi,
  deleteUserPhraseFromApi,
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
  onDeleteFocusDetailSuccess,
  onSuccess,
  onError,
  labels,
  deps = defaultDeps,
}: {
  focusExpression: UserPhraseItemResponse | null;
  focusDetailSavedItem: UserPhraseItemResponse | null;
  moveIntoClusterCandidates: MoveIntoClusterCandidate[];
  selectedMoveIntoClusterMap: Record<string, boolean>;
  loadPhrases: () => Promise<UserPhraseItemResponse[] | void>;
  onInvalidateSavedRelations: (userPhraseIds: string[]) => void;
  onAssignFocusMainExpression: (item: UserPhraseItemResponse) => void;
  onResetMoveSelection: () => void;
  onOpenMoveSheet: () => void;
  onCloseMoveSheet: () => void;
  onCloseFocusDetail: () => void;
  onCloseFocusActions: () => void;
  onClearDetailConfirm: () => void;
  onDeleteFocusDetailSuccess?: (
    result: DeleteUserPhraseResponse,
    refreshedRows: UserPhraseItemResponse[],
  ) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  labels: {
    loadFailed: string;
    detachClusterMemberSuccess: string;
    moveIntoClusterSelectOne: string;
    moveIntoClusterSuccess: string;
    moveIntoClusterPartialFailed: string;
    deleteExpressionSuccess?: string;
  };
  deps?: UseExpressionClusterActionsDeps;
}) => {
  const [detachingClusterMember, setDetachingClusterMember] = useState(false);
  const [moveIntoClusterOpen, setMoveIntoClusterOpen] = useState(false);
  const [movingIntoCluster, setMovingIntoCluster] = useState(false);
  const [ensuringMoveTargetCluster, setEnsuringMoveTargetCluster] = useState(false);
  const [deletingCurrentExpression, setDeletingCurrentExpression] = useState(false);

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

  const deleteFocusDetailExpression = useCallback(async () => {
    const savedItem = focusDetailSavedItem;
    if (!savedItem) return;

    setDeletingCurrentExpression(true);
    try {
      const deletePhrase = deps.deleteUserPhraseFromApi ?? defaultDeps.deleteUserPhraseFromApi;
      const result = await deletePhrase(savedItem.userPhraseId);
      const nextRows = await loadPhrases();
      const refreshedRows = Array.isArray(nextRows) ? nextRows : [];
      onInvalidateSavedRelations(
        [
          savedItem.userPhraseId,
          focusExpression?.userPhraseId ?? "",
          result.nextMainUserPhraseId ?? "",
          result.nextFocusUserPhraseId ?? "",
        ].filter(Boolean),
      );
      onCloseFocusActions();
      onClearDetailConfirm();
      onDeleteFocusDetailSuccess?.(result, refreshedRows);
      onSuccess?.(labels.deleteExpressionSuccess ?? "已删除当前表达");
    } catch (error) {
      onError?.(error instanceof Error ? error.message : labels.loadFailed);
    } finally {
      setDeletingCurrentExpression(false);
    }
  }, [
    deps,
    focusDetailSavedItem,
    focusExpression?.userPhraseId,
    labels.loadFailed,
    loadPhrases,
    onClearDetailConfirm,
    onCloseFocusActions,
    onDeleteFocusDetailSuccess,
    onError,
    onInvalidateSavedRelations,
    onSuccess,
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
          mergedClusterCount ? `${mergedClusterCount} 个整簇` : "",
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
    deletingCurrentExpression,
    detachFocusDetailFromCluster,
    deleteFocusDetailExpression,
    setFocusDetailAsClusterMain,
    handleMoveSelectedIntoCurrentCluster,
    openMoveIntoCurrentCluster,
  };
};

