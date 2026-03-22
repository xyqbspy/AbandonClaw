import { useCallback, useState } from "react";

import { normalizePhraseText } from "@/lib/shared/phrases";
import {
  enrichSimilarExpressionFromApi,
  generateManualExpressionAssistFromApi,
  ManualExpressionAssistResponse,
  savePhraseFromApi,
  SimilarExpressionCandidateResponse,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";

type UseFocusAssistDeps = {
  generateManualExpressionAssistFromApi: typeof generateManualExpressionAssistFromApi;
  savePhraseFromApi: typeof savePhraseFromApi;
  enrichSimilarExpressionFromApi: typeof enrichSimilarExpressionFromApi;
};

const defaultDeps: UseFocusAssistDeps = {
  generateManualExpressionAssistFromApi,
  savePhraseFromApi,
  enrichSimilarExpressionFromApi,
};

export const useFocusAssist = ({
  expressionRows,
  onLoadFailed,
  onCandidateSaved,
  deps = defaultDeps,
}: {
  expressionRows: UserPhraseItemResponse[];
  onLoadFailed?: (message: string) => void;
  onCandidateSaved?: (payload: {
    focusItem: UserPhraseItemResponse;
    savedUserPhraseId: string;
    candidate: SimilarExpressionCandidateResponse;
    kind: "similar" | "contrast";
  }) => Promise<void> | void;
  deps?: UseFocusAssistDeps;
}) => {
  const [focusAssistLoading, setFocusAssistLoading] = useState(false);
  const [focusAssistData, setFocusAssistData] =
    useState<ManualExpressionAssistResponse | null>(null);
  const [savingFocusCandidateKey, setSavingFocusCandidateKey] = useState<string | null>(null);

  const resetFocusAssist = useCallback(() => {
    setFocusAssistData(null);
  }, []);

  const loadFocusAssist = useCallback(
    async (item: UserPhraseItemResponse) => {
      if (item.learningItemType !== "expression") return;
      setFocusAssistLoading(true);
      try {
        const response = await deps.generateManualExpressionAssistFromApi({
          text: item.text,
          existingExpressions: expressionRows.map((row) => row.text),
        });
        setFocusAssistData(response);
      } catch (error) {
        setFocusAssistData(null);
        onLoadFailed?.(error instanceof Error ? error.message : "加载表达失败。");
      } finally {
        setFocusAssistLoading(false);
      }
    },
    [deps, expressionRows, onLoadFailed],
  );

  const saveFocusCandidate = useCallback(
    async (
      focusItem: UserPhraseItemResponse,
      candidate: SimilarExpressionCandidateResponse,
      kind: "similar" | "contrast",
    ) => {
      const key = `${kind}:${normalizePhraseText(candidate.text)}`;
      if (savingFocusCandidateKey === key) return;
      setSavingFocusCandidateKey(key);
      try {
        const response = await deps.savePhraseFromApi({
          text: candidate.text,
          learningItemType: "expression",
          sourceType: "manual",
          sourceNote: kind === "similar" ? "focus-similar-ai" : "focus-contrast-ai",
          sourceSentenceText: focusItem.sourceSentenceText ?? undefined,
          sourceChunkText: candidate.text,
          expressionClusterId:
            kind === "similar" ? focusItem.expressionClusterId ?? undefined : undefined,
          relationSourceUserPhraseId: focusItem.userPhraseId,
          relationType: kind,
        });
        await deps.enrichSimilarExpressionFromApi({
          userPhraseId: response.userPhrase.id,
          baseExpression: focusItem.text,
          differenceLabel: candidate.differenceLabel,
        });
        await onCandidateSaved?.({
          focusItem,
          savedUserPhraseId: response.userPhrase.id,
          candidate,
          kind,
        });
      } catch (error) {
        onLoadFailed?.(error instanceof Error ? error.message : "加载表达失败。");
      } finally {
        setSavingFocusCandidateKey(null);
      }
    },
    [deps, onCandidateSaved, onLoadFailed, savingFocusCandidateKey],
  );

  return {
    focusAssistLoading,
    focusAssistData,
    setFocusAssistData,
    resetFocusAssist,
    loadFocusAssist,
    savingFocusCandidateKey,
    saveFocusCandidate,
  };
};
