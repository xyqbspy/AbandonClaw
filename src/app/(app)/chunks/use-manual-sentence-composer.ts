import { useCallback, useState } from "react";

import {
  generateManualSentenceAssistFromApi,
  savePhraseFromApi,
} from "@/lib/utils/phrases-api";

type UseManualSentenceComposerDeps = {
  generateManualSentenceAssistFromApi: typeof generateManualSentenceAssistFromApi;
  savePhraseFromApi: typeof savePhraseFromApi;
};

const defaultDeps: UseManualSentenceComposerDeps = {
  generateManualSentenceAssistFromApi,
  savePhraseFromApi,
};

export const useManualSentenceComposer = ({
  onError,
  deps = defaultDeps,
}: {
  onError?: (message: string) => void;
  deps?: UseManualSentenceComposerDeps;
}) => {
  const [savingManualSentence, setSavingManualSentence] = useState(false);

  const saveManualSentence = useCallback(
    async (sentenceText: string) => {
      const trimmed = sentenceText.trim();
      if (!trimmed || savingManualSentence) return null;

      setSavingManualSentence(true);
      try {
        const assist = await deps.generateManualSentenceAssistFromApi({ text: trimmed });
        const response = await deps.savePhraseFromApi({
          learningItemType: "sentence",
          sentenceText: trimmed,
          translation: assist.sentenceItem.translation || undefined,
          usageNote: assist.sentenceItem.usageNote || undefined,
          sourceType: "manual",
          sourceSentenceText: trimmed,
          sourceChunkText: assist.sentenceItem.extractedExpressions.join(" | ") || undefined,
        });

        return {
          reviewSessionExpressions: [
            {
              userPhraseId: response.userPhrase.id,
              text: trimmed,
            },
          ],
        };
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "加载失败");
        return null;
      } finally {
        setSavingManualSentence(false);
      }
    },
    [deps, onError, savingManualSentence],
  );

  return {
    savingManualSentence,
    saveManualSentence,
  };
};
