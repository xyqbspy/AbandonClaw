import { useCallback, useEffect, useRef, useState } from "react";

import { getPhraseListCache, setPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { PhraseReviewStatus, UserPhraseItemResponse, getMyPhrasesFromApi } from "@/lib/utils/phrases-api";

import {
  buildChunksListRequestParams,
  resolveChunksCachePresentation,
  resolveChunksNetworkFailure,
} from "./chunks-page-load-logic";

type TimerHandle = number | ReturnType<typeof globalThis.setTimeout>;

type UseChunksListDataDeps = {
  getPhraseListCache: typeof getPhraseListCache;
  setPhraseListCache: typeof setPhraseListCache;
  getMyPhrasesFromApi: typeof getMyPhrasesFromApi;
  buildChunksListRequestParams: typeof buildChunksListRequestParams;
  resolveChunksCachePresentation: typeof resolveChunksCachePresentation;
  resolveChunksNetworkFailure: typeof resolveChunksNetworkFailure;
  setTimeoutFn: (callback: () => void, delay: number) => TimerHandle;
  clearTimeoutFn: (handle: TimerHandle) => void;
};

const defaultDeps: UseChunksListDataDeps = {
  getPhraseListCache,
  setPhraseListCache,
  getMyPhrasesFromApi,
  buildChunksListRequestParams,
  resolveChunksCachePresentation,
  resolveChunksNetworkFailure,
  setTimeoutFn: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeoutFn: (handle) => window.clearTimeout(handle),
};

export const useChunksListData = ({
  query,
  reviewFilter,
  contentFilter,
  expressionClusterFilterId,
  onLoadFailed,
  deps = defaultDeps,
}: {
  query: string;
  reviewFilter: PhraseReviewStatus | "all";
  contentFilter: "expression" | "sentence";
  expressionClusterFilterId: string;
  onLoadFailed?: (message: string) => void;
  deps?: UseChunksListDataDeps;
}) => {
  const [loading, setLoading] = useState(true);
  const [phrases, setPhrases] = useState<UserPhraseItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [listDataSource, setListDataSource] = useState<"none" | "cache" | "network">("none");
  const activeLoadTokenRef = useRef(0);
  const onLoadFailedRef = useRef(onLoadFailed);

  useEffect(() => {
    onLoadFailedRef.current = onLoadFailed;
  }, [onLoadFailed]);

  const loadPhrases = useCallback(
    async (
      nextQuery: string,
      nextFilter: PhraseReviewStatus | "all",
      nextContentFilter: "expression" | "sentence",
      nextExpressionClusterFilterId: string,
      options?: { preferCache?: boolean },
    ) => {
      const token = activeLoadTokenRef.current + 1;
      activeLoadTokenRef.current = token;
      const preferCache = options?.preferCache ?? false;
      if (!preferCache) setListDataSource("none");
      setLoading(true);

      let hasCacheFallback = false;
      const canApply = () => activeLoadTokenRef.current === token;
      const requestParams = deps.buildChunksListRequestParams({
        query: nextQuery,
        reviewFilter: nextFilter,
        contentFilter: nextContentFilter,
        expressionClusterFilterId: nextExpressionClusterFilterId,
      });

      if (preferCache) {
        try {
          const cache = await deps.getPhraseListCache(requestParams);
          if (canApply()) {
            const presentation = deps.resolveChunksCachePresentation({
              cacheFound: cache.found && Boolean(cache.record),
            });
            hasCacheFallback = presentation.hasCacheFallback;
            if (presentation.hasCacheFallback && cache.record) {
              setPhrases(cache.record.data.rows);
              setTotal(cache.record.data.total);
              setListDataSource(presentation.nextDataSource);
              if (presentation.shouldStopLoading) {
                setLoading(false);
              }
            }
          }
        } catch {
          // Ignore cache failure.
        }
      }

      try {
        const result = await deps.getMyPhrasesFromApi(requestParams);
        if (!canApply()) return;
        setPhrases(result.rows);
        setTotal(result.total);
        setListDataSource("network");
        setLoading(false);
        void deps.setPhraseListCache(requestParams, result).catch(() => {
          // Non-blocking.
        });
      } catch (error) {
        if (!canApply()) return;
        const failure = deps.resolveChunksNetworkFailure({
          hasCacheFallback,
          error,
        });
        if (failure.shouldClearRows) {
          setPhrases([]);
          setTotal(0);
        }
        if (failure.shouldStopLoading) {
          setLoading(false);
        }
        if (failure.message) {
          onLoadFailedRef.current?.(failure.message);
        }
      }
    },
    [deps],
  );

  useEffect(() => {
    const timer = deps.setTimeoutFn(() => {
      void loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: true,
      });
    }, 180);
    return () => deps.clearTimeoutFn(timer);
  }, [contentFilter, deps, expressionClusterFilterId, loadPhrases, query, reviewFilter]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[expression-library][cache-debug]", {
      source: listDataSource,
      count: phrases.length,
      filter: reviewFilter,
      contentFilter,
      expressionClusterFilterId,
    });
  }, [contentFilter, expressionClusterFilterId, listDataSource, phrases.length, reviewFilter]);

  return {
    loading,
    phrases,
    setPhrases,
    total,
    listDataSource,
    loadPhrases,
  };
};
