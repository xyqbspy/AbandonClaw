import assert from "node:assert/strict";
import test from "node:test";
import { ValidationError } from "@/lib/server/errors";
import {
  handleDetachExpressionClusterMemberPost,
  handleEnsureExpressionClusterPost,
  handleMoveExpressionClusterMemberPost,
} from "./handlers";

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("move handler 会裁剪入参并返回 200", async () => {
  let received: Record<string, unknown> | null = null;
  const response = await handleMoveExpressionClusterMemberPost(
    createJsonRequest({
      targetClusterId: " cluster-1 ",
      userPhraseId: " phrase-1 ",
      targetMainUserPhraseId: " main-1 ",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      moveExpressionClusterMember: async (params) => {
        received = params;
        return { ok: true };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(received, {
    userId: "user-1",
    targetClusterId: "cluster-1",
    userPhraseId: "phrase-1",
    targetMainUserPhraseId: "main-1",
  });
});

test("move handler 缺少必填字段时返回 400", async () => {
  const response = await handleMoveExpressionClusterMemberPost(
    createJsonRequest({ userPhraseId: "phrase-1" }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      moveExpressionClusterMember: async () => ({ ok: true }),
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "targetClusterId must be a string.",
    code: "VALIDATION_ERROR",
    details: null,
  });
});

test("ensure handler 会裁剪 title 并返回 200", async () => {
  let received: Record<string, unknown> | null = null;
  const response = await handleEnsureExpressionClusterPost(
    createJsonRequest({
      userPhraseId: " phrase-1 ",
      title: " barely slept ",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      ensureExpressionClusterForPhrase: async (params) => {
        received = params;
        return { clusterId: "cluster-1", created: true };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { clusterId: "cluster-1", created: true });
  assert.deepEqual(received, {
    userId: "user-1",
    userPhraseId: "phrase-1",
    title: "barely slept",
  });
});

test("detach handler 默认 createNewCluster=true，并返回 200", async () => {
  let received: Record<string, unknown> | null = null;
  const response = await handleDetachExpressionClusterMemberPost(
    createJsonRequest({
      nextMainUserPhraseId: " next-1 ",
    }),
    {
      params: Promise.resolve({
        clusterId: " cluster-1 ",
        userPhraseId: " phrase-1 ",
      }),
    },
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      detachExpressionClusterMember: async (params) => {
        received = params;
        return { detachedUserPhraseId: "phrase-1" };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { detachedUserPhraseId: "phrase-1" });
  assert.deepEqual(received, {
    userId: "user-1",
    clusterId: "cluster-1",
    userPhraseId: "phrase-1",
    nextMainUserPhraseId: "next-1",
    createNewCluster: true,
  });
});

test("detach handler 会透传 service 的 ValidationError 为 400", async () => {
  const response = await handleDetachExpressionClusterMemberPost(
    createJsonRequest({}),
    {
      params: Promise.resolve({
        clusterId: "cluster-1",
        userPhraseId: "phrase-1",
      }),
    },
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      detachExpressionClusterMember: async () => {
        throw new ValidationError("Cannot detach the only expression in a cluster.");
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Cannot detach the only expression in a cluster.",
    code: "VALIDATION_ERROR",
    details: null,
  });
});
