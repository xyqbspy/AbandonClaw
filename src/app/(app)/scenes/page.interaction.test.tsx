import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const routerPushCalls: string[] = [];
const routerPrefetchCalls: string[] = [];
const detailPrefetchCalls: string[] = [];
let detailPrefetchImpl = async (slug: string) => {
  detailPrefetchCalls.push(slug);
  return true;
};

const sceneList = [
  {
    id: "scene-1",
    slug: "coffee-chat",
    title: "Coffee Chat",
    subtitle: "subtitle",
    difficulty: "Beginner" as const,
    estimatedMinutes: 5,
    sentenceCount: 6,
    sceneType: "dialogue" as const,
    learningStatus: "not_started" as const,
    progressPercent: 0,
    sourceType: "builtin" as const,
    variantLinks: [],
  },
  {
    id: "scene-2",
    slug: "imported-scene",
    title: "Imported Scene",
    subtitle: "imported subtitle",
    difficulty: "Intermediate" as const,
    estimatedMinutes: 7,
    sentenceCount: 5,
    sceneType: "monologue" as const,
    learningStatus: "paused" as const,
    progressPercent: 40,
    sourceType: "imported" as const,
    variantLinks: [],
  },
];

const mockedModules = {
  "next/navigation": {
    useRouter: () => ({
      push: (href: string) => {
        routerPushCalls.push(href);
      },
      prefetch: (href: string) => {
        routerPrefetchCalls.push(href);
        return Promise.resolve();
      },
    }),
  },
  sonner: {
    toast: {
      error: () => undefined,
      success: () => undefined,
      message: () => undefined,
    },
  },
  "@/components/scenes/generate-scene-sheet": {
    GenerateSceneSheet: () => null,
  },
  "@/lib/utils/scenes-api": {
    getScenesFromApi: async () => sceneList,
    importSceneFromApi: async () => undefined,
    deleteSceneBySlugFromApi: async () => undefined,
  },
  "@/lib/cache/scene-list-cache": {
    clearSceneListCache: async () => undefined,
    getSceneListCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneListCacheSnapshotSync: () => ({ found: false, isExpired: false, record: null }),
    setSceneListCache: async () => undefined,
  },
  "@/lib/cache/scene-prefetch": {
    prefetchSceneDetail: (slug: string) => detailPrefetchImpl(slug),
    scheduleScenePrefetch: () => undefined,
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

let ScenesPageModule: React.ComponentType | null = null;

function getScenesPage() {
  if (!ScenesPageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: React.ComponentType;
    };
    ScenesPageModule = imported.default;
  }
  return ScenesPageModule;
}

afterEach(() => {
  cleanup();
  routerPushCalls.length = 0;
  routerPrefetchCalls.length = 0;
  detailPrefetchCalls.length = 0;
  detailPrefetchImpl = async (slug: string) => {
    detailPrefetchCalls.push(slug);
    return true;
  };
  ScenesPageModule = null;
});

test("ScenesPage 点击场景卡片时会显示进入中的覆盖态并预热目标场景", async () => {
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  await screen.findByText("Coffee Chat");
  fireEvent.click(screen.getByText("Coffee Chat"));

  await waitFor(() => {
    screen.getByText("进入场景中...");
  });

  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/coffee-chat");
    assert.equal(routerPrefetchCalls.includes("/scene/coffee-chat"), true);
    assert.equal(detailPrefetchCalls.includes("coffee-chat"), true);
  });
});

test("ScenesPage 点击场景卡片时会给详情预热一个短暂完成窗口再跳转", async () => {
  const ScenesPage = getScenesPage();
  let resolveWarmup: ((value: boolean) => void) | null = null;
  detailPrefetchImpl = (slug: string) => {
    detailPrefetchCalls.push(slug);
    return new Promise<boolean>((resolve) => {
      resolveWarmup = resolve;
    });
  };

  render(<ScenesPage />);

  fireEvent.click(await screen.findByText("Coffee Chat"));

  await waitFor(() => {
    assert.equal(detailPrefetchCalls.includes("coffee-chat"), true);
  });
  assert.equal(routerPushCalls.length, 0);

  if (!resolveWarmup) {
    throw new Error("resolveWarmup was not initialized");
  }
  const finishWarmup: (value: boolean) => void = resolveWarmup;
  finishWarmup(true);

  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/coffee-chat");
  });
});

test("ScenesPage 首屏会立即预热前两个场景详情", async () => {
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  await screen.findByText("Coffee Chat");

  await waitFor(() => {
    assert.equal(detailPrefetchCalls.includes("coffee-chat"), true);
    assert.equal(detailPrefetchCalls.includes("imported-scene"), true);
  });
});

test("ScenesPage 侧滑后点击删除会弹出二次确认弹框", async () => {
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  const importedCard = (await screen.findByText("Imported Scene")).closest("article");
  assert.ok(importedCard instanceof HTMLElement);

  fireEvent.pointerDown(importedCard, {
    button: 0,
    clientX: 220,
    clientY: 40,
    pointerId: 1,
    pointerType: "touch",
  });
  assert.equal(detailPrefetchCalls.includes("imported-scene"), true);
  fireEvent.pointerMove(importedCard, {
    clientX: 120,
    clientY: 42,
    pointerId: 1,
    pointerType: "touch",
  });
  fireEvent.pointerUp(importedCard, {
    clientX: 120,
    clientY: 42,
    pointerId: 1,
    pointerType: "touch",
  });

  const swipeRow = importedCard.closest("[data-swipe-row]");
  assert.ok(swipeRow instanceof HTMLElement);
  fireEvent.click(within(swipeRow).getByRole("button", { name: "删除" }));

  await waitFor(() => {
    screen.getByText("删除场景？");
    screen.getByRole("button", { name: "取消" });
  });
});
