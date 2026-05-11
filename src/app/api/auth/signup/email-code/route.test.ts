import assert from "node:assert/strict";
import test from "node:test";
import { RateLimitError, ValidationError } from "@/lib/server/errors";
import { handleSignupEmailCodePost } from "./route";

const createRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/auth/signup/email-code", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });

test("signup email code route sends code after guardrails", async () => {
  const order: string[] = [];

  const response = await handleSignupEmailCodePost(
    createRequest({ email: "user@example.com" }),
    {
      assertAllowedOrigin: () => {
        order.push("origin");
      },
      parseJsonBody: async () => {
        order.push("parse");
        return { email: "user@example.com" };
      },
      getEffectiveRegistrationMode: async () => {
        order.push("mode");
        return { mode: "open", source: "runtime", updatedBy: null, updatedAt: null };
      },
      enforceRegistrationIpRateLimit: async () => {
        order.push("rate-limit");
      },
      issueSignupEmailCode: async () => {
        order.push("issue");
        return { id: "code-1", email: "user@example.com", expiresInSeconds: 600 };
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(order, ["origin", "parse", "mode", "rate-limit", "issue"]);
  assert.deepEqual(body, { email: "user@example.com", expiresInSeconds: 600 });
});

test("signup email code route returns controlled validation failure", async () => {
  const response = await handleSignupEmailCodePost(
    createRequest({ email: "" }),
    {
      assertAllowedOrigin: () => {},
      parseJsonBody: async () => ({ email: "" }),
      getEffectiveRegistrationMode: async () => ({
        mode: "open",
        source: "runtime",
        updatedBy: null,
        updatedAt: null,
      }),
      enforceRegistrationIpRateLimit: async () => {},
      issueSignupEmailCode: async () => {
        throw new ValidationError("email is required.");
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("signup email code route returns 429 for rate limit", async () => {
  const response = await handleSignupEmailCodePost(
    createRequest({ email: "user@example.com" }),
    {
      assertAllowedOrigin: () => {},
      parseJsonBody: async () => ({ email: "user@example.com" }),
      getEffectiveRegistrationMode: async () => ({
        mode: "open",
        source: "runtime",
        updatedBy: null,
        updatedAt: null,
      }),
      enforceRegistrationIpRateLimit: async () => {
        throw new RateLimitError(60);
      },
      issueSignupEmailCode: async () => {
        throw new Error("should not send code");
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.code, "RATE_LIMITED");
});

test("signup email code route rejects closed registration before sending", async () => {
  let sendCalled = false;

  const response = await handleSignupEmailCodePost(
    createRequest({ email: "user@example.com" }),
    {
      assertAllowedOrigin: () => {},
      parseJsonBody: async () => ({ email: "user@example.com" }),
      getEffectiveRegistrationMode: async () => ({
        mode: "closed",
        source: "runtime",
        updatedBy: null,
        updatedAt: null,
      }),
      enforceRegistrationIpRateLimit: async () => {
        throw new Error("should not rate limit closed signup");
      },
      issueSignupEmailCode: async () => {
        sendCalled = true;
        return { id: "code-1", email: "user@example.com", expiresInSeconds: 600 };
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(sendCalled, false);
});
