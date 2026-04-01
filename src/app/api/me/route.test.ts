import assert from "node:assert/strict";
import test from "node:test";
import { handleMeGet } from "./route";

test("/api/me 会复用已获取 user 查询 profile", async () => {
  const user = { id: "user-1", email: "user@example.com" } as never;
  let profileLookupArg: unknown = null;
  const response = await handleMeGet({
    getCurrentSession: async () => ({ user }) as never,
    getCurrentUser: async () => user,
    getCurrentProfileForUser: async (receivedUser) => {
      profileLookupArg = receivedUser;
      return { id: "user-1", username: "alice" } as never;
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    user,
    profile: { id: "user-1", username: "alice" },
  });
  assert.equal(profileLookupArg, user);
});

test("/api/me 在无会话时返回空 user/profile", async () => {
  const response = await handleMeGet({
    getCurrentSession: async () => null,
    getCurrentUser: async () => null,
    getCurrentProfileForUser: async () => {
      throw new Error("should not be called");
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: null, profile: null });
});
