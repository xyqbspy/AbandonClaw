"use client";

import { useCallback, useState } from "react";
import {
  savePhraseFromApi,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import { normalizePhraseText } from "@/lib/shared/phrases";

export type UseSentenceExpressionSaveParams = {
  savePhrase?: typeof savePhraseFromApi;
  notifySaved: () => void;
  notifyFailed: (message: string | null) => void;
};

export type UseSentenceExpressionSaveResult = {
  savingSentenceExpressionKey: string | null;
  savedSentenceExpressionKeys: Record<string, boolean>;
  saveExpressionFromSentence: (
    item: UserPhraseItemResponse,
    expression: string,
  ) => Promise<void>;
};

export function useSentenceExpressionSave(
  params: UseSentenceExpressionSaveParams,
): UseSentenceExpressionSaveResult {
  const { savePhrase = savePhraseFromApi, notifySaved, notifyFailed } = params;
  const [savingSentenceExpressionKey, setSavingSentenceExpressionKey] =
    useState<string | null>(null);
  const [savedSentenceExpressionKeys, setSavedSentenceExpressionKeys] =
    useState<Record<string, boolean>>({});

  const saveExpressionFromSentence = useCallback(
    async (item: UserPhraseItemResponse, expression: string) => {
      const normalized = normalizePhraseText(expression);
      if (!normalized) return;
      const key = `${item.userPhraseId}:${normalized}`;
      if (savingSentenceExpressionKey === key) return;
      setSavingSentenceExpressionKey(key);
      try {
        await savePhrase({
          text: expression,
          learningItemType: "expression",
          sourceType: "manual",
          sourceSentenceText: item.text,
          sourceChunkText: expression,
          translation: item.translation ?? undefined,
        });
        setSavedSentenceExpressionKeys((prev) => ({ ...prev, [key]: true }));
        notifySaved();
      } catch (error) {
        notifyFailed(error instanceof Error ? error.message : null);
      } finally {
        setSavingSentenceExpressionKey(null);
      }
    },
    [savingSentenceExpressionKey, savePhrase, notifySaved, notifyFailed],
  );

  return {
    savingSentenceExpressionKey,
    savedSentenceExpressionKeys,
    saveExpressionFromSentence,
  };
}
