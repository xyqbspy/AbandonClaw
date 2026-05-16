import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

import type { Lesson } from "@/lib/types";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const lesson: Lesson = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sections: [],
  explanations: [],
};

const cacheReadCalls: string[] = [];
const cacheWriteCalls: string[] = [];
const hydrateCalls: Array<{ sceneId: string; variantSetId: string; activeVariantId: string | null }> = [];
const refreshCalls: string[] = [];
const activeVariantCalls: Array<string | null> = [];
const apiReadCalls: string[] = [];
const startRunCalls: string[] = [];

let currentCacheResult:
  | {
      found: boolean;
      record: { data: { snapshot: { run: { activeVariantId: string | null } | null } } } | null;
      isExpired: boolean;
    }
  | null = null;
let currentApiResult: { run: { activeVariantId: string | null } | null } | null = null;
let currentStartResult: { run: { activeVariantId: string | null } | null } | null = null;

const mockedModules = {
  "@/lib/cache/scene-runtime-cache": {
    getSceneVariantRunCache: async (slug: string) => {
      cacheReadCalls.push(slug);
      return currentCacheResult;
    },
    setSceneVariantRunCache: async (slug: string) => {
      cacheWriteCalls.push(slug);
    },
  },
  "@/lib/utils/scene-learning-flow-storage": {
    hydrateVariantSetFromRun: (
      sceneId: string,
      variantSetId: string,
      run: { activeVariantId: string | null } | null,
    ) => {
      hydrateCalls.push({
        sceneId,
        variantSetId,
        activeVariantId: run?.activeVariantId ?? null,
      });
    },
  },
  "@/lib/utils/learning-api": {
    getSceneVariantRunSnapshotFromApi: async (slug: string) => {
      apiReadCalls.push(slug);
      return currentApiResult;
    },
    startSceneVariantRunFromApi: async (slug: string) => {
      startRunCalls.push(slug);
      return currentStartResult;
    },
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let useSceneVariantRunLifecycleModule:
  | typeof import("./use-scene-variant-run-lifecycle").useSceneVariantRunLifecycle
  | null = null;

function getUseSceneVariantRunLifecycle() {
  if (!useSceneVariantRunLifecycleModule) {
    const modulePath = localRequire.resolve("./use-scene-variant-run-lifecycle");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./use-scene-variant-run-lifecycle") as typeof import("./use-scene-variant-run-lifecycle");
    useSceneVariantRunLifecycleModule = imported.useSceneVariantRunLifecycle;
  }
  return useSceneVariantRunLifecycleModule;
}

afterEach(() => {
  cleanup();
  cacheReadCalls.length = 0;
  cacheWriteCalls.length = 0;
  hydrateCalls.length = 0;
  refreshCalls.length = 0;
  activeVariantCalls.length = 0;
  apiReadCalls.length = 0;
  startRunCalls.length = 0;
  currentCacheResult = null;
  currentApiResult = null;
  currentStartResult = null;
  useSceneVariantRunLifecycleModule = null;
});

test("useSceneVariantRunLifecycle 会从缓存恢复 activeVariantId", async () => {
  const useSceneVariantRunLifecycle = getUseSceneVariantRunLifecycle();

  currentCacheResult = {
    found: true,
    isExpired: false,
    record: {
      data: {
        snapshot: {
          run: {
            activeVariantId: "variant-9",
          },
        },
      },
    },
  };

  renderHook(() =>
    useSceneVariantRunLifecycle({
      baseLesson: lesson,
      viewMode: "scene",
      latestVariantSetId: "variant-set-1",
      latestVariantSetStatus: "idle",
      activeVariantId: null,
      searchParams: { get: () => null },
      setActiveVariantId: (variantId) => {
        activeVariantCalls.push(variantId);
      },
      refreshGeneratedState: (sceneId) => {
        refreshCalls.push(sceneId);
      },
    }),
  );

  await waitFor(() => assert.equal(cacheReadCalls.length, 1));
  assert.equal(apiReadCalls.length, 0);
  assert.equal(startRunCalls.length, 0);
  assert.deepEqual(hydrateCalls, [
    { sceneId: "scene-1", variantSetId: "variant-set-1", activeVariantId: "variant-9" },
  ]);
  assert.deepEqual(activeVariantCalls, ["variant-9"]);
  assert.deepEqual(refreshCalls, ["scene-1"]);
  assert.equal(cacheWriteCalls.length, 0);
});

test("useSceneVariantRunLifecycle 会在 variants 生成后自动开启并写回 run", async () => {
  const useSceneVariantRunLifecycle = getUseSceneVariantRunLifecycle();

  currentCacheResult = {
    found: false,
    isExpired: false,
    record: null,
  };
  currentApiResult = {
    run: {
      activeVariantId: "variant-10",
    },
  };
  currentStartResult = {
    run: {
      activeVariantId: "variant-10",
    },
  };

  renderHook(() =>
    useSceneVariantRunLifecycle({
      baseLesson: lesson,
      viewMode: "variants",
      latestVariantSetId: "variant-set-1",
      latestVariantSetStatus: "generated",
      activeVariantId: null,
      searchParams: { get: () => null },
      setActiveVariantId: (variantId) => {
        activeVariantCalls.push(variantId);
      },
      refreshGeneratedState: (sceneId) => {
        refreshCalls.push(sceneId);
      },
    }),
  );

  await waitFor(() => assert.equal(startRunCalls.length, 1));
  assert.equal(cacheReadCalls.length, 1);
  assert.equal(apiReadCalls.length, 1);
  assert.equal(cacheWriteCalls.length, 2);
  assert.deepEqual(activeVariantCalls, ["variant-10"]);
  assert.deepEqual(refreshCalls, ["scene-1"]);
  assert.deepEqual(hydrateCalls, [
    { sceneId: "scene-1", variantSetId: "variant-set-1", activeVariantId: "variant-10" },
  ]);
});

