import assert from "node:assert/strict";
import test from "node:test";
import { handleMeGet } from "./route";

test("/api/me 会复用单次 user 查询读取 profile", async () => {
  const user = { id: "user-1", email: "user@example.com" } as never;
  let getCurrentUserCalls = 0;
  let profileLookupArg: unknown = null;

  const response = await handleMeGet({
    getCurrentUser: async () => {
      getCurrentUserCalls += 1;
      return user;
    },
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
  assert.equal(getCurrentUserCalls, 1);
});

test("/api/me 在无用户时返回空 user/profile", async () => {
  const response = await handleMeGet({
    getCurrentUser: async () => null,
    getCurrentProfileForUser: async () => {
      throw new Error("should not be called");
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: null, profile: null });
});
