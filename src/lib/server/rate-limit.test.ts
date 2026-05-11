import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { RateLimitError } from "@/lib/server/errors";
import {
  clearRateLimitStore,
  enforceHighCostRateLimit,
  enforceRegistrationIpRateLimit,
  enforceRateLimit,
  getClientIp,
  getRegistrationIpRateLimitConfig,
  getRateLimitBackendStatus,
} from "./rate-limit";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const originalRegistrationIpLimitMaxAttempts = process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS;
const originalRegistrationIpLimitWindowSeconds = process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS;

afterEach(() => {
  clearRateLimitStore();
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) {
    delete process.env.UPSTASH_REDIS_REST_URL;
  } else {
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  }
  if (originalToken === undefined) {
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  } else {
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  }
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

test("getClientIp 会按可信 header 顺序读取客户端 IP", () => {
  const request = new Request("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "203.0.113.11",
      "cf-connecting-ip": "203.0.113.12",
    },
  });

  assert.equal(getClientIp(request), "203.0.113.10");
});

test("getRegistrationIpRateLimitConfig 会返回保守默认值并支持环境变量覆盖", () => {
  delete process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS;
  delete process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS;
  assert.deepEqual(getRegistrationIpRateLimitConfig(), {
    maxAttempts: 3,
    windowMs: 600_000,
  });

  process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS = "5";
  process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS = "120";
  assert.deepEqual(getRegistrationIpRateLimitConfig(), {
    maxAttempts: 5,
    windowMs: 120_000,
  });
});

test("enforceHighCostRateLimit 会同时按 user 和 IP 限流", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const request = new Request("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": "203.0.113.20",
    },
  });

  await enforceHighCostRateLimit({
    request,
    userId: "user-1",
    scope: "test-high-cost",
    userLimit: 2,
    ipLimit: 1,
    windowMs: 60_000,
  });

  await assert.rejects(
    () =>
      enforceHighCostRateLimit({
        request,
        userId: "user-2",
        scope: "test-high-cost",
        userLimit: 2,
        ipLimit: 1,
        windowMs: 60_000,
      }),
    (error: unknown) => {
      assert.ok(error instanceof RateLimitError);
      return true;
    },
  );
});

test("enforceRegistrationIpRateLimit 会按注册 IP 单独限流", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const request = new Request("http://localhost/api/auth/signup", {
    headers: {
      "x-forwarded-for": "203.0.113.25",
    },
  });

  await enforceRegistrationIpRateLimit(request, {
    maxAttempts: 2,
    windowMs: 60_000,
  });
  await enforceRegistrationIpRateLimit(request, {
    maxAttempts: 2,
    windowMs: 60_000,
  });

  await assert.rejects(
    () =>
      enforceRegistrationIpRateLimit(request, {
        maxAttempts: 2,
        windowMs: 60_000,
      }),
    (error: unknown) => {
      assert.ok(error instanceof RateLimitError);
      return true;
    },
  );
});

test("getRateLimitBackendStatus 会暴露当前限流后端", () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  clearRateLimitStore();

  assert.deepEqual(getRateLimitBackendStatus(), {
    kind: "memory",
    upstashConfigured: false,
  });
});

test("enforceRateLimit 在内存模式下会在超限时抛出 RateLimitError", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  await enforceRateLimit({
    key: "user-1",
    limit: 2,
    windowMs: 60_000,
    now: 1_000,
    scope: "test-memory",
  });
  await enforceRateLimit({
    key: "user-1",
    limit: 2,
    windowMs: 60_000,
    now: 1_100,
    scope: "test-memory",
  });

  await assert.rejects(
    () =>
      enforceRateLimit({
        key: "user-1",
        limit: 2,
        windowMs: 60_000,
        now: 1_200,
        scope: "test-memory",
      }),
    (error: unknown) => {
      assert.ok(error instanceof RateLimitError);
      assert.equal(error.details?.retryAfterSeconds, 60);
      return true;
    },
  );
});

test("enforceRateLimit 在配置 Upstash 时会使用共享限流结果", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";

  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(
      JSON.stringify([
        { result: fetchCount === 1 ? 1 : 3 },
        { result: 42 },
        { result: 1 },
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  await enforceRateLimit({
    key: "user-1",
    limit: 2,
    windowMs: 60_000,
    scope: "test-upstash",
  });

  await assert.rejects(
    () =>
      enforceRateLimit({
        key: "user-1",
        limit: 2,
        windowMs: 60_000,
        scope: "test-upstash",
      }),
    (error: unknown) => {
      assert.ok(error instanceof RateLimitError);
      assert.equal(error.details?.retryAfterSeconds, 42);
      return true;
    },
  );
});

test("enforceRateLimit 在共享存储失败时会回退到内存模式", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";

  globalThis.fetch = (async () => {
    throw new Error("network failed");
  }) as typeof fetch;

  await enforceRateLimit({
    key: "user-1",
    limit: 1,
    windowMs: 60_000,
    now: 1_000,
    scope: "test-fallback",
  });

  await assert.rejects(
    () =>
      enforceRateLimit({
        key: "user-1",
        limit: 1,
        windowMs: 60_000,
        now: 1_200,
        scope: "test-fallback",
      }),
    (error: unknown) => {
      assert.ok(error instanceof RateLimitError);
      assert.equal(error.details?.retryAfterSeconds, 60);
      return true;
    },
  );
});
