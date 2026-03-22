import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SavedRelationRowsBySourceId } from "@/features/chunks/components/types";
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
  getPhraseRelationsBatchFromApi: typeof getPhraseRelationsBatchFromApi;
  getPhraseRelationsFromApi: typeof getPhraseRelationsFromApi;
};

const defaultDeps: UseSavedRelationsDeps = {
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
  const [savedRelationCache, setSavedRelationCache] = useState<Record<string, SavedRelationCacheEntry>>({});
  const [savedRelationLoadingKey, setSavedRelationLoadingKey] = useState<string | null>(null);
  const [focusRelationsBootstrapDone, setFocusRelationsBootstrapDone] = useState(false);
  const pendingRelationRequestIdsRef = useRef<Set<string>>(new Set());
  const onLoadFailedRef = useRef(onLoadFailed);

  useEffect(() => {
    onLoadFailedRef.current = onLoadFailed;
  }, [onLoadFailed]);

  useEffect(() => {
    if (contentFilter !== "expression" || expressionRows.length === 0) return;
    const pendingIds = expressionRows
      .map((row) => row.userPhraseId)
      .filter(
        (userPhraseId) =>
          !savedRelationCache[userPhraseId]?.loaded &&
          !pendingRelationRequestIdsRef.current.has(userPhraseId),
      );
    if (pendingIds.length === 0) return;

    for (const userPhraseId of pendingIds) {
      pendingRelationRequestIdsRef.current.add(userPhraseId);
    }

    let cancelled = false;
    void deps
      .getPhraseRelationsBatchFromApi(pendingIds)
      .then((response) => {
        if (cancelled) return;
        const grouped = new Map<string, UserPhraseRelationItemResponse[]>();
        for (const row of response.rows) {
          const bucket = grouped.get(row.sourceUserPhraseId) ?? [];
          bucket.push(row);
          grouped.set(row.sourceUserPhraseId, bucket);
        }
        setSavedRelationCache((current) => {
          const next = { ...current };
          for (const userPhraseId of pendingIds) {
            next[userPhraseId] = {
              loaded: true,
              rows: grouped.get(userPhraseId) ?? [],
            };
          }
          return next;
        });
        setFocusRelationsBootstrapDone(true);
      })
      .catch((error) => {
        if (cancelled) return;
        onLoadFailedRef.current?.(error instanceof Error ? error.message : "加载表达关系失败。");
        setSavedRelationCache((current) => {
          const next = { ...current };
          for (const userPhraseId of pendingIds) {
            next[userPhraseId] = {
              loaded: true,
              rows: [],
            };
          }
          return next;
        });
        setFocusRelationsBootstrapDone(true);
      })
      .finally(() => {
        for (const userPhraseId of pendingIds) {
          pendingRelationRequestIdsRef.current.delete(userPhraseId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contentFilter, deps, expressionRows, savedRelationCache]);

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
    pendingRelationRequestIdsRef.current.add(userPhraseId);
    setSavedRelationLoadingKey(userPhraseId);

    void deps
      .getPhraseRelationsFromApi(userPhraseId)
      .then((response) => {
        if (cancelled) return;
        setSavedRelationCache((current) => ({
          ...current,
          [userPhraseId]: {
            loaded: true,
            rows: response.rows,
          },
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        onLoadFailedRef.current?.(error instanceof Error ? error.message : "加载表达关系失败。");
        setSavedRelationCache((current) => ({
          ...current,
          [userPhraseId]: {
            loaded: true,
            rows: [],
          },
        }));
      })
      .finally(() => {
        pendingRelationRequestIdsRef.current.delete(userPhraseId);
        if (cancelled) return;
        setSavedRelationLoadingKey((current) => (current === userPhraseId ? null : current));
      });

    return () => {
      cancelled = true;
    };
  }, [contentFilter, deps, expressionViewMode, focusDetailUserPhraseId, savedRelationCache]);

  const savedRelationRowsBySourceId: SavedRelationRowsBySourceId = useMemo(
    () => Object.fromEntries(Object.entries(savedRelationCache).map(([key, value]) => [key, value.rows])),
    [savedRelationCache],
  );

  const invalidateSavedRelations = useCallback((userPhraseIds: string[]) => {
    const uniqueIds = Array.from(new Set(userPhraseIds.map((item) => item.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) return;
    setSavedRelationCache((current) => {
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
