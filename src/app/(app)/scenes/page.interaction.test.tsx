import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const routerPushCalls: string[] = [];

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
];

const mockedModules = {
  "next/navigation": {
    useRouter: () => ({
      push: (href: string) => {
        routerPushCalls.push(href);
      },
    }),
  },
  "sonner": {
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
    setSceneListCache: async () => undefined,
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
  ScenesPageModule = null;
});

test("ScenesPage 点击场景卡片时会显示进入中的覆盖态", async () => {
  const ScenesPage = getScenesPage();
  render(<ScenesPage />);

  await screen.findByText("Coffee Chat");
  fireEvent.click(screen.getByText("Coffee Chat"));

  assert.equal(routerPushCalls.at(-1), "/scene/coffee-chat");
  await waitFor(() => {
    screen.getByText("进入场景中...");
  });
});
