import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

import { Lesson } from "@/lib/types";

import { UseSceneDetailDataDeps, useSceneDetailData } from "./use-scene-detail-data";

afterEach(() => {
  cleanup();
});

type SceneDetailDataDeps = UseSceneDetailDataDeps;
type LoadSceneDetailArgs = Parameters<SceneDetailDataDeps["loadSceneDetail"]>[0];
type SceneSavedPhraseTextsCacheResult = Awaited<
  ReturnType<SceneDetailDataDeps["getSceneSavedPhraseTextsCache"]>
>;
type SceneCacheSnapshotResult = ReturnType<SceneDetailDataDeps["getSceneCacheSnapshotSync"]>;

const createLesson = (id: string, slug = id): Lesson => ({
  id,
  slug,
  title: id,
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sections: [],
  explanations: [],
});

const buildSavedPhraseTextsCacheResult = (
  sceneId: string,
  normalizedTexts: string[],
): SceneSavedPhraseTextsCacheResult => {
  const now = Date.now();
  return {
    found: true,
    isExpired: false,
    record: {
      schemaVersion: "scene-saved-phrase-texts-cache-v1",
      key: `scene-saved-texts:v1:${sceneId}`,
      type: "scene_saved_phrase_texts",
      data: {
        sceneId,
        normalizedTexts,
      },
      cachedAt: now,
      lastAccessedAt: now,
      expiresAt: now + 60_000,
    },
  };
};

const buildSceneCacheSnapshotResult = (
  slug: string,
  lesson: Lesson,
  isExpired = false,
): SceneCacheSnapshotResult => {
  const now = Date.now();
  return {
    found: true,
    isExpired,
    record: {
      schemaVersion: "scene-cache-v3",
      key: `scene:${slug}`,
      type: "scene",
      slug,
      data: lesson,
      version: null,
      sourceUpdatedAt: null,
      cachedAt: now,
      lastAccessedAt: now,
      expiresAt: now + 60_000,
    },
  };
};

test("useSceneDetailData 会先接收缓存，再被网络结果覆盖", async () => {
  const cacheLesson = createLesson("scene-cache", "scene-a");
  const networkLesson = createLesson("scene-network", "scene-a");
  const deps: SceneDetailDataDeps = {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneCacheSnapshotSync: () => ({ found: false, isExpired: false, record: null }),
    getSceneDetailBySlugFromApi: async () => networkLesson,
    setSceneCache: async () => undefined,
    getScenesFromApi: async () => [],
    listRecentSceneCacheKeys: async () => [],
    scheduleScenePrefetch: () => undefined,
    extractSlugFromSceneCacheKey: (key: string) => key,
    getPrefetchDebugState: () => ({
      pendingKeys: [],
      inFlightKey: null,
      recentPrefetchedKeys: [],
    }),
    loadSceneDetail: async ({ callbacks }: LoadSceneDetailArgs) => {
      callbacks.onStart();
      callbacks.onHydrateLesson(cacheLesson, "cache");
      callbacks.onStopLoading();
      await Promise.resolve();
      callbacks.onHydrateLesson(networkLesson, "network");
      callbacks.onStopLoading();
    },
    getSceneSavedPhraseTextsCache: async () => ({ found: false, record: null, isExpired: false }),
    setSceneSavedPhraseTextsCache: async () => undefined,
    getSavedNormalizedPhraseTextsFromApi: async () => [],
    collectLessonChunkTexts: () => [],
    normalizePhraseText: (text: string) => text,
    getSceneGeneratedState: () => ({
      latestPracticeSet: null,
      latestVariantSet: null,
      practiceStatus: "idle",
      variantStatus: "idle",
    }),
    syncSceneVariantsFromDb: async () => null,
    saveVariantSet: () => undefined,
  };

  const { result } = renderHook(() => useSceneDetailData("scene-a", deps));

  await waitFor(() => {
    assert.equal(result.current.sceneDataSource, "cache");
    assert.equal(result.current.baseLesson?.id, "scene-cache");
  });

  await waitFor(() => {
    assert.equal(result.current.sceneDataSource, "network");
    assert.equal(result.current.baseLesson?.id, "scene-network");
    assert.equal(result.current.sceneLoading, false);
  });
});

test("useSceneDetailData 会忽略旧 slug 的迟到回填", async () => {
  const lessons = {
    a: createLesson("scene-a", "scene-a"),
    b: createLesson("scene-b", "scene-b"),
  };
  const pendingHydrates = new Map<
    string,
    {
      canApply: () => boolean;
      onHydrateLesson: (lesson: Lesson, source: "cache" | "network") => void;
      onStopLoading: () => void;
    }
  >();

  const deps: SceneDetailDataDeps = {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneCacheSnapshotSync: () => ({ found: false, isExpired: false, record: null }),
    getSceneDetailBySlugFromApi: async () => lessons.a,
    setSceneCache: async () => undefined,
    getScenesFromApi: async () => [],
    listRecentSceneCacheKeys: async () => [],
    scheduleScenePrefetch: () => undefined,
    extractSlugFromSceneCacheKey: (key: string) => key,
    getPrefetchDebugState: () => ({
      pendingKeys: [],
      inFlightKey: null,
      recentPrefetchedKeys: [],
    }),
    loadSceneDetail: async ({ sceneSlug, callbacks }: LoadSceneDetailArgs) => {
      callbacks.onStart();
      pendingHydrates.set(sceneSlug, {
        canApply: callbacks.canApply,
        onHydrateLesson: callbacks.onHydrateLesson,
        onStopLoading: callbacks.onStopLoading,
      });
    },
    getSceneSavedPhraseTextsCache: async () => ({ found: false, record: null, isExpired: false }),
    setSceneSavedPhraseTextsCache: async () => undefined,
    getSavedNormalizedPhraseTextsFromApi: async () => [],
    collectLessonChunkTexts: () => [],
    normalizePhraseText: (text: string) => text,
    getSceneGeneratedState: () => ({
      latestPracticeSet: null,
      latestVariantSet: null,
      practiceStatus: "idle",
      variantStatus: "idle",
    }),
    syncSceneVariantsFromDb: async () => null,
    saveVariantSet: () => undefined,
  };

  const { result, rerender } = renderHook(
    ({ slug }) => useSceneDetailData(slug, deps),
    {
      initialProps: { slug: "scene-a" },
    },
  );

  rerender({ slug: "scene-b" });

  const first = pendingHydrates.get("scene-a");
  const second = pendingHydrates.get("scene-b");
  assert.equal(first?.canApply(), false);
  assert.equal(second?.canApply(), true);

  if (first?.canApply()) {
    first.onHydrateLesson(lessons.a, "network");
    first.onStopLoading();
  }

  second?.onHydrateLesson(lessons.b, "network");
  second?.onStopLoading();

  await waitFor(() => {
    assert.equal(result.current.baseLesson?.id, "scene-b");
    assert.equal(result.current.sceneDataSource, "network");
  });
});

test("useSceneDetailData 在 initialLesson slug 匹配时会直接使用初始数据", async () => {
  const initialLesson = createLesson("scene-ssr", "scene-ssr");
  let loadSceneDetailCalled = false;

  const deps: SceneDetailDataDeps = {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneCacheSnapshotSync: () => ({ found: false, isExpired: false, record: null }),
    getSceneDetailBySlugFromApi: async () => initialLesson,
    setSceneCache: async () => undefined,
    getScenesFromApi: async () => [],
    listRecentSceneCacheKeys: async () => [],
    scheduleScenePrefetch: () => undefined,
    extractSlugFromSceneCacheKey: (key: string) => key,
    getPrefetchDebugState: () => ({
      pendingKeys: [],
      inFlightKey: null,
      recentPrefetchedKeys: [],
    }),
    loadSceneDetail: async () => {
      loadSceneDetailCalled = true;
    },
    getSceneSavedPhraseTextsCache: async () => ({ found: false, record: null, isExpired: false }),
    setSceneSavedPhraseTextsCache: async () => undefined,
    getSavedNormalizedPhraseTextsFromApi: async () => [],
    collectLessonChunkTexts: () => [],
    normalizePhraseText: (text: string) => text,
    getSceneGeneratedState: () => ({
      latestPracticeSet: null,
      latestVariantSet: null,
      practiceStatus: "idle",
      variantStatus: "idle",
    }),
    syncSceneVariantsFromDb: async () => null,
    saveVariantSet: () => undefined,
  };

  const { result } = renderHook(() =>
    useSceneDetailData("scene-ssr", { initialLesson, deps }),
  );

  await waitFor(() => {
    assert.equal(result.current.baseLesson?.id, "scene-ssr");
    assert.equal(result.current.sceneDataSource, "network");
    assert.equal(result.current.sceneLoading, false);
  });

  assert.equal(loadSceneDetailCalled, false);
  assert.equal(result.current.loadErrorMessage, null);
});

test("useSceneDetailData 会优先回填场景已收藏短语缓存", async () => {
  const lesson = createLesson("scene-cache", "scene-cache");
  const deps: SceneDetailDataDeps = {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneCacheSnapshotSync: () => ({ found: false, isExpired: false, record: null }),
    getSceneDetailBySlugFromApi: async () => lesson,
    setSceneCache: async () => undefined,
    getScenesFromApi: async () => [],
    listRecentSceneCacheKeys: async () => [],
    scheduleScenePrefetch: () => undefined,
    extractSlugFromSceneCacheKey: (key: string) => key,
    getPrefetchDebugState: () => ({
      pendingKeys: [],
      inFlightKey: null,
      recentPrefetchedKeys: [],
    }),
    loadSceneDetail: async ({ callbacks }: LoadSceneDetailArgs) => {
      callbacks.onStart();
      callbacks.onHydrateLesson(lesson, "network");
      callbacks.onStopLoading();
    },
    getSceneSavedPhraseTextsCache: async () =>
      buildSavedPhraseTextsCacheResult(lesson.id, ["call it a day"]),
    setSceneSavedPhraseTextsCache: async () => undefined,
    getSavedNormalizedPhraseTextsFromApi: async () => ["call it a day", "wrap up"],
    collectLessonChunkTexts: () => ["call it a day", "wrap up"],
    normalizePhraseText: (text: string) => text.trim().toLowerCase(),
    getSceneGeneratedState: () => ({
      latestPracticeSet: null,
      latestVariantSet: null,
      practiceStatus: "idle",
      variantStatus: "idle",
    }),
    syncSceneVariantsFromDb: async () => null,
    saveVariantSet: () => undefined,
  };

  const { result } = renderHook(() => useSceneDetailData("scene-cache", deps));

  await waitFor(() => {
    assert.equal(result.current.savedPhraseTextSet.has("call it a day"), true);
  });
});

test("useSceneDetailData 在已收藏短语缓存未过期时不会继续请求接口", async () => {
  const lesson = createLesson("scene-cache-only", "scene-cache-only");
  let savedPhraseApiCalled = false;

  const deps: SceneDetailDataDeps = {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneCacheSnapshotSync: () => ({ found: false, isExpired: false, record: null }),
    getSceneDetailBySlugFromApi: async () => lesson,
    setSceneCache: async () => undefined,
    getScenesFromApi: async () => [],
    listRecentSceneCacheKeys: async () => [],
    scheduleScenePrefetch: () => undefined,
    extractSlugFromSceneCacheKey: (key: string) => key,
    getPrefetchDebugState: () => ({
      pendingKeys: [],
      inFlightKey: null,
      recentPrefetchedKeys: [],
    }),
    loadSceneDetail: async ({ callbacks }: LoadSceneDetailArgs) => {
      callbacks.onStart();
      callbacks.onHydrateLesson(lesson, "network");
      callbacks.onStopLoading();
    },
    getSceneSavedPhraseTextsCache: async () =>
      buildSavedPhraseTextsCacheResult(lesson.id, ["call it a day"]),
    setSceneSavedPhraseTextsCache: async () => undefined,
    getSavedNormalizedPhraseTextsFromApi: async () => {
      savedPhraseApiCalled = true;
      return ["call it a day", "wrap up"];
    },
    collectLessonChunkTexts: () => ["call it a day", "wrap up"],
    normalizePhraseText: (text: string) => text.trim().toLowerCase(),
    getSceneGeneratedState: () => ({
      latestPracticeSet: null,
      latestVariantSet: null,
      practiceStatus: "idle",
      variantStatus: "idle",
    }),
    syncSceneVariantsFromDb: async () => null,
    saveVariantSet: () => undefined,
  };

  const { result } = renderHook(() => useSceneDetailData("scene-cache-only", deps));

  await waitFor(() => {
    assert.equal(result.current.savedPhraseTextSet.has("call it a day"), true);
  });

  assert.equal(savedPhraseApiCalled, false);
});

test("useSceneDetailData 会同步复用本会话场景缓存做到首帧回填", () => {
  const cachedLesson = createLesson("scene-sync-cache", "scene-sync-cache");
  let loadSceneDetailCalled = false;

  const deps: SceneDetailDataDeps = {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneCacheSnapshotSync: () =>
      buildSceneCacheSnapshotResult("scene-sync-cache", cachedLesson),
    getSceneDetailBySlugFromApi: async () => cachedLesson,
    setSceneCache: async () => undefined,
    getScenesFromApi: async () => [],
    listRecentSceneCacheKeys: async () => [],
    scheduleScenePrefetch: () => undefined,
    extractSlugFromSceneCacheKey: (key: string) => key,
    getPrefetchDebugState: () => ({
      pendingKeys: [],
      inFlightKey: null,
      recentPrefetchedKeys: [],
    }),
    loadSceneDetail: async () => {
      loadSceneDetailCalled = true;
    },
    getSceneSavedPhraseTextsCache: async () => ({ found: false, record: null, isExpired: false }),
    setSceneSavedPhraseTextsCache: async () => undefined,
    getSavedNormalizedPhraseTextsFromApi: async () => [],
    collectLessonChunkTexts: () => [],
    normalizePhraseText: (text: string) => text,
    getSceneGeneratedState: () => ({
      latestPracticeSet: null,
      latestVariantSet: null,
      practiceStatus: "idle",
      variantStatus: "idle",
    }),
    syncSceneVariantsFromDb: async () => null,
    saveVariantSet: () => undefined,
  };

  const { result } = renderHook(() => useSceneDetailData("scene-sync-cache", deps));

  assert.equal(result.current.baseLesson?.id, "scene-sync-cache");
  assert.equal(result.current.sceneDataSource, "cache");
  assert.equal(result.current.sceneLoading, false);
  assert.equal(loadSceneDetailCalled, false);
});

test("useSceneDetailData 在同步缓存已过期时也会先展示旧内容，再等待网络回填", async () => {
  const cachedLesson = createLesson("scene-stale-cache", "scene-stale-cache");
  const networkLesson = createLesson("scene-stale-network", "scene-stale-cache");
  let resolveNetwork: (() => void) | null = null;

  const deps: SceneDetailDataDeps = {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneCacheSnapshotSync: () =>
      buildSceneCacheSnapshotResult("scene-stale-cache", cachedLesson, true),
    getSceneDetailBySlugFromApi: async () => networkLesson,
    setSceneCache: async () => undefined,
    getScenesFromApi: async () => [],
    listRecentSceneCacheKeys: async () => [],
    scheduleScenePrefetch: () => undefined,
    extractSlugFromSceneCacheKey: (key: string) => key,
    getPrefetchDebugState: () => ({
      pendingKeys: [],
      inFlightKey: null,
      recentPrefetchedKeys: [],
    }),
    loadSceneDetail: async ({ callbacks }: LoadSceneDetailArgs) => {
      await new Promise<void>((resolve) => {
        resolveNetwork = resolve;
      });
      callbacks.onHydrateLesson(networkLesson, "network");
      callbacks.onStopLoading();
    },
    getSceneSavedPhraseTextsCache: async () => ({ found: false, record: null, isExpired: false }),
    setSceneSavedPhraseTextsCache: async () => undefined,
    getSavedNormalizedPhraseTextsFromApi: async () => [],
    collectLessonChunkTexts: () => [],
    normalizePhraseText: (text: string) => text,
    getSceneGeneratedState: () => ({
      latestPracticeSet: null,
      latestVariantSet: null,
      practiceStatus: "idle",
      variantStatus: "idle",
    }),
    syncSceneVariantsFromDb: async () => null,
    saveVariantSet: () => undefined,
  };

  const { result } = renderHook(() => useSceneDetailData("scene-stale-cache", deps));

  await waitFor(() => {
    assert.equal(result.current.baseLesson?.id, "scene-stale-cache");
    assert.equal(result.current.sceneDataSource, "cache");
    assert.equal(result.current.sceneLoading, false);
  });

  if (!resolveNetwork) {
    throw new Error("resolveNetwork was not initialized");
  }
  const runResolve: () => void = resolveNetwork;
  runResolve();

  await waitFor(() => {
    assert.equal(result.current.baseLesson?.id, "scene-stale-network");
    assert.equal(result.current.sceneDataSource, "network");
    assert.equal(result.current.sceneLoading, false);
  });
});
