import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "@/lib/server/errors";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import { handleExplainSelectionPost } from "./route";

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/explain-selection", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("explain selection handler 会拒绝未登录请求", async () => {
  clearRateLimitStore();
  const response = await handleExplainSelectionPost(createJsonRequest({ selectedText: "hi" }), {
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    explainSelection: async () => ({}) as never,
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(typeof body.requestId, "string");
});

test("explain selection handler 会透传合法 payload", async () => {
  clearRateLimitStore();
  let receivedPayload: unknown = null;
  const response = await handleExplainSelectionPost(
    createJsonRequest({
      selectedText: "running on empty",
      sourceSentence: "I am running on empty.",
      sourceChunks: ["running on empty", "worn out"],
      lessonId: "lesson-1",
      lessonTitle: "Lesson 1",
      lessonDifficulty: "easy",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      explainSelection: async (payload) => {
        receivedPayload = payload;
        return { chunk: { text: payload.selectedText } } as never;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    chunk: { text: "running on empty" },
  });
  assert.deepEqual(receivedPayload, {
    selectedText: "running on empty",
    sourceSentence: "I am running on empty.",
    sourceTranslation: undefined,
    sourceChunks: ["running on empty", "worn out"],
    lessonId: "lesson-1",
    lessonTitle: "Lesson 1",
    lessonDifficulty: "easy",
  });
});

test("explain selection handler 会拒绝超长输入", async () => {
  clearRateLimitStore();
  const response = await handleExplainSelectionPost(
    createJsonRequest({
      selectedText: "x".repeat(241),
      sourceSentence: "I am running on empty.",
      lessonId: "lesson-1",
      lessonTitle: "Lesson 1",
      lessonDifficulty: "easy",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      explainSelection: async () => ({}) as never,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});
