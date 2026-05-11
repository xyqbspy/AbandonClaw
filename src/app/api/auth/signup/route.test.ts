import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { RateLimitError } from "@/lib/server/errors";
import { clearRateLimitStore, enforceRegistrationIpRateLimit } from "@/lib/server/rate-limit";
import { handleSignupPost } from "./route";

const originalRegistrationIpLimitMaxAttempts = process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS;
const originalRegistrationIpLimitWindowSeconds = process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS;

const createSignupRequest = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      "x-forwarded-for": "203.0.113.30",
    },
    body: JSON.stringify(body),
  });

afterEach(() => {
  clearRateLimitStore();
  if (originalRegistrationIpLimitMaxAttempts === undefined) {
    delete process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS;
  } else {
    process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS = originalRegistrationIpLimitMaxAttempts;
  }
  if (originalRegistrationIpLimitWindowSeconds === undefined) {
    delete process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS;
  } else {
    process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS = originalRegistrationIpLimitWindowSeconds;
  }
});

test("signup handler 会在 invite 校验和注册前执行 IP 频控", async () => {
  const order: string[] = [];
  let emailRedirectTo: string | undefined;

  const response = await handleSignupPost(
    createSignupRequest({
      email: "user@example.com",
      password: "password123",
      inviteCode: "invite-code",
    }),
    {
      assertAllowedOrigin: () => {
        order.push("origin");
      },
      parseJsonBody: async () => {
        order.push("parse");
        return {
          email: "user@example.com",
          password: "password123",
          inviteCode: "invite-code",
        };
      },
      getEffectiveRegistrationMode: async () => {
        order.push("mode");
        return { mode: "invite_only", source: "runtime", updatedBy: null, updatedAt: null };
      },
      enforceRegistrationIpRateLimit: async () => {
        order.push("rate-limit");
      },
      registerWithEmailPassword: async (payload) => {
        order.push("register");
        emailRedirectTo = payload.emailRedirectTo;
        return {
          userId: "user-1",
          email: "user@example.com",
          mode: "invite_only",
          emailVerificationRequired: true,
        };
      },
    },
  );

  assert.equal(response.status, 201);
  assert.deepEqual(order, ["origin", "parse", "mode", "rate-limit", "register"]);
  assert.equal(emailRedirectTo, "http://localhost/auth/callback?next=%2Fscenes");
});

test("signup handler 命中 IP 频控时返回受控 429 且不会继续注册", async () => {
  let registerCalled = false;

  const response = await handleSignupPost(
    createSignupRequest({
      email: "user@example.com",
      password: "password123",
    }),
    {
      assertAllowedOrigin: () => {},
      parseJsonBody: async () => ({
        email: "user@example.com",
        password: "password123",
      }),
      getEffectiveRegistrationMode: async () => ({
        mode: "open",
        source: "runtime",
        updatedBy: null,
        updatedAt: null,
      }),
      enforceRegistrationIpRateLimit: async () => {
        throw new RateLimitError(60);
      },
      registerWithEmailPassword: async () => {
        registerCalled = true;
        return {
          userId: "user-1",
          email: "user@example.com",
          mode: "open",
          emailVerificationRequired: true,
        };
      },
    },
  );

  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.code, "RATE_LIMITED");
  assert.equal(typeof body.requestId, "string");
  assert.equal(registerCalled, false);
});

test("signup handler 在实际限流配置下会对同一 IP 返回 429", async () => {
  process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS = "2";
  process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS = "600";

  const dependencies = {
    assertAllowedOrigin: (() => {}) as never,
    parseJsonBody: (async () => ({
      email: "user@example.com",
      password: "password123",
    })) as never,
    getEffectiveRegistrationMode: (async () => ({
      mode: "open",
      source: "runtime",
      updatedBy: null,
      updatedAt: null,
    })) as never,
    enforceRegistrationIpRateLimit,
    registerWithEmailPassword: (async () => ({
      userId: "user-1",
      email: "user@example.com",
      mode: "open",
      emailVerificationRequired: true,
    })) as never,
  };

  const request = createSignupRequest({
    email: "user@example.com",
    password: "password123",
  });

  const first = await handleSignupPost(request, dependencies);
  const second = await handleSignupPost(request, dependencies);
  const third = await handleSignupPost(request, dependencies);

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(third.status, 429);
});
