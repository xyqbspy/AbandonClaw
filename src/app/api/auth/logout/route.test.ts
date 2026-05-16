import assert from "node:assert/strict";
import test from "node:test";
import { handleLogoutPost } from "./route";

const createRequest = () =>
  new Request("http://localhost/api/auth/logout", { method: "POST" });

test("logout handler 在 signOut 成功时返回 ok", async () => {
  const response = await handleLogoutPost(createRequest(), {
    createSupabaseServerClient: (async () =>
      ({
        auth: {
          signOut: async () => ({ error: null }),
        },
      }) as never) as never,
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { ok: true });
});

test("logout handler 在 Supabase signOut 失败时返回 401 AUTH_UNAUTHORIZED", async () => {
  const response = await handleLogoutPost(createRequest(), {
    createSupabaseServerClient: (async () =>
      ({
        auth: {
          signOut: async () => ({ error: { message: "session expired" } }),
        },
      }) as never) as never,
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(body.error, "session expired");
  assert.equal(typeof body.requestId, "string");
});
