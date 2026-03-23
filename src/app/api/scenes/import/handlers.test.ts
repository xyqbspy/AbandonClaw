import assert from "node:assert/strict";
import test from "node:test";
import { SceneParseError } from "@/lib/server/errors";
import { handleSceneImportPost } from "./handlers";

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/scenes/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("scene import handler 在解析失败时返回 422 和中文友好错误", async () => {
  const logs: unknown[] = [];
  const response = await handleSceneImportPost(
    createJsonRequest({
      sourceText: "This is a long enough source text for importing.",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      parseImportedSceneWithCache: async () => {
        throw new SceneParseError("场景解析失败，请稍后重试，或稍微简化/整理原文后再导入。", {
          stage: "scene_import_retry_failed",
        });
      },
      createImportedScene: async () => {
        throw new Error("should not reach createImportedScene");
      },
      logError: (...args) => {
        logs.push(args);
      },
    },
  );

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: "场景解析失败，请稍后重试，或稍微简化/整理原文后再导入。",
    code: "SCENE_PARSE_ERROR",
    details: {
      stage: "scene_import_retry_failed",
    },
  });
  assert.equal(logs.length, 1);
});

test("scene import handler 会裁剪 title/theme 并把 userId 传给服务层", async () => {
  let parseReceived: Record<string, unknown> | null = null;
  let createReceived: Record<string, unknown> | null = null;
  const parsedScene = {
    id: "scene-1",
    slug: "scene-1",
    title: "Scene 1",
    type: "monologue" as const,
    sections: [
      {
        id: "sec-1",
        blocks: [
          {
            id: "blk-1",
            type: "monologue" as const,
            sentences: [{ id: "s1", text: "Hello.", chunks: [] }],
          },
        ],
      },
    ],
  };

  const response = await handleSceneImportPost(
    createJsonRequest({
      sourceText: " This is a long enough source text for importing. ",
      title: "  Custom Title  ",
      theme: "  travel  ",
      sourceLanguage: "zh",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      parseImportedSceneWithCache: async (params) => {
        parseReceived = params;
        return {
          source: "glm",
          cacheKey: "cache-1",
          cacheStatus: "written",
          parsedScene,
        };
      },
      createImportedScene: async (params) => {
        createReceived = params;
        return { id: "lesson-1", slug: "scene-1", title: "Scene 1" };
      },
      logError: () => {},
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(parseReceived, {
    sourceText: "This is a long enough source text for importing.",
    sourceLanguage: "zh",
    userId: "user-1",
  });
  assert.deepEqual(createReceived, {
    userId: "user-1",
    sourceText: "This is a long enough source text for importing.",
    title: "Custom Title",
    theme: "travel",
    parsedScene,
    model: "glm-4.6",
  });
});
