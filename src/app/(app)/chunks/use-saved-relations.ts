import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SavedRelationRowsBySourceId } from "@/features/chunks/components/types";
import {
  getPhraseRelationsCache,
  setPhraseRelationsCache,
} from "@/lib/cache/chunks-runtime-cache";
import {
  getPhraseRelationsBatchFromApi,
  getPhraseRelationsFromApi,
  UserPhraseItemResponse,
  UserPhraseRelationItemResponse,
} from "@/lib/utils/phrases-api";

export type SavedRelationCacheEntry = {
  loaded: boolean;
  rows: UserPhraseRelationItemResponse[];
};

type UseSavedRelationsDeps = {
  getPhraseRelationsCache: typeof getPhraseRelationsCache;
  setPhraseRelationsCache: typeof setPhraseRelationsCache;
  getPhraseRelationsBatchFromApi: typeof getPhraseRelationsBatchFromApi;
  getPhraseRelationsFromApi: typeof getPhraseRelationsFromApi;
};

const defaultDeps: UseSavedRelationsDeps = {
  getPhraseRelationsCache,
  setPhraseRelationsCache,
  getPhraseRelationsBatchFromApi,
  getPhraseRelationsFromApi,
};

export const useSavedRelations = ({
  contentFilter,
  expressionViewMode,
  expressionRows,
  focusDetailUserPhraseId,
  onLoadFailed,
  deps = defaultDeps,
}: {
  contentFilter: "expression" | "sentence";
  expressionViewMode: "list" | "focus";
  expressionRows: UserPhraseItemResponse[];
  focusDetailUserPhraseId: string | null;
  onLoadFailed?: (message: string) => void;
  deps?: UseSavedRelationsDeps;
}) => {
  const [savedRelationCache, setSavedRelationCacheState] = useState<
    Record<string, SavedRelationCacheEntry>
  >({});
  const [savedRelationLoadingKey, setSavedRelationLoadingKey] = useState<string | null>(null);
  const [focusRelationsBootstrapDone, setFocusRelationsBootstrapDone] = useState(false);
  const pendingRelationRequestIdsRef = useRef<Set<string>>(new Set());
  const onLoadFailedRef = useRef(onLoadFailed);

  useEffect(() => {
    onLoadFailedRef.current = onLoadFailed;
  }, [onLoadFailed]);

  const applyLoadedRelations = useCallback(
    (entries: Array<{ userPhraseId: string; rows: UserPhraseRelationItemResponse[] }>) => {
      if (entries.length === 0) return;
      setSavedRelationCacheState((current) => {
        const next = { ...current };
        for (const entry of entries) {
          next[entry.userPhraseId] = {
            loaded: true,
            rows: entry.rows,
          };
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (contentFilter !== "expression" || expressionRows.length === 0) return;
    let cancelled = false;

    void (async () => {
      const candidateIds = expressionRows
        .map((row) => row.userPhraseId)
        .filter(
          (userPhraseId) =>
            !savedRelationCache[userPhraseId]?.loaded &&
            !pendingRelationRequestIdsRef.current.has(userPhraseId),
        );
      if (candidateIds.length === 0) return;

      const cacheResults = await Promise.all(
        candidateIds.map(async (userPhraseId) => ({
          userPhraseId,
          cache: await deps.getPhraseRelationsCache(userPhraseId),
        })),
      );
      if (cancelled) return;

      applyLoadedRelations(
        cacheResults
          .filter((item) => item.cache.found && item.cache.record && !item.cache.isExpired)
          .map((item) => ({
            userPhraseId: item.userPhraseId,
            rows: item.cache.record?.data.rows ?? [],
          })),
      );

      const pendingIds = cacheResults
        .filter((item) => !item.cache.found || item.cache.isExpired || !item.cache.record)
        .map((item) => item.userPhraseId);
      if (pendingIds.length === 0) {
        setFocusRelationsBootstrapDone(true);
        return;
      }

      for (const userPhraseId of pendingIds) {
        pendingRelationRequestIdsRef.current.add(userPhraseId);
      }

      try {
        const response = await deps.getPhraseRelationsBatchFromApi(pendingIds);
        if (cancelled) return;
        const grouped = new Map<string, UserPhraseRelationItemResponse[]>();
        for (const row of response.rows) {
          const bucket = grouped.get(row.sourceUserPhraseId) ?? [];
          bucket.push(row);
          grouped.set(row.sourceUserPhraseId, bucket);
        }
        const loadedEntries = pendingIds.map((userPhraseId) => ({
          userPhraseId,
          rows: grouped.get(userPhraseId) ?? [],
        }));
        applyLoadedRelations(loadedEntries);
        for (const entry of loadedEntries) {
          void deps.setPhraseRelationsCache(entry.userPhraseId, entry.rows).catch(() => {
            // Ignore cache failures.
          });
        }
        setFocusRelationsBootstrapDone(true);
      } catch (error) {
        if (cancelled) return;
        onLoadFailedRef.current?.(
          error instanceof Error ? error.message : "加载表达关系失败。",
        );
        applyLoadedRelations(
          pendingIds.map((userPhraseId) => ({
            userPhraseId,
            rows: [],
          })),
        );
        setFocusRelationsBootstrapDone(true);
      } finally {
        for (const userPhraseId of pendingIds) {
          pendingRelationRequestIdsRef.current.delete(userPhraseId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyLoadedRelations, contentFilter, deps, expressionRows, savedRelationCache]);

  useEffect(() => {
    if (contentFilter !== "expression") {
      setFocusRelationsBootstrapDone(false);
      return;
    }
    if (expressionRows.length === 0) {
      setFocusRelationsBootstrapDone(true);
      return;
    }
    const hasPending = expressionRows.some(
      (row) =>
        !savedRelationCache[row.userPhraseId]?.loaded ||
        pendingRelationRequestIdsRef.current.has(row.userPhraseId),
    );
    if (!hasPending) {
      setFocusRelationsBootstrapDone(true);
    }
  }, [contentFilter, expressionRows, savedRelationCache]);

  useEffect(() => {
    const userPhraseId = focusDetailUserPhraseId ?? "";
    if (!userPhraseId) return;
    if (savedRelationCache[userPhraseId]?.loaded) return;
    if (pendingRelationRequestIdsRef.current.has(userPhraseId)) return;
    if (contentFilter === "expression" && expressionViewMode === "focus") {
      return;
    }

    let cancelled = false;
    void (async () => {
      const cache = await deps.getPhraseRelationsCache(userPhraseId);
      if (cancelled) return;
      if (cache.found && cache.record && !cache.isExpired) {
        applyLoadedRelations([
          {
            userPhraseId,
            rows: cache.record.data.rows,
          },
        ]);
        return;
      }

      pendingRelationRequestIdsRef.current.add(userPhraseId);
      setSavedRelationLoadingKey(userPhraseId);

      try {
        const response = await deps.getPhraseRelationsFromApi(userPhraseId);
        if (cancelled) return;
        applyLoadedRelations([
          {
            userPhraseId,
            rows: response.rows,
          },
        ]);
        void deps.setPhraseRelationsCache(userPhraseId, response.rows).catch(() => {
          // Ignore cache failures.
        });
      } catch (error) {
        if (cancelled) return;
        onLoadFailedRef.current?.(
          error instanceof Error ? error.message : "加载表达关系失败。",
        );
        applyLoadedRelations([
          {
            userPhraseId,
            rows: [],
          },
        ]);
      } finally {
        pendingRelationRequestIdsRef.current.delete(userPhraseId);
        if (cancelled) return;
        setSavedRelationLoadingKey((current) => (current === userPhraseId ? null : current));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    applyLoadedRelations,
    contentFilter,
    deps,
    expressionViewMode,
    focusDetailUserPhraseId,
    savedRelationCache,
  ]);

  const savedRelationRowsBySourceId: SavedRelationRowsBySourceId = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(savedRelationCache).map(([key, value]) => [key, value.rows]),
      ),
    [savedRelationCache],
  );

  const invalidateSavedRelations = useCallback((userPhraseIds: string[]) => {
    const uniqueIds = Array.from(new Set(userPhraseIds.map((item) => item.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) return;
    setSavedRelationCacheState((current) => {
      const next = { ...current };
      for (const userPhraseId of uniqueIds) {
        delete next[userPhraseId];
      }
      return next;
    });
  }, []);

  return {
    savedRelationCache,
    savedRelationRowsBySourceId,
    savedRelationLoadingKey,
    focusRelationsBootstrapDone,
    invalidateSavedRelations,
  };
};
