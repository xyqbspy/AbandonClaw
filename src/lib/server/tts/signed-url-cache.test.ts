import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
  __resetSignedUrlCacheForTests,
  clearCachedSignedUrl,
  getCachedSignedUrl,
  getSignedUrlCacheBackendKind,
  setCachedSignedUrl,
} from "./signed-url-cache";

const originalFetch = globalThis.fetch;
const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const originalConsoleWarn = console.warn;

const restoreUpstashEnv = () => {
  if (originalUpstashUrl === undefined) {
    delete process.env.UPSTASH_REDIS_REST_URL;
  } else {
    process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
  }
  if (originalUpstashToken === undefined) {
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  } else {
    process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
  }
};

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __resetSignedUrlCacheForTests();
  console.warn = () => {};
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalConsoleWarn;
  restoreUpstashEnv();
  __resetSignedUrlCacheForTests();
});

test("UPSTASH 未配置时退化到内存 Map：set → get 命中、TTL 过期后失效", async () => {
  globalThis.fetch = (async () => {
    throw new Error("memory backend should not call fetch");
  }) as typeof fetch;

  assert.equal(getSignedUrlCacheBackendKind(), "memory");

  await setCachedSignedUrl("scenes/a/full.mp3", "https://cdn.test/a.mp3", 60_000);
  assert.equal(await getCachedSignedUrl("scenes/a/full.mp3"), "https://cdn.test/a.mp3");

  // 立即过期：写一个负 TTL 让条目落入 expiresAt 过去
  await setCachedSignedUrl("scenes/b/full.mp3", "https://cdn.test/b.mp3", -1);
  assert.equal(await getCachedSignedUrl("scenes/b/full.mp3"), null);

  await clearCachedSignedUrl("scenes/a/full.mp3");
  assert.equal(await getCachedSignedUrl("scenes/a/full.mp3"), null);
});

test("UPSTASH 已配置时优先走 Redis：GET 命中直接返回，SET 发送 SET … EX", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://upstash.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-xyz";
  __resetSignedUrlCacheForTests();

  const calls: Array<{ command: unknown[]; auth: string | null }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body ?? "[]")) as unknown[];
    calls.push({
      command,
      auth: (init?.headers as Record<string, string> | undefined)?.Authorization ?? null,
    });
    if (command[0] === "GET") {
      return new Response(JSON.stringify({ result: "https://cdn.test/from-redis.mp3" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ result: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  assert.equal(getSignedUrlCacheBackendKind(), "upstash");

  await setCachedSignedUrl("scenes/x/full.mp3", "https://cdn.test/x.mp3", 30_000);
  const setCall = calls.find((entry) => entry.command[0] === "SET");
  assert.ok(setCall, "expected SET command");
  assert.equal(setCall.command[1], "tts:signed-url:scenes/x/full.mp3");
  assert.equal(setCall.command[2], "https://cdn.test/x.mp3");
  assert.equal(setCall.command[3], "EX");
  assert.equal(setCall.command[4], 30); // 30s
  assert.equal(setCall.auth, "Bearer token-xyz");

  const url = await getCachedSignedUrl("scenes/x/full.mp3");
  assert.equal(url, "https://cdn.test/from-redis.mp3");
});

test("UPSTASH GET 失败时退化到内存 fallback Map", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://upstash.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-xyz";
  __resetSignedUrlCacheForTests();

  let getCallCount = 0;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body ?? "[]")) as unknown[];
    if (command[0] === "GET") {
      getCallCount += 1;
      throw new Error("simulated upstash outage");
    }
    // SET 走通，把值同时写入 fallback Map
    return new Response(JSON.stringify({ result: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  await setCachedSignedUrl("scenes/y/full.mp3", "https://cdn.test/fallback.mp3", 60_000);
  const url = await getCachedSignedUrl("scenes/y/full.mp3");
  assert.equal(url, "https://cdn.test/fallback.mp3");
  assert.equal(getCallCount, 1);
});

test("UPSTASH SET 抛错时仍写入 fallback Map，本进程后续 GET 仍可命中", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://upstash.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-xyz";
  __resetSignedUrlCacheForTests();

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body ?? "[]")) as unknown[];
    if (command[0] === "SET") {
      throw new Error("simulated upstash outage");
    }
    if (command[0] === "GET") {
      // Redis 也读不到
      throw new Error("simulated upstash outage on read");
    }
    return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
  }) as typeof fetch;

  await setCachedSignedUrl("scenes/z/full.mp3", "https://cdn.test/z.mp3", 60_000);
  const url = await getCachedSignedUrl("scenes/z/full.mp3");
  assert.equal(url, "https://cdn.test/z.mp3");
});

test("Upstash 返回 error 字段时按失败处理，回落 fallback", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://upstash.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-xyz";
  __resetSignedUrlCacheForTests();

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body ?? "[]")) as unknown[];
    if (command[0] === "GET") {
      return new Response(JSON.stringify({ error: "WRONGTYPE Operation against a key holding the wrong kind of value" }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
  }) as typeof fetch;

  await setCachedSignedUrl("scenes/q/full.mp3", "https://cdn.test/q.mp3", 60_000);
  const url = await getCachedSignedUrl("scenes/q/full.mp3");
  assert.equal(url, "https://cdn.test/q.mp3");
});
