import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "@/lib/server/errors";
import { handleExplainSelectionPost } from "./route";

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/explain-selection", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("explain selection handler 会拒绝未登录请求", async () => {
  const response = await handleExplainSelectionPost(createJsonRequest({ selectedText: "hi" }), {
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    explainSelection: async () => ({}) as never,
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "Unauthorized",
    code: "AUTH_UNAUTHORIZED",
    details: null,
  });
});

test("explain selection handler 会透传合法 payload", async () => {
  let receivedPayload: unknown = null;
  const response = await handleExplainSelectionPost(
    createJsonRequest({
      selectedText: "running on empty",
      sourceSentence: "I am running on empty.",
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
    lessonId: "lesson-1",
    lessonTitle: "Lesson 1",
    lessonDifficulty: "easy",
  });
});
