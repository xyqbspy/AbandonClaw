import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearExpiredSceneCaches,
  getSceneCache,
  getSceneCacheSnapshotSync,
  listRecentSceneCacheKeys,
  normalizeSceneSlug,
  setSceneCache,
} from "@/lib/cache/scene-cache";
import {
  getSceneSavedPhraseTextsCache,
  setSceneSavedPhraseTextsCache,
} from "@/lib/cache/scene-runtime-cache";
import { getPrefetchDebugState, scheduleScenePrefetch } from "@/lib/cache/scene-prefetch";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { SceneGeneratedState } from "@/lib/types/learning-flow";
import { Lesson } from "@/lib/types";
import { getSceneGeneratedState, saveVariantSet } from "@/lib/utils/scene-learning-flow-storage";
import { getSavedNormalizedPhraseTextsFromApi } from "@/lib/utils/phrases-api";
import { getSceneDetailBySlugFromApi, getScenesFromApi } from "@/lib/utils/scenes-api";

import {
  collectLessonChunkTexts,
  extractSlugFromSceneCacheKey,
} from "./scene-detail-logic";
import { loadSceneDetail } from "./scene-detail-load-orchestrator";
import { syncSceneVariantsFromDb } from "./scene-detail-generation-logic";

export type UseSceneDetailDataDeps = {
  clearExpiredSceneCaches: typeof clearExpiredSceneCaches;
  getSceneCache: typeof getSceneCache;
  getSceneCacheSnapshotSync: typeof getSceneCacheSnapshotSync;
  getSceneDetailBySlugFromApi: typeof getSceneDetailBySlugFromApi;
  setSceneCache: typeof setSceneCache;
  getScenesFromApi: typeof getScenesFromApi;
  listRecentSceneCacheKeys: typeof listRecentSceneCacheKeys;
  scheduleScenePrefetch: typeof scheduleScenePrefetch;
  extractSlugFromSceneCacheKey: typeof extractSlugFromSceneCacheKey;
  getPrefetchDebugState: typeof getPrefetchDebugState;
  loadSceneDetail: typeof loadSceneDetail;
  getSceneSavedPhraseTextsCache: typeof getSceneSavedPhraseTextsCache;
  setSceneSavedPhraseTextsCache: typeof setSceneSavedPhraseTextsCache;
  getSavedNormalizedPhraseTextsFromApi: typeof getSavedNormalizedPhraseTextsFromApi;
  collectLessonChunkTexts: typeof collectLessonChunkTexts;
  normalizePhraseText: typeof normalizePhraseText;
  getSceneGeneratedState: typeof getSceneGeneratedState;
  syncSceneVariantsFromDb: typeof syncSceneVariantsFromDb;
  saveVariantSet: typeof saveVariantSet;
};

export type UseSceneDetailDataOptions = {
  initialLesson?: Lesson | null;
  deps?: UseSceneDetailDataDeps;
};

const defaultDeps: UseSceneDetailDataDeps = {
  clearExpiredSceneCaches,
  getSceneCache,
  getSceneCacheSnapshotSync,
  getSceneDetailBySlugFromApi,
  setSceneCache,
  getScenesFromApi,
  listRecentSceneCacheKeys,
  scheduleScenePrefetch,
  extractSlugFromSceneCacheKey,
  getPrefetchDebugState,
  loadSceneDetail,
  getSceneSavedPhraseTextsCache,
  setSceneSavedPhraseTextsCache,
  getSavedNormalizedPhraseTextsFromApi,
  collectLessonChunkTexts,
  normalizePhraseText,
  getSceneGeneratedState,
  syncSceneVariantsFromDb,
  saveVariantSet,
};

export const useSceneDetailData = (
  sceneSlug: string,
  depsOrOptions: UseSceneDetailDataDeps | UseSceneDetailDataOptions = defaultDeps,
) => {
  const options =
    "clearExpiredSceneCaches" in depsOrOptions
      ? { deps: depsOrOptions, initialLesson: null }
      : depsOrOptions;
  const deps = options.deps ?? defaultDeps;
  const initialLesson = options.initialLesson ?? null;
  const initialSnapshot =
    initialLesson || !sceneSlug ? null : deps.getSceneCacheSnapshotSync(sceneSlug);
  const initialHydratedLesson =
    initialLesson ?? (initialSnapshot?.found ? initialSnapshot.record?.data ?? null : null);
  const initialDataSource: "none" | "cache" | "network" = initialLesson
    ? "network"
    : initialSnapshot?.found
      ? "cache"
      : "none";
  const initialLoading = !(initialLesson || (initialSnapshot?.found && !initialSnapshot.isExpired));

  const [baseLesson, setBaseLesson] = useState<Lesson | null>(initialHydratedLesson);
  const [sceneDataSource, setSceneDataSource] = useState<"none" | "cache" | "network">(
    initialDataSource,
  );
  const [sceneLoading, setSceneLoading] = useState(initialLoading);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [savedPhraseTextSet, setSavedPhraseTextSet] = useState<Set<string>>(new Set());
  const [generatedState, setGeneratedState] = useState<SceneGeneratedState>({
    latestPracticeSet: null,
    latestVariantSet: null,
    practiceStatus: "idle",
    variantStatus: "idle",
  });

  const activeLoadTokenRef = useRef(0);
  const latestSceneSlugRef = useRef(normalizeSceneSlug(sceneSlug));

  const refreshGeneratedState = useCallback(
    (sceneKey: string) => {
      if (!sceneKey) return;
      setGeneratedState(deps.getSceneGeneratedState(sceneKey));
    },
    [deps],
  );

  useEffect(() => {
    latestSceneSlugRef.current = normalizeSceneSlug(sceneSlug);
  }, [sceneSlug]);

  useEffect(() => {
    if (!sceneSlug) return;
    const requestToken = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = requestToken;
    const requestSlug = normalizeSceneSlug(sceneSlug);
    const syncCacheSnapshot =
      initialLesson && normalizeSceneSlug(initialLesson.slug) === requestSlug
        ? null
        : deps.getSceneCacheSnapshotSync(requestSlug);

    if (initialLesson && normalizeSceneSlug(initialLesson.slug) === requestSlug) {
      queueMicrotask(() => {
        if (activeLoadTokenRef.current !== requestToken) return;
        setBaseLesson(initialLesson);
        setSceneDataSource("network");
        setSceneLoading(false);
        setLoadErrorMessage(null);
      });
      return;
    }

    if (syncCacheSnapshot?.found && syncCacheSnapshot.record) {
      queueMicrotask(() => {
        if (activeLoadTokenRef.current !== requestToken) return;
        setBaseLesson(syncCacheSnapshot.record?.data ?? null);
        setSceneDataSource("cache");
        setSceneLoading(false);
        setLoadErrorMessage(null);
      });
      if (!syncCacheSnapshot.isExpired) {
        return;
      }
    }

    let cancelled = false;

    const canApply = () =>
      !cancelled &&
      activeLoadTokenRef.current === requestToken &&
      latestSceneSlugRef.current === requestSlug;

    void deps.clearExpiredSceneCaches().catch(() => {
      // Non-blocking cleanup.
    });

    void deps.loadSceneDetail({
      sceneSlug,
      requestSlug,
      callbacks: {
        canApply,
        onStart: () => {
          if (syncCacheSnapshot?.found && syncCacheSnapshot.record) {
            return;
          }
          setSceneLoading(true);
          setSceneDataSource("none");
          setBaseLesson(null);
          setLoadErrorMessage(null);
        },
        onHydrateLesson: (lesson, source) => {
          setBaseLesson(lesson);
          setSceneDataSource(source);
        },
        onStopLoading: () => {
          setSceneLoading(false);
        },
        onFailure: (message) => {
          setBaseLesson(null);
          setLoadErrorMessage(message);
        },
      },
      deps: {
        getSceneCache: deps.getSceneCache,
        getSceneDetailBySlugFromApi: deps.getSceneDetailBySlugFromApi,
        setSceneCache: deps.setSceneCache,
        getScenesFromApi: deps.getScenesFromApi,
        listRecentSceneCacheKeys: deps.listRecentSceneCacheKeys,
        scheduleScenePrefetch: deps.scheduleScenePrefetch,
        extractSlugFromSceneCacheKey: deps.extractSlugFromSceneCacheKey,
        logPrefetchDebug:
          process.env.NODE_ENV === "development"
            ? () => {
                console.debug("[scene-prefetch][debug]", deps.getPrefetchDebugState());
              }
            : undefined,
      },
    });

    return () => {
      cancelled = true;
    };
  }, [deps, initialLesson, sceneSlug]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!sceneSlug) return;
    void deps
      .listRecentSceneCacheKeys(5)
      .then((keys) => {
        console.debug("[scene-cache][debug]", {
          slug: sceneSlug,
          source: sceneDataSource,
          queueTop5: keys,
          prefetch: deps.getPrefetchDebugState(),
        });
      })
      .catch(() => {
        // ignore
      });
  }, [deps, sceneDataSource, sceneSlug]);

  useEffect(() => {
    if (!baseLesson) {
      queueMicrotask(() => {
        setSavedPhraseTextSet(new Set());
      });
      return;
    }
    const candidates = deps.collectLessonChunkTexts(baseLesson);
    if (candidates.length === 0) {
      queueMicrotask(() => {
        setSavedPhraseTextSet(new Set());
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      const cache = await deps.getSceneSavedPhraseTextsCache(baseLesson.id);
      if (!cancelled && cache.found && cache.record && !cache.isExpired) {
        setSavedPhraseTextSet(new Set(cache.record.data.normalizedTexts));
        return;
      }

      try {
        const texts = await deps.getSavedNormalizedPhraseTextsFromApi(candidates);
        if (cancelled) return;
        const normalizedTexts = texts.map((text) => deps.normalizePhraseText(text));
        setSavedPhraseTextSet(new Set(normalizedTexts));
        void deps.setSceneSavedPhraseTextsCache(baseLesson.id, normalizedTexts).catch(() => {
          // Ignore cache failures.
        });
      } catch {
        if (cancelled || (cache.found && cache.record && !cache.isExpired)) return;
        setSavedPhraseTextSet(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseLesson, deps]);

  useEffect(() => {
    if (!baseLesson) return;
    let cancelled = false;

    void deps
      .syncSceneVariantsFromDb({
        baseLesson,
        hasExistingVariantSet: Boolean(deps.getSceneGeneratedState(baseLesson.id).latestVariantSet),
      })
      .then((variantSet) => {
        if (cancelled || !variantSet) return;
        deps.saveVariantSet(variantSet);
        refreshGeneratedState(baseLesson.id);
      })
      .catch(() => {
        // Keep local-only variants if db sync fails.
      });

    return () => {
      cancelled = true;
    };
  }, [baseLesson, deps, refreshGeneratedState]);

  return {
    baseLesson,
    sceneDataSource,
    sceneLoading,
    loadErrorMessage,
    savedPhraseTextSet,
    setSavedPhraseTextSet,
    generatedState,
    refreshGeneratedState,
  };
};
