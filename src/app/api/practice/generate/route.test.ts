import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "@/lib/server/errors";
import { handlePracticeGeneratePost } from "./route";

const sampleScene = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  type: "monologue",
  sections: [
    {
      id: "sec-1",
      blocks: [
        {
          id: "blk-1",
          type: "monologue",
          sentences: [
            {
              id: "s1",
              text: "I am running on empty.",
              chunks: [
                {
                  id: "chunk-1",
                  key: "chunk-1",
                  text: "running on empty",
                  start: 5,
                  end: 21,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const;

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/practice/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("practice generate handler 会拒绝未登录请求", async () => {
  const response = await handlePracticeGeneratePost(createJsonRequest({ scene: sampleScene }), {
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    callGlmChatCompletion: async () => "",
    buildExerciseSpecsFromScene: () => [] as never,
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "Unauthorized",
    code: "AUTH_UNAUTHORIZED",
    details: null,
  });
});

test("practice generate handler 在模型结果不合法时会回退到本地 exercise 构建", async () => {
  let fallbackArgs: unknown[] = [];
  const response = await handlePracticeGeneratePost(
    createJsonRequest({ scene: sampleScene, exerciseCount: 4 }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      callGlmChatCompletion: async () =>
        JSON.stringify({
          version: "v1",
          exercises: [{ id: "bad-1", type: "unknown", prompt: "p", answer: { text: "a" } }],
        }),
      buildExerciseSpecsFromScene: ((scene, count) => {
        fallbackArgs = [scene, count];
        return [{ id: "fallback-1", type: "typing", prompt: "p", answer: { text: "a" } }] as never;
      }) as never,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    version: "v1",
    exercises: [{ id: "fallback-1", type: "typing", prompt: "p", answer: { text: "a" } }],
  });
  assert.deepEqual(fallbackArgs, [sampleScene, 4]);
});
