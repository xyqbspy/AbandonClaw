import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "@/lib/server/errors";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
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
  clearRateLimitStore();
  const response = await handlePracticeGeneratePost(createJsonRequest({ scene: sampleScene }), {
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    callGlmChatCompletion: async () => "",
    buildExerciseSpecsFromScene: () => [] as never,
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(typeof body.requestId, "string");
});

test("practice generate handler returns requestId when user rate limit is exceeded", async () => {
  clearRateLimitStore();
  const dependencies = {
    requireCurrentProfile: async () => ({ user: { id: "rate-user-1" }, profile: {} } as never),
    callGlmChatCompletion: async () => {
      throw new Error("skip model");
    },
    buildExerciseSpecsFromScene: () =>
      [{ id: "fallback-1", type: "typing", prompt: "p", answer: { text: "a" } }] as never,
  };

  for (let index = 0; index < 5; index += 1) {
    const okResponse = await handlePracticeGeneratePost(
      createJsonRequest({ scene: sampleScene }),
      dependencies,
    );
    assert.equal(okResponse.status, 200);
  }

  const response = await handlePracticeGeneratePost(
    createJsonRequest({ scene: sampleScene }),
    dependencies,
  );
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(body.code, "RATE_LIMITED");
  assert.equal(typeof body.requestId, "string");
});

test("practice generate handler 在模型结果不合法时会回退到本地 exercise 构建", async () => {
  clearRateLimitStore();
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
      buildExerciseSpecsFromScene: ((scene: unknown, count: unknown) => {
        fallbackArgs = [scene, count];
        return [{ id: "fallback-1", type: "typing", prompt: "p", answer: { text: "a" } }] as never;
      }) as never,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    version: "v1",
    generationSource: "system",
    exercises: [{ id: "fallback-1", type: "typing", prompt: "p", answer: { text: "a" } }],
  });
  assert.deepEqual(fallbackArgs, [sampleScene, 4]);
});

test("practice generate handler 会拒绝超大 scene", async () => {
  clearRateLimitStore();
  const hugeScene = {
    ...sampleScene,
    sections: Array.from({ length: 13 }, (_, index) => ({
      id: `sec-${index + 1}`,
      blocks: sampleScene.sections[0].blocks,
    })),
  };

  const response = await handlePracticeGeneratePost(
    createJsonRequest({ scene: hugeScene, exerciseCount: 4 }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      callGlmChatCompletion: async () => "",
      buildExerciseSpecsFromScene: () => [] as never,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});

test("practice generate handler 在模型请求失败时也会回退到本地 exercise 构建", async () => {
  clearRateLimitStore();
  const response = await handlePracticeGeneratePost(
    createJsonRequest({ scene: sampleScene, exerciseCount: 4 }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      callGlmChatCompletion: async () => {
        throw new Error("GLM request timed out.");
      },
      buildExerciseSpecsFromScene: () =>
        [{ id: "fallback-1", type: "typing", prompt: "p", answer: { text: "a" } }] as never,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    version: "v1",
    generationSource: "system",
    exercises: [{ id: "fallback-1", type: "typing", prompt: "p", answer: { text: "a" } }],
  });
});
