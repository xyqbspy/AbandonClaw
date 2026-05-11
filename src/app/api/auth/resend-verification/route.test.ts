import assert from "node:assert/strict";
import test from "node:test";
import { ValidationError } from "@/lib/server/errors";
import { handleResendVerificationPost } from "./route";

const createRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/auth/resend-verification", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });

test("resend verification route sends email with project callback", async () => {
  let payload: { email: string; emailRedirectTo: string } | null = null;

  const response = await handleResendVerificationPost(
    createRequest({ email: "user@example.com" }),
    {
      assertAllowedOrigin: () => {},
      parseJsonBody: async () => ({ email: "user@example.com" }),
      resendSignupVerificationEmail: async (nextPayload) => {
        payload = nextPayload;
        return { email: "user@example.com" };
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body, { email: "user@example.com" });
  assert.deepEqual(payload, {
    email: "user@example.com",
    emailRedirectTo: "http://localhost/auth/callback?next=%2Fscenes",
  });
});

test("resend verification route returns controlled validation failure", async () => {
  let resendCalled = false;

  const response = await handleResendVerificationPost(
    createRequest({ email: "" }),
    {
      assertAllowedOrigin: () => {},
      parseJsonBody: async () => ({ email: "" }),
      resendSignupVerificationEmail: async () => {
        resendCalled = true;
        throw new ValidationError("email is required.");
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(resendCalled, true);
});
