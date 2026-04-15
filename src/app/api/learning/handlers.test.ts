import assert from "node:assert/strict";
import test from "node:test";
import { AuthError, ValidationError } from "@/lib/server/errors";
import { handleContinueLearningGet, handleLearningProgressGet } from "./handlers";
import {
  handleSceneLearningPausePost,
  handleSceneLearningStartPost,
} from "./scenes/[slug]/handlers";

const createRequest = (url: string) => new Request(url);

test("learning continue handler 会透传 userId 并返回 continueLearning", async () => {
  let receivedUserId: string | null = null;
  const response = await handleContinueLearningGet({
    requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
    getContinueLearningScene: async (userId) => {
      receivedUserId = userId;
      return { sceneSlug: "scene-1" } as never;
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    continueLearning: { sceneSlug: "scene-1" },
  });
  assert.equal(receivedUserId, "user-1");
});

test("learning continue handler 会透传鉴权错误响应", async () => {
  const response = await handleContinueLearningGet({
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    getContinueLearningScene: async () => null as never,
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(typeof body.requestId, "string");
});

test("learning progress handler 会解析状态与分页参数", async () => {
  let received: Record<string, unknown> | null = null;
  const response = await handleLearningProgressGet(
    createRequest("http://localhost/api/learning/progress?status=paused&page=2&limit=9"),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      listLearningProgress: async (params) => {
        received = params as Record<string, unknown>;
        return { rows: [{ slug: "scene-1" }], total: 1 } as never;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    rows: [{ slug: "scene-1" }],
    total: 1,
  });
  assert.deepEqual(received, {
    userId: "user-1",
    status: "paused",
    page: 2,
    limit: 9,
  });
});

test("learning progress handler 在 status 非法时返回 400 与 requestId", async () => {
  const response = await handleLearningProgressGet(
    createRequest("http://localhost/api/learning/progress?status=done"),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      listLearningProgress: async () => ({ rows: [], total: 0 }) as never,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});

test("scene learning start handler 会透传 userId 与 slug", async () => {
  let received: Record<string, unknown> | null = null;
  const response = await handleSceneLearningStartPost(
    { params: Promise.resolve({ slug: "scene-1" }) },
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      startSceneLearning: async (userId, slug) => {
        received = { userId, slug };
        return { started: true } as never;
      },
      pauseSceneLearning: async () => ({ paused: true }) as never,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { started: true });
  assert.deepEqual(received, { userId: "user-1", slug: "scene-1" });
});

test("scene learning pause handler 会透传 ValidationError 并附带 requestId", async () => {
  const response = await handleSceneLearningPausePost(
    { params: Promise.resolve({ slug: "scene-1" }) },
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      startSceneLearning: async () => ({ started: true }) as never,
      pauseSceneLearning: async () => {
        throw new ValidationError("pauseSceneLearning is not allowed.");
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});
