import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearExpiredSceneCaches,
  getSceneCache,
  listRecentSceneCacheKeys,
  normalizeSceneSlug,
  setSceneCache,
} from "@/lib/cache/scene-cache";
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
  getSceneDetailBySlugFromApi: typeof getSceneDetailBySlugFromApi;
  setSceneCache: typeof setSceneCache;
  getScenesFromApi: typeof getScenesFromApi;
  listRecentSceneCacheKeys: typeof listRecentSceneCacheKeys;
  scheduleScenePrefetch: typeof scheduleScenePrefetch;
  extractSlugFromSceneCacheKey: typeof extractSlugFromSceneCacheKey;
  getPrefetchDebugState: typeof getPrefetchDebugState;
  loadSceneDetail: typeof loadSceneDetail;
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
  getSceneDetailBySlugFromApi,
  setSceneCache,
  getScenesFromApi,
  listRecentSceneCacheKeys,
  scheduleScenePrefetch,
  extractSlugFromSceneCacheKey,
  getPrefetchDebugState,
  loadSceneDetail,
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

  const [baseLesson, setBaseLesson] = useState<Lesson | null>(initialLesson);
  const [sceneDataSource, setSceneDataSource] = useState<"none" | "cache" | "network">(
    initialLesson ? "network" : "none",
  );
  const [sceneLoading, setSceneLoading] = useState(!initialLesson);
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
    if (initialLesson && normalizeSceneSlug(initialLesson.slug) === requestSlug) {
      setBaseLesson(initialLesson);
      setSceneDataSource("network");
      setSceneLoading(false);
      setLoadErrorMessage(null);
      return;
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
    void deps.listRecentSceneCacheKeys(5)
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
      setSavedPhraseTextSet(new Set());
      return;
    }
    const candidates = deps.collectLessonChunkTexts(baseLesson);
    if (candidates.length === 0) {
      setSavedPhraseTextSet(new Set());
      return;
    }
    let cancelled = false;
    void deps.getSavedNormalizedPhraseTextsFromApi(candidates)
      .then((texts) => {
        if (cancelled) return;
        setSavedPhraseTextSet(new Set(texts.map((text) => deps.normalizePhraseText(text))));
      })
      .catch(() => {
        if (cancelled) return;
        setSavedPhraseTextSet(new Set());
      });
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
