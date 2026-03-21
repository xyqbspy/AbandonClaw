import assert from "node:assert/strict";
import test from "node:test";
import {
  buildScenePrefetchPlan,
  resolveSceneCachePresentation,
  resolveSceneNetworkFailure,
} from "./scene-detail-load-logic";

test("resolveSceneCachePresentation 会区分无缓存、过期缓存和新鲜缓存", () => {
  assert.deepEqual(
    resolveSceneCachePresentation({
      cacheFound: false,
      cacheExpired: false,
    }),
    {
      hasCacheFallback: false,
      cacheFresh: false,
      shouldHydrateFromCache: false,
      nextDataSource: "none",
      shouldStopLoading: false,
      shouldFetchNetwork: true,
    },
  );

  assert.deepEqual(
    resolveSceneCachePresentation({
      cacheFound: true,
      cacheExpired: true,
    }),
    {
      hasCacheFallback: true,
      cacheFresh: false,
      shouldHydrateFromCache: true,
      nextDataSource: "cache",
      shouldStopLoading: true,
      shouldFetchNetwork: true,
    },
  );

  assert.deepEqual(
    resolveSceneCachePresentation({
      cacheFound: true,
      cacheExpired: false,
    }),
    {
      hasCacheFallback: true,
      cacheFresh: true,
      shouldHydrateFromCache: true,
      nextDataSource: "cache",
      shouldStopLoading: true,
      shouldFetchNetwork: false,
    },
  );
});

test("buildScenePrefetchPlan 会优先用场景列表，再用最近缓存补足", () => {
  const extractSlugFromSceneCacheKey = (key: string) =>
    key.startsWith("scene:") ? key.slice("scene:".length) : "";

  assert.deepEqual(
    buildScenePrefetchPlan({
      requestSlug: "scene-b",
      sceneSlugs: ["scene-a", "scene-b", "scene-c"],
      recentCacheKeys: ["scene:scene-a", "scene:scene-d"],
      extractSlugFromSceneCacheKey,
    }),
    ["scene-c", "scene-a"],
  );

  assert.deepEqual(
    buildScenePrefetchPlan({
      requestSlug: "scene-z",
      sceneSlugs: [],
      recentCacheKeys: ["scene:scene-a", "scene:scene-z", "scene:scene-b"],
      extractSlugFromSceneCacheKey,
    }),
    ["scene-a", "scene-b"],
  );
});

test("resolveSceneNetworkFailure 只在没有缓存回退时清空页面并给出错误", () => {
  assert.deepEqual(
    resolveSceneNetworkFailure({
      hasCacheFallback: true,
      error: new Error("boom"),
    }),
    {
      shouldClearLesson: false,
      shouldStopLoading: false,
      message: null,
    },
  );

  assert.deepEqual(
    resolveSceneNetworkFailure({
      hasCacheFallback: false,
      error: new Error("boom"),
    }),
    {
      shouldClearLesson: true,
      shouldStopLoading: true,
      message: "boom",
    },
  );
});
