import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const mockedModules = {
  "@/lib/server/auth": {
    requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
  },
  "@/lib/server/scene/service": {
    listScenes: async () => [
      {
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting（日常问候）",
        subtitle: "学会最基础的问候、回应和结束对话",
        level: "L0",
        category: "starter",
        subcategory: "greeting",
        difficulty: "Beginner",
        estimatedMinutes: 5,
        learningGoal: "学会最基础的问候、回应和结束对话",
        tags: ["pack:start-here", "starter", "greeting", "daily"],
        sentenceCount: 8,
        sceneType: "dialogue" as const,
        sourceType: "builtin" as const,
        isStarter: true,
        isFeatured: true,
        sortOrder: 101,
        createdAt: "2026-05-14T00:00:00.000Z",
        variantLinks: [],
        learningStatus: "not_started" as const,
        progressPercent: 0,
        lastViewedAt: null,
      },
    ],
  },
  "@/lib/server/api-error": {
    toApiErrorResponse: () => new Response("error", { status: 500 }),
  },
};

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

test.after(() => {
  nodeModule.Module.prototype.require = originalRequire;
});

test("GET /api/scenes 会返回 starter scene 的扩展元字段", async () => {
  const modulePath = localRequire.resolve("./route");
  delete localRequire.cache[modulePath];
  const route = localRequire("./route") as {
    GET: () => Promise<Response>;
  };

  const response = await route.GET();
  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    scenes: Array<Record<string, unknown>>;
  };
  assert.equal(body.scenes.length, 1);
  assert.deepEqual(body.scenes[0], {
    id: "scene-1",
    slug: "daily-greeting",
    title: "Daily Greeting（日常问候）",
    subtitle: "学会最基础的问候、回应和结束对话",
    level: "L0",
    category: "starter",
    subcategory: "greeting",
    difficulty: "Beginner",
    estimatedMinutes: 5,
    learningGoal: "学会最基础的问候、回应和结束对话",
    tags: ["pack:start-here", "starter", "greeting", "daily"],
    sentenceCount: 8,
    sceneType: "dialogue",
    sourceType: "builtin",
    isStarter: true,
    isFeatured: true,
    sortOrder: 101,
    createdAt: "2026-05-14T00:00:00.000Z",
    variantLinks: [],
    learningStatus: "not_started",
    progressPercent: 0,
    lastViewedAt: null,
  });
});
