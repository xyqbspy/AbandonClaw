import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "@/lib/server/errors";
import type { PracticeSet } from "@/lib/types/learning-flow";
import { handleScenePracticeSetGet, handleScenePracticeSetPost } from "./route";

const practiceSet: PracticeSet = {
  id: "practice-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Scene 1",
  sourceType: "original",
  exercises: [
    {
      id: "exercise-1",
      type: "typing",
      inputMode: "typing",
      sceneId: "scene-1",
      sentenceId: "sentence-1",
      prompt: "prompt",
      answer: { text: "answer" },
    },
  ],
  status: "generated",
  createdAt: "2026-03-22T00:00:00.000Z",
};

const createRequest = (body: unknown) =>
  new Request("http://localhost/api/learning/scenes/scene-1/practice/set", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("scene practice set GET 会透传 userId 与 slug 并返回 latest set", async () => {
  let received: Record<string, unknown> | null = null;
  const response = await handleScenePracticeSetGet(
    { params: Promise.resolve({ slug: "scene-1" }) },
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      getLatestScenePracticeSet: async (userId, slug) => {
        received = { userId, slug };
        return { practiceSet } as never;
      },
      saveScenePracticeSet: async () => ({ practiceSet }) as never,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { practiceSet });
  assert.deepEqual(received, { userId: "user-1", slug: "scene-1" });
});

test("scene practice set POST 会校验 payload 并传递 replaceExisting", async () => {
  let received: Record<string, unknown> | null = null;
  const response = await handleScenePracticeSetPost(
    { params: Promise.resolve({ slug: "scene-1" }) },
    createRequest({ practiceSet, replaceExisting: true }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      getLatestScenePracticeSet: async () => ({ practiceSet: null }) as never,
      saveScenePracticeSet: async (userId, slug, payload) => {
        received = { userId, slug, payload };
        return { practiceSet: payload.practiceSet } as never;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { practiceSet });
  assert.deepEqual(received, {
    userId: "user-1",
    slug: "scene-1",
    payload: { practiceSet, replaceExisting: true },
  });
});

test("scene practice set POST 会拒绝非法 practiceSet payload", async () => {
  const response = await handleScenePracticeSetPost(
    { params: Promise.resolve({ slug: "scene-1" }) },
    createRequest({ practiceSet: { id: "practice-1" } }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      getLatestScenePracticeSet: async () => ({ practiceSet: null }) as never,
      saveScenePracticeSet: async () => {
        throw new Error("should not save invalid payload");
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});

test("scene practice set GET 会透传鉴权错误", async () => {
  const response = await handleScenePracticeSetGet(
    { params: Promise.resolve({ slug: "scene-1" }) },
    {
      requireCurrentProfile: async () => {
        throw new AuthError();
      },
      getLatestScenePracticeSet: async () => ({ practiceSet: null }) as never,
      saveScenePracticeSet: async () => ({ practiceSet }) as never,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(typeof body.requestId, "string");
});
