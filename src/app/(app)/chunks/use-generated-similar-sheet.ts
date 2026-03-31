import { useCallback, useMemo, useState } from "react";

import {
  getGeneratedSimilarCache,
  setGeneratedSimilarCache,
} from "@/lib/cache/chunks-runtime-cache";
import { normalizePhraseText } from "@/lib/shared/phrases";
import {
  enrichSimilarExpressionsBatchFromApi,
  generateSimilarExpressionsFromApi,
  savePhrasesBatchFromApi,
  savePhraseFromApi,
  SimilarExpressionCandidateResponse,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import {
  buildGeneratedSimilarBasePayload,
  buildGeneratedSimilarCandidatePayload,
} from "./chunks-save-contract";

type UseGeneratedSimilarSheetDeps = {
  getGeneratedSimilarCache: typeof getGeneratedSimilarCache;
  setGeneratedSimilarCache: typeof setGeneratedSimilarCache;
  generateSimilarExpressionsFromApi: typeof generateSimilarExpressionsFromApi;
  savePhraseFromApi: typeof savePhraseFromApi;
  savePhrasesBatchFromApi: typeof savePhrasesBatchFromApi;
  enrichSimilarExpressionsBatchFromApi: typeof enrichSimilarExpressionsBatchFromApi;
  setTimeoutFn: (
    callback: () => void,
    delay: number,
  ) => number | ReturnType<typeof globalThis.setTimeout>;
};

const defaultDeps: UseGeneratedSimilarSheetDeps = {
  getGeneratedSimilarCache,
  setGeneratedSimilarCache,
  generateSimilarExpressionsFromApi,
  savePhraseFromApi,
  savePhrasesBatchFromApi,
  enrichSimilarExpressionsBatchFromApi,
  setTimeoutFn: (callback, delay) => window.setTimeout(callback, delay),
};

export const useGeneratedSimilarSheet = ({
  expressionRows,
  normalizeSimilarLabel,
  onLoadCluster,
  onApplyClusterFilter,
  onSelectAtLeastOne,
  onSuccess,
  onError,
  deps = defaultDeps,
}: {
  expressionRows: UserPhraseItemResponse[];
  normalizeSimilarLabel: (label: string | null | undefined) => string;
  onLoadCluster: (clusterId: string) => Promise<void>;
  onApplyClusterFilter: (clusterId: string, sourceExpressionText?: string) => void;
  onSelectAtLeastOne?: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  deps?: UseGeneratedSimilarSheetDeps;
}) => {
  const [similarSheetOpen, setSimilarSheetOpen] = useState(false);
  const [similarSeedExpression, setSimilarSeedExpression] =
    useState<UserPhraseItemResponse | null>(null);
  const [generatingSimilarForId, setGeneratingSimilarForId] = useState<string | null>(null);
  const [generatedSimilarCandidates, setGeneratedSimilarCandidates] = useState<
    SimilarExpressionCandidateResponse[]
  >([]);
  const [selectedSimilarMap, setSelectedSimilarMap] = useState<Record<string, boolean>>({});
  const [savingSelectedSimilar, setSavingSelectedSimilar] = useState(false);

  const resetGeneratedSimilarSheet = useCallback(() => {
    setGeneratedSimilarCandidates([]);
    setSelectedSimilarMap({});
    setSimilarSeedExpression(null);
  }, []);

  const openGenerateSimilarSheet = useCallback(
    async (item: UserPhraseItemResponse) => {
      if (item.learningItemType !== "expression") return;
      if (generatingSimilarForId === item.userPhraseId) return;
      setGeneratingSimilarForId(item.userPhraseId);
      setSimilarSeedExpression(item);
      setGeneratedSimilarCandidates([]);
      setSelectedSimilarMap({});
      setSimilarSheetOpen(true);
      try {
        const cache = await deps.getGeneratedSimilarCache(item.userPhraseId);
        if (cache.found && cache.record && !cache.isExpired) {
          setGeneratedSimilarCandidates(cache.record.data.candidates);
          return;
        }
        const response = await deps.generateSimilarExpressionsFromApi({
          baseExpression: item.text,
          existingExpressions: expressionRows.map((row) => row.text),
        });
        setGeneratedSimilarCandidates(response.candidates);
        void deps.setGeneratedSimilarCache(item.userPhraseId, response.candidates).catch(() => {
          // Ignore cache failures.
        });
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "加载失败");
      } finally {
        setGeneratingSimilarForId(null);
      }
    },
    [deps, expressionRows, generatingSimilarForId, onError],
  );

  const toggleCandidateSelected = useCallback((candidateText: string) => {
    const key = normalizePhraseText(candidateText);
    if (!key) return;
    setSelectedSimilarMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectedSimilarCandidates = useMemo(
    () =>
      generatedSimilarCandidates.filter((candidate) =>
        Boolean(selectedSimilarMap[normalizePhraseText(candidate.text)]),
      ),
    [generatedSimilarCandidates, selectedSimilarMap],
  );

  const saveSelectedSimilarCandidates = useCallback(async () => {
    if (!similarSeedExpression || savingSelectedSimilar) return;
    if (selectedSimilarCandidates.length === 0) {
      onSelectAtLeastOne?.();
      return;
    }
    setSavingSelectedSimilar(true);
    try {
      const baseSaveResult = await deps.savePhraseFromApi(
        buildGeneratedSimilarBasePayload({
          seedExpression: similarSeedExpression,
        }),
      );
      const clusterId = baseSaveResult.expressionClusterId;
      if (!clusterId) {
        throw new Error("未能为主表达创建同类表达组。");
      }

      const batchResult = await deps.savePhrasesBatchFromApi({
        items: selectedSimilarCandidates.map((candidate) =>
          buildGeneratedSimilarCandidatePayload({
            candidate,
            seedExpression: similarSeedExpression,
            clusterId,
          }),
        ),
      });
      const savedResponses = batchResult.items;

      void deps
        .enrichSimilarExpressionsBatchFromApi({
          items: savedResponses.map((response, index) => {
            const candidate = selectedSimilarCandidates[index];
            return {
              userPhraseId: response.userPhrase.id,
              baseExpression: similarSeedExpression.text,
              differenceLabel: normalizeSimilarLabel(candidate?.differenceLabel),
            };
          }),
        })
        .finally(() => {
          deps.setTimeoutFn(() => {
            void onLoadCluster(clusterId);
          }, 600);
        });

      await onLoadCluster(clusterId);
      onApplyClusterFilter(clusterId, similarSeedExpression.text);
      setSimilarSheetOpen(false);
      onSuccess?.("saved");
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "加载失败");
    } finally {
      setSavingSelectedSimilar(false);
    }
  }, [
    deps,
    normalizeSimilarLabel,
    onApplyClusterFilter,
    onError,
    onLoadCluster,
    onSelectAtLeastOne,
    onSuccess,
    savingSelectedSimilar,
    selectedSimilarCandidates,
    similarSeedExpression,
  ]);

  return {
    similarSheetOpen,
    setSimilarSheetOpen,
    similarSeedExpression,
    generatingSimilarForId,
    generatedSimilarCandidates,
    selectedSimilarMap,
    savingSelectedSimilar,
    openGenerateSimilarSheet,
    toggleCandidateSelected,
    saveSelectedSimilarCandidates,
    resetGeneratedSimilarSheet,
  };
};
