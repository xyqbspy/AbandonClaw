import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { SceneListCacheRecord } from "@/lib/cache/scene-list-cache";
import type { SceneListItemResponse } from "@/lib/utils/scenes-api";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");
const buildSceneListCacheRecord = (data: SceneListItemResponse[]): SceneListCacheRecord => ({
  schemaVersion: "scene-list-cache-v1",
  key: "scene-list:default",
  type: "scene_list",
  data,
  cachedAt: 1,
  lastAccessedAt: 1,
  expiresAt: Number.MAX_SAFE_INTEGER,
});

const routerPushCalls: string[] = [];
const routerPrefetchCalls: string[] = [];
const detailPrefetchCalls: string[] = [];
const getScenesCallOptions: Array<{ noStore?: boolean } | undefined> = [];
let clearSceneListCacheCalls = 0;
let importSceneCalls = 0;
let deleteSceneCalls = 0;
let generatedSceneCalls = 0;
let importSceneError: Error | null = null;
let deleteSceneError: Error | null = null;
let getScenesFromApiImpl: (options?: { noStore?: boolean }) => Promise<SceneListItemResponse[]> = async (
  options?: { noStore?: boolean },
) => {
  getScenesCallOptions.push(options);
  return sceneList;
};
let getSceneListCacheImpl: () => Promise<{
  found: boolean;
  isExpired: boolean;
  record: SceneListCacheRecord | null;
}> = async () => ({ found: false, isExpired: false, record: null });
let getSceneListCacheSnapshotSyncImpl: () => {
  found: boolean;
  isExpired: boolean;
  record: SceneListCacheRecord | null;
} = () => ({ found: false, isExpired: false, record: null });
let detailPrefetchImpl = async (slug: string) => {
  detailPrefetchCalls.push(slug);
  return true;
};

const sceneList: SceneListItemResponse[] = [
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
    createdAt: "2026-03-31T00:00:00.000Z",
    variantLinks: [],
    lastViewedAt: null,
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
    createdAt: "2026-03-31T00:00:00.000Z",
    variantLinks: [],
    lastViewedAt: "2026-03-31T08:00:00.000Z",
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
    GenerateSceneSheet: ({
      open,
      onGenerated,
    }: {
      open: boolean;
      onGenerated: (scene: { slug: string; title: string }) => Promise<void> | void;
    }) =>
      open
        ? (
            <button
              type="button"
              onClick={() => {
                generatedSceneCalls += 1;
                void onGenerated({
                  slug: "generated-scene",
                  title: "Generated Scene",
                });
              }}
            >
              触发生成成功
            </button>
          )
        : null,
  },
  "@/lib/utils/scenes-api": {
    getScenesFromApi: async (options?: { noStore?: boolean }) => getScenesFromApiImpl(options),
    importSceneFromApi: async () => {
      importSceneCalls += 1;
      if (importSceneError) throw importSceneError;
    },
    deleteSceneBySlugFromApi: async () => {
      deleteSceneCalls += 1;
      if (deleteSceneError) throw deleteSceneError;
    },
  },
  "@/lib/cache/scene-list-cache": {
    clearSceneListCache: async () => {
      clearSceneListCacheCalls += 1;
    },
    getSceneListCache: async () => getSceneListCacheImpl(),
    getSceneListCacheSnapshotSync: () => getSceneListCacheSnapshotSyncImpl(),
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
  getScenesCallOptions.length = 0;
  clearSceneListCacheCalls = 0;
  importSceneCalls = 0;
  deleteSceneCalls = 0;
  generatedSceneCalls = 0;
  importSceneError = null;
  deleteSceneError = null;
  getScenesFromApiImpl = async (options?: { noStore?: boolean }) => {
    getScenesCallOptions.push(options);
    return sceneList;
  };
  getSceneListCacheImpl = async () => ({ found: false, isExpired: false, record: null });
  getSceneListCacheSnapshotSyncImpl = () => ({ found: false, isExpired: false, record: null });
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

test("ScenesPage 命中新鲜缓存后仍会继续走网络刷新", async () => {
  let resolveNetwork: (() => void) | null = null;
  getSceneListCacheImpl = async () => ({
    found: true,
    isExpired: false,
    record: buildSceneListCacheRecord([
      {
        ...sceneList[0],
        title: "Cached Coffee Chat",
      },
    ]),
  });
  getScenesFromApiImpl = async (options?: { noStore?: boolean }) => {
    getScenesCallOptions.push(options);
    await new Promise<void>((resolve) => {
      resolveNetwork = resolve;
    });
    return sceneList;
  };

  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  await screen.findByText("Cached Coffee Chat");

  await waitFor(() => {
    assert.equal(getScenesCallOptions.length >= 1, true);
  });

  if (!resolveNetwork) {
    throw new Error("resolveNetwork was not initialized");
  }
  const finishNetwork: () => void = resolveNetwork;
  finishNetwork();

  await waitFor(() => {
    screen.getByText("Coffee Chat");
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

test("ScenesPage 会处理尾斜杠路径的下拉刷新并强制走网络请求", async () => {
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  await screen.findByText("Coffee Chat");

  const refreshDetail = {
    pathname: "/scenes/",
    handled: false,
  };
  window.dispatchEvent(new CustomEvent("app:pull-refresh", { detail: refreshDetail }));

  await waitFor(() => {
    assert.equal(refreshDetail.handled, true);
    assert.equal(clearSceneListCacheCalls, 1);
    assert.equal(
      getScenesCallOptions.some((options) => options?.noStore === true),
      true,
    );
  });
});

test("ScenesPage 导入成功后会清缓存并强制重新拉取列表", async () => {
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  await screen.findByText("Coffee Chat");
  getScenesCallOptions.length = 0;

  fireEvent.click(screen.getByRole("button", { name: "导入自定义" }));

  const textarea = await screen.findByLabelText("场景文本");
  fireEvent.change(textarea, {
    target: { value: "A: Are we still on for dinner?\nB: Something came up." },
  });
  fireEvent.click(screen.getByRole("button", { name: "导入场景" }));

  await waitFor(() => {
    assert.equal(importSceneCalls, 1);
    assert.equal(clearSceneListCacheCalls, 1);
    assert.equal(
      getScenesCallOptions.some((options) => options?.noStore === true),
      true,
    );
  });
});

test("ScenesPage 删除成功后会清缓存并强制重新拉取列表", async () => {
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  const importedCard = (await screen.findByText("Imported Scene")).closest("article");
  assert.ok(importedCard instanceof HTMLElement);
  getScenesCallOptions.length = 0;

  fireEvent.pointerDown(importedCard, {
    button: 0,
    clientX: 220,
    clientY: 40,
    pointerId: 1,
    pointerType: "touch",
  });
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
  const deleteModal = document.querySelector("[data-delete-modal='true']");
  assert.ok(deleteModal instanceof HTMLElement);
  fireEvent.click(within(deleteModal).getByRole("button", { name: "删除" }));

  await waitFor(() => {
    assert.equal(deleteSceneCalls, 1);
    assert.equal(clearSceneListCacheCalls, 1);
    assert.equal(
      getScenesCallOptions.some((options) => options?.noStore === true),
      true,
    );
  });
});

test("ScenesPage 生成成功后会清缓存并强制重新拉取列表", async () => {
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  await screen.findByText("Coffee Chat");
  getScenesCallOptions.length = 0;

  fireEvent.click(screen.getByRole("button", { name: "生成场景" }));
  fireEvent.click(await screen.findByRole("button", { name: "触发生成成功" }));

  await waitFor(() => {
    assert.equal(generatedSceneCalls, 1);
    assert.equal(clearSceneListCacheCalls, 1);
    assert.equal(
      getScenesCallOptions.some((options) => options?.noStore === true),
      true,
    );
  });
});

test("ScenesPage 导入失败时不会误清缓存或强制刷新列表", async () => {
  importSceneError = new Error("import failed");
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  await screen.findByText("Coffee Chat");
  getScenesCallOptions.length = 0;

  fireEvent.click(screen.getByRole("button", { name: "导入自定义" }));
  const textarea = await screen.findByLabelText("场景文本");
  fireEvent.change(textarea, {
    target: { value: "A: failed import" },
  });
  fireEvent.click(screen.getByRole("button", { name: "导入场景" }));

  await waitFor(() => {
    assert.equal(importSceneCalls, 1);
    assert.equal(clearSceneListCacheCalls, 0);
    assert.deepEqual(getScenesCallOptions, []);
  });
});

test("ScenesPage 删除失败时不会误清缓存或强制刷新列表", async () => {
  deleteSceneError = new Error("delete failed");
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  const importedCard = (await screen.findByText("Imported Scene")).closest("article");
  assert.ok(importedCard instanceof HTMLElement);
  getScenesCallOptions.length = 0;

  fireEvent.pointerDown(importedCard, {
    button: 0,
    clientX: 220,
    clientY: 40,
    pointerId: 1,
    pointerType: "touch",
  });
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
  const deleteModal = document.querySelector("[data-delete-modal='true']");
  assert.ok(deleteModal instanceof HTMLElement);
  fireEvent.click(within(deleteModal).getByRole("button", { name: "删除" }));

  await waitFor(() => {
    assert.equal(deleteSceneCalls, 1);
    assert.equal(clearSceneListCacheCalls, 0);
    assert.deepEqual(getScenesCallOptions, []);
  });
});
