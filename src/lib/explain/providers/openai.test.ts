import assert from "node:assert/strict";
import test from "node:test";
import { explainWithOpenAI } from "./openai";

const originalApiKey = process.env.OPENAI_API_KEY;

test.afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey;
});

const payload = {
  selectedText: "running on empty",
  sourceSentence: "I am running on empty.",
  lessonId: "lesson-1",
  lessonTitle: "Lesson 1",
  lessonDifficulty: "easy",
};

test("openai explain provider 会在超时时返回可预测错误", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  await assert.rejects(
    () =>
      explainWithOpenAI(payload as never, {
        fetch: async () => {
          throw new DOMException("aborted", "AbortError");
        },
      }),
    /OpenAI request timed out\./,
  );
});

test("openai explain provider 会收敛非 2xx 状态", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  await assert.rejects(
    () =>
      explainWithOpenAI(payload as never, {
        fetch: async () => new Response("bad", { status: 503 }),
      }),
    /OpenAI request failed with status 503\./,
  );
});

test("openai explain provider 会拒绝空响应内容", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  await assert.rejects(
    () =>
      explainWithOpenAI(payload as never, {
        fetch: async () =>
          new Response(JSON.stringify({ output_text: "" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      }),
    /OpenAI response content is empty\./,
  );
});
