import { Lesson } from "@/lib/types";

import { scheduleLessonAudioWarmup } from "@/lib/utils/resource-actions";

import {
  buildScenePrefetchPlan,
  resolveSceneCachePresentation,
  resolveSceneNetworkFailure,
} from "./scene-detail-load-logic";

type SceneDataSource = "none" | "cache" | "network";

type SceneCacheRecord = {
  data: Lesson;
};

type SceneCacheResult = {
  found: boolean;
  isExpired: boolean;
  record: SceneCacheRecord | null;
};

type SceneListItem = {
  slug: string;
};

type SceneDetailLoadCallbacks = {
  canApply: () => boolean;
  onStart: () => void;
  onHydrateLesson: (lesson: Lesson, source: SceneDataSource) => void;
  onStopLoading: () => void;
  onFailure: (message: string | null) => void;
};

type SceneDetailLoadDeps = {
  getSceneCache: (slug: string) => Promise<SceneCacheResult>;
  getSceneDetailBySlugFromApi: (slug: string) => Promise<Lesson>;
  setSceneCache: (slug: string, lesson: Lesson) => Promise<void>;
  getScenesFromApi: () => Promise<SceneListItem[]>;
  listRecentSceneCacheKeys: (limit: number) => Promise<string[]>;
  scheduleScenePrefetch: (slugs: string[], options: { currentSlug: string }) => void;
  extractSlugFromSceneCacheKey: (key: string) => string;
  logPrefetchDebug?: () => void;
};

export const loadSceneDetail = async ({
  sceneSlug,
  requestSlug,
  callbacks,
  deps,
}: {
  sceneSlug: string;
  requestSlug: string;
  callbacks: SceneDetailLoadCallbacks;
  deps: SceneDetailLoadDeps;
}) => {
  callbacks.onStart();

  let hasCacheFallback = false;
  let cacheFresh = false;

  try {
    const cacheResult = await deps.getSceneCache(requestSlug);
    if (!callbacks.canApply()) return;
    if (cacheResult.found && cacheResult.record) {
      const presentation = resolveSceneCachePresentation({
        cacheFound: true,
        cacheExpired: cacheResult.isExpired,
      });
      hasCacheFallback = presentation.hasCacheFallback;
      cacheFresh = presentation.cacheFresh;
      if (presentation.shouldHydrateFromCache) {
        callbacks.onHydrateLesson(cacheResult.record.data, presentation.nextDataSource);
      }
      if (presentation.shouldStopLoading) {
        callbacks.onStopLoading();
      }
    }
  } catch {
    // Non-blocking: cache failures should not block network flow.
  }

  if (cacheFresh) return;

  try {
    const lesson = await deps.getSceneDetailBySlugFromApi(sceneSlug);
    if (!callbacks.canApply()) return;

    callbacks.onHydrateLesson(lesson, "network");
    callbacks.onStopLoading();
    scheduleLessonAudioWarmup(lesson, {
      sentenceLimit: 2,
      chunkLimit: 2,
      key: `scene-detail-audio:${requestSlug}`,
    });

    void deps.setSceneCache(requestSlug, lesson).catch(() => {
      // Non-blocking cache write.
    });

    void prefetchRelatedScenes({
      requestSlug,
      callbacks,
      deps,
    });
  } catch (error) {
    if (!callbacks.canApply()) return;
    const failure = resolveSceneNetworkFailure({
      hasCacheFallback,
      error,
    });
    if (failure.shouldStopLoading) {
      callbacks.onStopLoading();
    }
    callbacks.onFailure(failure.message);
  }
};

const prefetchRelatedScenes = async ({
  requestSlug,
  callbacks,
  deps,
}: {
  requestSlug: string;
  callbacks: Pick<SceneDetailLoadCallbacks, "canApply">;
  deps: Pick<
    SceneDetailLoadDeps,
    | "getScenesFromApi"
    | "listRecentSceneCacheKeys"
    | "scheduleScenePrefetch"
    | "extractSlugFromSceneCacheKey"
    | "logPrefetchDebug"
  >;
}) => {
  let sceneSlugs: string[] = [];
  let candidates: string[] = [];

  try {
    const list = await deps.getScenesFromApi();
    if (!callbacks.canApply()) return;
    sceneSlugs = list.map((item) => item.slug);
    candidates = buildScenePrefetchPlan({
      requestSlug,
      sceneSlugs,
      recentCacheKeys: [],
      extractSlugFromSceneCacheKey: deps.extractSlugFromSceneCacheKey,
    });
  } catch {
    // Non-blocking: prefetch candidates can degrade gracefully.
  }

  if (candidates.length < 2) {
    try {
      const recentKeys = await deps.listRecentSceneCacheKeys(8);
      candidates = buildScenePrefetchPlan({
        requestSlug,
        sceneSlugs,
        recentCacheKeys: recentKeys,
        extractSlugFromSceneCacheKey: deps.extractSlugFromSceneCacheKey,
      });
    } catch {
      // ignore
    }
  }

  if (!callbacks.canApply()) return;
  deps.scheduleScenePrefetch(candidates, { currentSlug: requestSlug });
  deps.logPrefetchDebug?.();
};
