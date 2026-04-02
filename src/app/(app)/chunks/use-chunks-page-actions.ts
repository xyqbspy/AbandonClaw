"use client";

import { useCallback } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getChunksExpressionMapCache, setChunksExpressionMapCache } from "@/lib/cache/chunks-runtime-cache";
import { generateExpressionMapFromApi } from "@/lib/utils/expression-map-api";
import {
  PhraseReviewStatus,
  savePhraseFromApi,
  savePhrasesBatchFromApi,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { ExpressionCluster, ExpressionMapResponse } from "@/lib/types/expression-map";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { resolveDeleteFocusDetailSuccessState } from "./chunks-page-logic";

type DeleteFocusDetailResult = {
  deletedUserPhraseId: string;
  deletedClusterId: string | null;
  clusterDeleted: boolean;
  nextMainUserPhraseId: string | null;
  nextFocusUserPhraseId: string | null;
};

type UseChunksPageActionsProps = {
  stop: () => void;
  focusExpression: UserPhraseItemResponse | null;
  openFocusDetail: (input: {
    text: string;
    kind: "current";
    chainMode: "reset";
  }) => unknown;
  onCloseFocusDetail: () => void;
  setFocusRelationTab: (tab: "similar" | "contrast") => void;
  router: AppRouterInstance;
  phrases: UserPhraseItemResponse[];
  activeCluster: ExpressionCluster | null;
  mapSourceExpression: UserPhraseItemResponse | null;
  addingCluster: boolean;
  setAddingCluster: (value: boolean) => void;
  setMapOpen: (value: boolean) => void;
  setMapLoading: (value: boolean) => void;
  setMapError: (value: string | null) => void;
  setMapData: (value: ExpressionMapResponse | null) => void;
  setMapSourceExpression: (value: UserPhraseItemResponse | null) => void;
  setActiveClusterId: (value: string | null) => void;
  setMapOpeningForId: (value: string | null) => void;
  loadPhrases: (
    query: string,
    reviewFilter: PhraseReviewStatus | "all",
    contentFilter: "expression" | "sentence",
    expressionClusterFilterId: string,
    options?: { preferCache?: boolean },
  ) => Promise<void>;
  query: string;
  reviewFilter: PhraseReviewStatus | "all";
  contentFilter: "expression" | "sentence";
  expressionClusterFilterId: string;
  labels: {
    mapFailed: string;
    addClusterSuccess: string;
  };
  notifyExpressionMapOpened: () => void;
  notifyActionSucceeded: (message: string) => void;
  notifyLoadFailed: (message: string | null) => void;
};

const asReviewSessionExpressions = (rows: UserPhraseItemResponse[]) =>
  rows.map((row) => ({
    userPhraseId: row.userPhraseId,
    text: row.text,
    expressionClusterId: row.expressionClusterId,
  }));

const filterRowsByClusterExpressions = (
  rows: UserPhraseItemResponse[],
  cluster: ExpressionCluster,
  selected: UserPhraseItemResponse | null,
) => {
  const clusterTextSet = new Set(cluster.expressions.map((text) => normalizePhraseText(text)));
  const selectedClusterId = selected?.expressionClusterId ?? null;
  return rows.filter((row) => {
    if (selectedClusterId && row.expressionClusterId && row.expressionClusterId === selectedClusterId) {
      return true;
    }
    return clusterTextSet.has(normalizePhraseText(row.text));
  });
};

export function useChunksPageActions({
  stop,
  focusExpression,
  openFocusDetail,
  onCloseFocusDetail,
  setFocusRelationTab,
  router,
  phrases,
  activeCluster,
  mapSourceExpression,
  addingCluster,
  setAddingCluster,
  setMapOpen,
  setMapLoading,
  setMapError,
  setMapData,
  setMapSourceExpression,
  setActiveClusterId,
  setMapOpeningForId,
  loadPhrases,
  query,
  reviewFilter,
  contentFilter,
  expressionClusterFilterId,
  labels,
  notifyExpressionMapOpened,
  notifyActionSucceeded,
  notifyLoadFailed,
}: UseChunksPageActionsProps) {
  const handleDeleteFocusDetailSuccess = useCallback(
    async (result: DeleteFocusDetailResult, refreshedRows: UserPhraseItemResponse[]) => {
      stop();

      const nextState = resolveDeleteFocusDetailSuccessState({
        result,
        refreshedRows,
        focusExpression,
      });

      if (nextState.action === "open" && nextState.nextExpression) {
        setFocusRelationTab("similar");
        await openFocusDetail({
          text: nextState.nextExpression.text,
          kind: "current",
          chainMode: "reset",
        });
        return;
      }

      onCloseFocusDetail();
    },
    [focusExpression, onCloseFocusDetail, openFocusDetail, setFocusRelationTab, stop],
  );

  const openExpressionMap = useCallback(
    async (expression: UserPhraseItemResponse) => {
      if (expression.learningItemType === "sentence") return;
      setMapOpeningForId(expression.userPhraseId);
      setMapOpen(true);
      setMapLoading(true);
      setMapError(null);
      setMapData(null);
      setMapSourceExpression(expression);
      setActiveClusterId(null);
      try {
        const cache = await getChunksExpressionMapCache(
          expression.userPhraseId,
          expression.expressionClusterId,
        );
        if (cache.found && cache.record && !cache.isExpired) {
          setMapData(cache.record.data.map);
          setActiveClusterId(cache.record.data.map.clusters[0]?.id ?? null);
          notifyExpressionMapOpened();
          return;
        }

        const grouped = expression.expressionClusterId
          ? phrases.filter((row) => row.expressionClusterId === expression.expressionClusterId)
          : [expression];
        const baseExpressions = Array.from(
          new Set(grouped.map((row) => row.text).filter((text) => text.trim().length > 0)),
        ).slice(0, 12);

        const response = await generateExpressionMapFromApi({
          sourceSceneId: expression.sourceSceneSlug ?? `expression:${expression.userPhraseId}`,
          sourceSceneTitle: expression.sourceSceneSlug ?? undefined,
          baseExpressions: baseExpressions.length > 0 ? baseExpressions : [expression.text],
        });

        setMapData(response);
        setActiveClusterId(response.clusters[0]?.id ?? null);
        void setChunksExpressionMapCache({
          sourceUserPhraseId: expression.userPhraseId,
          expressionClusterId: expression.expressionClusterId,
          map: response,
        }).catch(() => {
          // Ignore cache failures.
        });
        notifyExpressionMapOpened();
      } catch (error) {
        setMapError(error instanceof Error ? error.message : labels.mapFailed);
      } finally {
        setMapOpeningForId(null);
        setMapLoading(false);
      }
    },
    [
      labels.mapFailed,
      notifyExpressionMapOpened,
      phrases,
      setActiveClusterId,
      setMapData,
      setMapError,
      setMapLoading,
      setMapOpen,
      setMapOpeningForId,
      setMapSourceExpression,
    ],
  );

  const handlePracticeCluster = useCallback(() => {
    if (!activeCluster) return;
    const selectedRows = filterRowsByClusterExpressions(phrases, activeCluster, mapSourceExpression);
    if (selectedRows.length > 0) {
      startReviewSession({
        router,
        source: "expression-map-cluster",
        expressions: asReviewSessionExpressions(selectedRows),
      });
      return;
    }
    if (mapSourceExpression) {
      startReviewSession({
        router,
        source: "expression-map-single",
        expressions: asReviewSessionExpressions([mapSourceExpression]),
      });
    }
  }, [activeCluster, mapSourceExpression, phrases, router]);

  const handleAddClusterToReview = useCallback(async () => {
    if (!activeCluster || !mapSourceExpression || addingCluster) return;
    setAddingCluster(true);
    try {
      const sourceSaveResult = mapSourceExpression.expressionClusterId
        ? null
        : await savePhraseFromApi({
            text: mapSourceExpression.text,
            expressionClusterId: `create-cluster:${activeCluster.id}`,
            sourceSceneSlug: mapSourceExpression.sourceSceneSlug ?? undefined,
            sourceSentenceText: mapSourceExpression.sourceSentenceText ?? undefined,
            sourceChunkText: mapSourceExpression.text,
            translation: mapSourceExpression.translation ?? undefined,
          });
      const clusterId =
        mapSourceExpression.expressionClusterId ?? sourceSaveResult?.expressionClusterId ?? null;
      if (!clusterId) {
        throw new Error("未能创建表达组。");
      }
      const existingNormalized = new Set(phrases.map((row) => normalizePhraseText(row.text)));
      const newTexts = Array.from(
        new Set(activeCluster.expressions.map((text) => text.trim()).filter(Boolean)),
      )
        .slice(0, 20)
        .filter((text) => !existingNormalized.has(normalizePhraseText(text)));

      if (newTexts.length > 0) {
        await savePhrasesBatchFromApi({
          items: newTexts.map((text) => ({
            text,
            sourceSceneSlug: mapSourceExpression.sourceSceneSlug ?? undefined,
            sourceSentenceText: mapSourceExpression.sourceSentenceText ?? undefined,
            sourceChunkText: text,
            expressionClusterId: clusterId,
          })),
        });
        await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
          preferCache: false,
        });
      }
      notifyActionSucceeded(labels.addClusterSuccess);
    } catch (error) {
      notifyLoadFailed(error instanceof Error ? error.message : null);
    } finally {
      setAddingCluster(false);
    }
  }, [
    activeCluster,
    addingCluster,
    contentFilter,
    expressionClusterFilterId,
    labels.addClusterSuccess,
    loadPhrases,
    mapSourceExpression,
    notifyActionSucceeded,
    notifyLoadFailed,
    phrases,
    query,
    reviewFilter,
    setAddingCluster,
  ]);

  return {
    handleDeleteFocusDetailSuccess,
    openExpressionMap,
    handlePracticeCluster,
    handleAddClusterToReview,
  };
}
