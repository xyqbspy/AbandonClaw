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
import { buildFocusAssistCandidatePayload } from "./chunks-save-contract";

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
  const [savingFocusCandidateKeys, setSavingFocusCandidateKeys] = useState<string[]>([]);
  const [completedFocusCandidateKeys, setCompletedFocusCandidateKeys] = useState<string[]>([]);

  const resetFocusAssist = useCallback(() => {
    setFocusAssistData(null);
    setCompletedFocusCandidateKeys([]);
  }, []);

  const loadFocusAssist = useCallback(
    async (item: UserPhraseItemResponse) => {
      if (item.learningItemType !== "expression") return;
      setFocusAssistLoading(true);
      setCompletedFocusCandidateKeys([]);
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
      if (!key) return;
      if (savingFocusCandidateKeys.includes(key) || completedFocusCandidateKeys.includes(key)) {
        return;
      }

      setSavingFocusCandidateKeys((current) => [...current, key]);
      try {
        const response = await deps.savePhraseFromApi(
          buildFocusAssistCandidatePayload({
            focusItem,
            candidate,
            kind,
          }),
        );
        await deps.enrichSimilarExpressionFromApi({
          userPhraseId: response.userPhrase.id,
          baseExpression: focusItem.text,
          differenceLabel: candidate.differenceLabel,
        });
        setCompletedFocusCandidateKeys((current) =>
          current.includes(key) ? current : [...current, key],
        );
        await onCandidateSaved?.({
          focusItem,
          savedUserPhraseId: response.userPhrase.id,
          candidate,
          kind,
        });
      } catch (error) {
        onLoadFailed?.(error instanceof Error ? error.message : "保存表达失败。");
      } finally {
        setSavingFocusCandidateKeys((current) => current.filter((item) => item !== key));
      }
    },
    [completedFocusCandidateKeys, deps, onCandidateSaved, onLoadFailed, savingFocusCandidateKeys],
  );

  return {
    focusAssistLoading,
    focusAssistData,
    setFocusAssistData,
    resetFocusAssist,
    loadFocusAssist,
    savingFocusCandidateKeys,
    completedFocusCandidateKeys,
    saveFocusCandidate,
  };
};
