import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

let fetchCount = 0;

const mockedModules = {
  "@/lib/cache/scene-cache": {
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    normalizeSceneSlug: (slug: string) => slug.trim().toLowerCase(),
    setSceneCache: async () => undefined,
  },
  "@/lib/utils/resource-actions": {
    scheduleLessonAudioWarmup: () => undefined,
  },
  "@/lib/utils/scenes-api": {
    getSceneDetailBySlugFromApi: async (slug: string) => {
      fetchCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        id: slug,
        slug,
        title: slug,
        difficulty: "Beginner",
        estimatedMinutes: 5,
        completionRate: 0,
        tags: [],
        sceneType: "dialogue",
        sections: [
          {
            id: "section-1",
            title: "Section 1",
            blocks: [
              {
                id: "block-1",
                speaker: "A",
                sentences: [{ id: "sentence-1", text: "Hello." }],
              },
            ],
          },
        ],
        explanations: [],
      };
    },
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let scenePrefetchModule:
  | {
      prefetchSceneDetail: (slug: string) => Promise<boolean>;
      resetScenePrefetchSchedulerForTests: () => void;
    }
  | null = null;

const getScenePrefetchModule = () => {
  if (!scenePrefetchModule) {
    const modulePath = localRequire.resolve("./scene-prefetch");
    delete localRequire.cache[modulePath];
    scenePrefetchModule = localRequire("./scene-prefetch") as typeof scenePrefetchModule;
  }
  return scenePrefetchModule;
};

afterEach(() => {
  fetchCount = 0;
  scenePrefetchModule?.resetScenePrefetchSchedulerForTests();
  scenePrefetchModule = null;
});

test("prefetchSceneDetail 并发预热同一场景时会复用同一个请求", async () => {
  Object.defineProperty(globalThis, "window", {
    value: {
      document: { visibilityState: "visible" },
      navigator: {},
      setTimeout,
      clearTimeout,
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: { visibilityState: "visible" },
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: {},
    configurable: true,
  });

  const { prefetchSceneDetail } = getScenePrefetchModule();
  const [first, second] = await Promise.all([
    prefetchSceneDetail("coffee-chat"),
    prefetchSceneDetail("coffee-chat"),
  ]);

  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(fetchCount, 1);
});
