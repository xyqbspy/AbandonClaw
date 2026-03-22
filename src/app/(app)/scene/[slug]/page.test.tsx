import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";

import type { Lesson } from "@/lib/types";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const baseLesson: Lesson = {
  id: "scene-1",
  slug: "test-scene",
  title: "Test Scene",
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sections: [],
  explanations: [],
};

let currentScene: Lesson | null = baseLesson;
let currentUserId = "user-1";
let notFoundCalled = false;
const getSceneBySlugCalls: Array<{ slug: string; userId: string }> = [];

const mockedModules = {
  "next/navigation": {
    notFound: () => {
      notFoundCalled = true;
      throw new Error("NEXT_NOT_FOUND");
    },
  },
  "@/lib/server/auth": {
    requireCurrentProfile: async () => ({ user: { id: currentUserId } }),
  },
  "@/lib/server/scene/service": {
    getSceneBySlug: async ({ slug, userId }: { slug: string; userId: string }) => {
      getSceneBySlugCalls.push({ slug, userId });
      return currentScene;
    },
  },
  "./scene-detail-page": {
    __esModule: true,
    default: ({ initialLesson }: { initialLesson?: Lesson | null }) =>
      React.createElement("div", { "data-testid": "scene-detail-client-page", initialLesson }),
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

let PageModule:
  | ((
      props: { params: Promise<{ slug: string }> },
    ) => Promise<React.ReactElement>)
  | null = null;

function getPageModule() {
  if (!PageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: (props: { params: Promise<{ slug: string }> }) => Promise<React.ReactElement>;
    };
    PageModule = imported.default;
  }
  return PageModule;
}

afterEach(() => {
  currentScene = baseLesson;
  currentUserId = "user-1";
  notFoundCalled = false;
  getSceneBySlugCalls.length = 0;
  PageModule = null;
});

test("Scene page 会把服务端加载的 scene 作为 initialLesson 传给客户端页面", async () => {
  const Page = getPageModule();

  const element = await Page({
    params: Promise.resolve({ slug: "test-scene" }),
  });

  assert.deepEqual(getSceneBySlugCalls, [{ slug: "test-scene", userId: "user-1" }]);
  assert.equal((element.props as { initialLesson: Lesson }).initialLesson.id, "scene-1");
});

test("Scene page 在 scene 不存在时会调用 notFound", async () => {
  currentScene = null;
  const Page = getPageModule();

  await assert.rejects(
    () =>
      Page({
        params: Promise.resolve({ slug: "missing-scene" }),
      }),
    /NEXT_NOT_FOUND/,
  );

  assert.equal(notFoundCalled, true);
  assert.deepEqual(getSceneBySlugCalls, [{ slug: "missing-scene", userId: "user-1" }]);
});
