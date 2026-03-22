import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

import { Lesson } from "@/lib/types";

import { UseSceneDetailDataDeps, useSceneDetailData } from "./use-scene-detail-data";

afterEach(() => {
  cleanup();
});

type SceneDetailDataDeps = UseSceneDetailDataDeps;
type LoadSceneDetailArgs = Parameters<SceneDetailDataDeps["loadSceneDetail"]>[0];

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

test("useSceneDetailData 会先接收缓存，再被网络结果覆盖", async () => {
  const cacheLesson = createLesson("scene-cache", "scene-a");
  const networkLesson = createLesson("scene-network", "scene-a");
  const deps: SceneDetailDataDeps = {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
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
