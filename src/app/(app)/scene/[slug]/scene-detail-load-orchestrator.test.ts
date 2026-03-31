import assert from "node:assert/strict";
import test from "node:test";

import { Lesson } from "@/lib/types";

import { loadSceneDetail } from "./scene-detail-load-orchestrator";

const createLesson = (id: string, slug = id, title = id): Lesson => ({
  id,
  slug,
  title,
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sections: [],
  explanations: [],
});

test("loadSceneDetail 命中新鲜缓存时会先回填缓存，再继续请求网络", async () => {
  const cacheLesson = createLesson("scene-cache", "scene-1", "Cached");
  const networkLesson = createLesson("scene-network", "scene-1", "Fresh");
  const events: Array<unknown[]> = [];
  const cacheWrites: Array<{ slug: string; lesson: Lesson }> = [];
  const prefetchCalls: Array<{ slugs: string[]; currentSlug: string }> = [];

  await loadSceneDetail({
    sceneSlug: "scene-1",
    requestSlug: "scene-1",
    callbacks: {
      canApply: () => true,
      onStart: () => events.push(["start"]),
      onHydrateLesson: (value, source) => events.push(["hydrate", source, value]),
      onStopLoading: () => events.push(["stop"]),
      onFailure: (message) => events.push(["failure", message]),
    },
    deps: {
      getSceneCache: async () => ({
        found: true,
        isExpired: false,
        record: { data: cacheLesson },
      }),
      getSceneDetailBySlugFromApi: async () => networkLesson,
      setSceneCache: async (slug, lesson) => {
        cacheWrites.push({ slug, lesson });
      },
      getScenesFromApi: async () => [{ slug: "scene-1" }, { slug: "scene-2" }],
      listRecentSceneCacheKeys: async () => [],
      scheduleScenePrefetch: (slugs, options) => {
        prefetchCalls.push({ slugs, currentSlug: options.currentSlug });
      },
      extractSlugFromSceneCacheKey: (key) => key,
    },
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(events, [
    ["start"],
    ["hydrate", "cache", cacheLesson],
    ["stop"],
    ["hydrate", "network", networkLesson],
    ["stop"],
  ]);
  assert.deepEqual(cacheWrites, [{ slug: "scene-1", lesson: networkLesson }]);
  assert.deepEqual(prefetchCalls, [
    { slugs: ["scene-2"], currentSlug: "scene-1" },
  ]);
});

test("loadSceneDetail 在过期缓存后会继续请求网络并调度预取", async () => {
  const cacheLesson = createLesson("cached", "scene-1", "Cached");
  const networkLesson = createLesson("fresh", "scene-1", "Fresh");
  const events: Array<unknown[]> = [];
  const prefetchCalls: Array<{ slugs: string[]; currentSlug: string }> = [];
  const cacheWrites: Array<{ slug: string; lesson: Lesson }> = [];

  await loadSceneDetail({
    sceneSlug: "scene-1",
    requestSlug: "scene-1",
    callbacks: {
      canApply: () => true,
      onStart: () => events.push(["start"]),
      onHydrateLesson: (value, source) => events.push(["hydrate", source, value]),
      onStopLoading: () => events.push(["stop"]),
      onFailure: (message) => events.push(["failure", message]),
    },
    deps: {
      getSceneCache: async () => ({
        found: true,
        isExpired: true,
        record: { data: cacheLesson },
      }),
      getSceneDetailBySlugFromApi: async () => networkLesson,
      setSceneCache: async (slug, lesson) => {
        cacheWrites.push({ slug, lesson });
      },
      getScenesFromApi: async () => [{ slug: "scene-1" }, { slug: "scene-2" }],
      listRecentSceneCacheKeys: async () => ["scene-3"],
      scheduleScenePrefetch: (slugs, options) => {
        prefetchCalls.push({ slugs, currentSlug: options.currentSlug });
      },
      extractSlugFromSceneCacheKey: (key) => key,
    },
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(events, [
    ["start"],
    ["hydrate", "cache", cacheLesson],
    ["stop"],
    ["hydrate", "network", networkLesson],
    ["stop"],
  ]);
  assert.deepEqual(cacheWrites, [{ slug: "scene-1", lesson: networkLesson }]);
  assert.deepEqual(prefetchCalls, [
    { slugs: ["scene-2", "scene-3"], currentSlug: "scene-1" },
  ]);
});

test("loadSceneDetail 在无缓存且网络失败时会上报错误", async () => {
  const events: Array<unknown[]> = [];

  await loadSceneDetail({
    sceneSlug: "scene-1",
    requestSlug: "scene-1",
    callbacks: {
      canApply: () => true,
      onStart: () => events.push(["start"]),
      onHydrateLesson: (value, source) => events.push(["hydrate", source, value]),
      onStopLoading: () => events.push(["stop"]),
      onFailure: (message) => events.push(["failure", message]),
    },
    deps: {
      getSceneCache: async () => ({
        found: false,
        isExpired: false,
        record: null,
      }),
      getSceneDetailBySlugFromApi: async () => {
        throw new Error("boom");
      },
      setSceneCache: async () => undefined,
      getScenesFromApi: async () => [],
      listRecentSceneCacheKeys: async () => [],
      scheduleScenePrefetch: () => undefined,
      extractSlugFromSceneCacheKey: (key) => key,
    },
  });

  assert.deepEqual(events, [
    ["start"],
    ["stop"],
    ["failure", "boom"],
  ]);
});
