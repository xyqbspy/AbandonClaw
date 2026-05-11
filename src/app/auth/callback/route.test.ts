import assert from "node:assert/strict";
import test from "node:test";
import { handleAuthCallback } from "./route";

test("auth callback exchanges code and redirects to safe target", async () => {
  let exchangedCode: string | null = null;

  const response = await handleAuthCallback(
    new Request("http://localhost/auth/callback?code=abc&next=/today"),
    {
      createSupabaseServerClient: async () =>
        ({
          auth: {
            exchangeCodeForSession: async (code: string) => {
              exchangedCode = code;
              return { error: null };
            },
          },
        }) as never,
    },
  );

  assert.equal(exchangedCode, "abc");
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/today");
});

test("auth callback rejects missing code and unsafe redirect target", async () => {
  const response = await handleAuthCallback(
    new Request("http://localhost/auth/callback?next=//evil.example"),
    {
      createSupabaseServerClient: async () => {
        throw new Error("should not exchange missing code");
      },
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/verify-email?error=callback");
});

test("auth callback redirects to controlled failure when exchange fails", async () => {
  const response = await handleAuthCallback(
    new Request("http://localhost/auth/callback?code=abc&next=/today"),
    {
      createSupabaseServerClient: async () =>
        ({
          auth: {
            exchangeCodeForSession: async () => ({ error: { message: "invalid code" } }),
          },
        }) as never,
    },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/verify-email?error=callback");
});
