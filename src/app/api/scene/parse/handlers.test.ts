import assert from "node:assert/strict";
import test from "node:test";
import { SceneParseError } from "@/lib/server/errors";
import { handleSceneParsePost } from "./handlers";

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/scene/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("scene parse handler 在解析失败时返回 422 和中文友好错误", async () => {
  const logs: unknown[] = [];
  const response = await handleSceneParsePost(
    createJsonRequest({
      rawText: "This is a long enough source text for parsing.",
      sourceLanguage: "en",
    }),
    {
      parseImportedSceneWithCache: async () => {
        throw new SceneParseError("场景解析失败，请稍后重试，或稍微简化/整理原文后再导入。", {
          stage: "scene_import_retry_failed",
          parseError: "Extracted JSON candidate is still invalid JSON.",
        });
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
      parseError: "Extracted JSON candidate is still invalid JSON.",
    },
  });
  assert.equal(logs.length, 1);
});

test("scene parse handler 会透传 force=true 给解析服务", async () => {
  let received: Record<string, unknown> | null = null;
  const response = await handleSceneParsePost(
    createJsonRequest({
      rawText: "This is a long enough source text for parsing.",
      sourceLanguage: "mixed",
    }),
    {
      parseImportedSceneWithCache: async (params) => {
        received = params;
        return {
          source: "glm",
          cacheKey: "cache-1",
          cacheStatus: "forced",
          parsedScene: {
            id: "scene-1",
            slug: "scene-1",
            title: "Scene 1",
            type: "monologue",
            sections: [{ id: "sec-1", blocks: [{ id: "blk-1", type: "monologue", sentences: [{ id: "s1", text: "Hello.", chunks: [] }] }] }],
          },
        };
      },
      logError: () => {},
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    sourceText: "This is a long enough source text for parsing.",
    sourceLanguage: "mixed",
    force: true,
  });
});
