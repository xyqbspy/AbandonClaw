import { useCallback, useState } from "react";
import {
  savePhraseFromApi,
  type BuiltinPhraseItemResponse,
  type PhraseReviewStatus,
} from "@/lib/utils/phrases-api";

import {
  notifyChunksActionSucceeded,
  notifyChunksLoadFailed,
} from "./chunks-page-notify";

type SetBuiltinPhrases = React.Dispatch<React.SetStateAction<BuiltinPhraseItemResponse[]>>;

type UseBuiltinPhrasesActionsArgs = {
  setBuiltinPhrases: SetBuiltinPhrases;
  loadPhrases: (
    query: string,
    reviewFilter: PhraseReviewStatus | "all",
    contentFilter: "expression" | "sentence",
    expressionClusterFilterId: string,
    options?: { preferCache?: boolean },
  ) => Promise<unknown> | unknown;
  query: string;
  reviewFilter: PhraseReviewStatus | "all";
  contentFilter: "expression" | "sentence";
  expressionClusterFilterId: string;
};

export type UseBuiltinPhrasesActionsReturn = {
  savingPhraseId: string | null;
  save: (phrase: {
    id: string;
    text: string;
    translation: string | null;
    usageNote: string | null;
    level: string | null;
    category: string | null;
    tags: string[];
    sourceScene: { slug: string; title: string } | null;
  }) => Promise<void>;
};

export function useBuiltinPhrasesActions({
  setBuiltinPhrases,
  loadPhrases,
  query,
  reviewFilter,
  contentFilter,
  expressionClusterFilterId,
}: UseBuiltinPhrasesActionsArgs): UseBuiltinPhrasesActionsReturn {
  const [savingPhraseId, setSavingPhraseId] = useState<string | null>(null);

  const save = useCallback<UseBuiltinPhrasesActionsReturn["save"]>(
    async (phrase) => {
      setSavingPhraseId(phrase.id);
      try {
        await savePhraseFromApi({
          text: phrase.text,
          translation: phrase.translation ?? undefined,
          usageNote: phrase.usageNote ?? undefined,
          difficulty: phrase.level ?? undefined,
          tags: Array.from(
            new Set([
              ...phrase.tags,
              "builtin",
              "core_phrase",
              ...(phrase.category ? [phrase.category] : []),
            ]),
          ),
          sourceSceneSlug: phrase.sourceScene?.slug ?? undefined,
          sourceType: phrase.sourceScene?.slug ? "scene" : "manual",
          sourceChunkText: phrase.text,
        });

        setBuiltinPhrases((current) =>
          current.map((item) =>
            item.id === phrase.id ? { ...item, isSaved: true } : item,
          ),
        );
        notifyChunksActionSucceeded("已加入“我的表达”，并进入后续复习。");
        await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
          preferCache: false,
        });
      } catch (error) {
        notifyChunksLoadFailed(error instanceof Error ? error.message : "保存必备表达失败。");
      } finally {
        setSavingPhraseId(null);
      }
    },
    [
      contentFilter,
      expressionClusterFilterId,
      loadPhrases,
      query,
      reviewFilter,
      setBuiltinPhrases,
    ],
  );

  return { savingPhraseId, save };
}
