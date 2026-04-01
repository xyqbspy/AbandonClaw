import assert from "node:assert/strict";
import test from "node:test";
import { callGlmChatCompletion } from "./glm-client";

const originalApiKey = process.env.GLM_API_KEY;

test.afterEach(() => {
  process.env.GLM_API_KEY = originalApiKey;
});

test("glm client 会在超时时返回可预测错误", async () => {
  process.env.GLM_API_KEY = "test-key";

  await assert.rejects(
    () =>
      callGlmChatCompletion(
        { systemPrompt: "sys", userPrompt: "user" },
        {
          fetch: async () => {
            throw new DOMException("aborted", "AbortError");
          },
        },
      ),
    /GLM request timed out\./,
  );
});

test("glm client 会收敛非 2xx 状态", async () => {
  process.env.GLM_API_KEY = "test-key";

  await assert.rejects(
    () =>
      callGlmChatCompletion(
        { systemPrompt: "sys", userPrompt: "user" },
        {
          fetch: async () => new Response("bad", { status: 502 }),
        },
      ),
    /GLM request failed with status 502\./,
  );
});

test("glm client 会拒绝空响应内容", async () => {
  process.env.GLM_API_KEY = "test-key";

  await assert.rejects(
    () =>
      callGlmChatCompletion(
        { systemPrompt: "sys", userPrompt: "user" },
        {
          fetch: async () =>
            new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
        },
      ),
    /GLM response content is empty\./,
  );
});
