import assert from "node:assert/strict";
import test from "node:test";
import { AuthError, ValidationError } from "@/lib/server/errors";
import { handleDeleteUserPhrase } from "./handlers";

test("delete phrase handler 会裁剪参数并返回 200", async () => {
  let received: { userId: string; userPhraseId: string } | null = null;
  const response = await handleDeleteUserPhrase(
    new Request("http://localhost/api/phrases/phrase-1", { method: "DELETE" }),
    {
      params: Promise.resolve({ userPhraseId: " phrase-1 " }),
    },
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      deleteUserPhraseForUser: async (userId, userPhraseId) => {
        received = { userId, userPhraseId };
        return {
          deletedUserPhraseId: userPhraseId,
          deletedClusterId: "cluster-1",
          clusterDeleted: false,
          nextMainUserPhraseId: "main-2",
          nextFocusUserPhraseId: "main-2",
        };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    deletedUserPhraseId: "phrase-1",
    deletedClusterId: "cluster-1",
    clusterDeleted: false,
    nextMainUserPhraseId: "main-2",
    nextFocusUserPhraseId: "main-2",
  });
  assert.deepEqual(received, { userId: "user-1", userPhraseId: "phrase-1" });
});

test("delete phrase handler 会把 ValidationError 转成 400", async () => {
  const response = await handleDeleteUserPhrase(
    new Request("http://localhost/api/phrases/phrase-1", { method: "DELETE" }),
    {
      params: Promise.resolve({ userPhraseId: "phrase-1" }),
    },
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      deleteUserPhraseForUser: async () => {
        throw new ValidationError("Expression not found.");
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Expression not found.",
    code: "VALIDATION_ERROR",
    details: null,
  });
});

test("delete phrase handler 会把未登录错误转成 401", async () => {
  const response = await handleDeleteUserPhrase(
    new Request("http://localhost/api/phrases/phrase-1", { method: "DELETE" }),
    {
      params: Promise.resolve({ userPhraseId: "phrase-1" }),
    },
    {
      requireCurrentProfile: async () => {
        throw new AuthError();
      },
      deleteUserPhraseForUser: async () => ({ deletedUserPhraseId: "phrase-1" }),
    },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "Unauthorized",
    code: "AUTH_UNAUTHORIZED",
    details: null,
  });
});

test("delete phrase handler 会屏蔽未知服务端错误", async () => {
  const response = await handleDeleteUserPhrase(
    new Request("http://localhost/api/phrases/phrase-1", { method: "DELETE" }),
    {
      params: Promise.resolve({ userPhraseId: "phrase-1" }),
    },
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } }),
      deleteUserPhraseForUser: async () => {
        throw new Error("database exploded");
      },
    },
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "Failed to delete user phrase.",
    code: "INTERNAL_ERROR",
    details: null,
  });
});
