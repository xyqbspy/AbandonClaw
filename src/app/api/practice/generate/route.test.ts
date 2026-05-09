import assert from "node:assert/strict";
import test from "node:test";
import { AuthError, DailyQuotaExceededError } from "@/lib/server/errors";
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

const quotaOk = {
  reserveHighCostUsage: async () =>
    ({
      userId: "user-1",
      usageDate: "2026-05-09",
      capability: "practice_generate",
      limitCount: 20,
    }) as never,
  markHighCostUsage: async () => {},
};

const fallbackExercise = {
  id: "fallback-1",
  type: "typing",
  prompt: "p",
  answer: { text: "a" },
};

const createHugeScene = () => ({
  ...sampleScene,
  sections: Array.from({ length: 13 }, (_, index) => ({
    id: `sec-${index + 1}`,
    blocks: sampleScene.sections[0].blocks,
  })),
});

test("practice generate handler 会拒绝未登录请求", async () => {
  clearRateLimitStore();
  const response = await handlePracticeGeneratePost(createJsonRequest({ scene: sampleScene }), {
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    callGlmChatCompletion: async () => "",
    buildExerciseSpecsFromScene: () => [] as never,
    ...quotaOk,
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(typeof body.requestId, "string");
});

test("practice generate handler 超过短窗口限流时返回 requestId", async () => {
  clearRateLimitStore();
  const dependencies = {
    requireCurrentProfile: async () => ({ user: { id: "rate-user-1" }, profile: {} } as never),
    callGlmChatCompletion: async () => {
      throw new Error("skip model");
    },
    buildExerciseSpecsFromScene: () => [fallbackExercise] as never,
    ...quotaOk,
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

test("practice generate handler 在 daily quota 超额时不会调用模型", async () => {
  clearRateLimitStore();
  let modelCalled = false;
  const response = await handlePracticeGeneratePost(
    createJsonRequest({ scene: sampleScene, exerciseCount: 4 }),
    {
      requireCurrentProfile: async () => ({ user: { id: "quota-user-1" }, profile: {} } as never),
      callGlmChatCompletion: async () => {
        modelCalled = true;
        return "";
      },
      buildExerciseSpecsFromScene: () => [] as never,
      reserveHighCostUsage: async () => {
        throw new DailyQuotaExceededError("Daily quota exceeded.");
      },
      markHighCostUsage: async () => {},
    },
  );

  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.code, "DAILY_QUOTA_EXCEEDED");
  assert.equal(modelCalled, false);
});

test("practice generate handler 参数校验失败不会预占 daily quota", async () => {
  clearRateLimitStore();
  let reserveCalled = false;
  const response = await handlePracticeGeneratePost(
    createJsonRequest({ scene: createHugeScene(), exerciseCount: 4 }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      callGlmChatCompletion: async () => "",
      buildExerciseSpecsFromScene: () => [] as never,
      reserveHighCostUsage: async () => {
        reserveCalled = true;
        return quotaOk.reserveHighCostUsage();
      },
      markHighCostUsage: async () => {},
    },
  );

  assert.equal(response.status, 400);
  assert.equal(reserveCalled, false);
});

test("practice generate handler 模型结果不合法时会回退并标记 failed", async () => {
  clearRateLimitStore();
  let fallbackArgs: unknown[] = [];
  const marks: string[] = [];
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
        return [fallbackExercise] as never;
      }) as never,
      reserveHighCostUsage: quotaOk.reserveHighCostUsage,
      markHighCostUsage: async (_reservation, status) => {
        marks.push(status);
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    version: "v1",
    generationSource: "system",
    exercises: [fallbackExercise],
  });
  assert.deepEqual(fallbackArgs, [sampleScene, 4]);
  assert.deepEqual(marks, ["failed"]);
});

test("practice generate handler 会拒绝超大 scene", async () => {
  clearRateLimitStore();
  const response = await handlePracticeGeneratePost(
    createJsonRequest({ scene: createHugeScene(), exerciseCount: 4 }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      callGlmChatCompletion: async () => "",
      buildExerciseSpecsFromScene: () => [] as never,
      ...quotaOk,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});

test("practice generate handler 模型请求失败时会回退并标记 failed", async () => {
  clearRateLimitStore();
  const marks: string[] = [];
  const response = await handlePracticeGeneratePost(
    createJsonRequest({ scene: sampleScene, exerciseCount: 4 }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      callGlmChatCompletion: async () => {
        throw new Error("GLM request timed out.");
      },
      buildExerciseSpecsFromScene: () => [fallbackExercise] as never,
      reserveHighCostUsage: quotaOk.reserveHighCostUsage,
      markHighCostUsage: async (_reservation, status) => {
        marks.push(status);
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    version: "v1",
    generationSource: "system",
    exercises: [fallbackExercise],
  });
  assert.deepEqual(marks, ["failed"]);
});
