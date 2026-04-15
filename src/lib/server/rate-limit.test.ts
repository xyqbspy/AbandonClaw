import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { RateLimitError } from "@/lib/server/errors";
import { clearRateLimitStore, enforceRateLimit } from "./rate-limit";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

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
