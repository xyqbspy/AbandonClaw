import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { AuthError } from "@/lib/server/errors";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import {
  clearAnonymousCounterStore,
} from "@/lib/server/anonymous/counter";
import type { ResolvedAnonymousContext } from "@/lib/server/anonymous/identity";
import type { AnonymousTtsPlaybackQuotaResult } from "@/lib/server/anonymous/tts-playback-quota";
import { handleAnonymousTtsPlay } from "./route";

const VALID_ANON_ID = "11111111-2222-4333-8444-555555555555";
const IP_HASH = "a".repeat(64);

const ORIGINAL_TRIAL = process.env.ALLOW_ANONYMOUS_TRIAL;
const restoreEnv = () => {
  if (ORIGINAL_TRIAL === undefined) delete process.env.ALLOW_ANONYMOUS_TRIAL;
  else process.env.ALLOW_ANONYMOUS_TRIAL = ORIGINAL_TRIAL;
};

beforeEach(() => {
  clearAnonymousCounterStore();
  clearRateLimitStore();
});

afterEach(() => {
  restoreEnv();
  clearAnonymousCounterStore();
  clearRateLimitStore();
});

const STORAGE_HIT = {
  signedUrl: "https://storage.example.com/signed/audio.mp3?token=abc",
  storagePath: "scenes/sample/sentences/sen-1.mp3",
  source: "storage-hit" as const,
};

const QUOTA_OK: AnonymousTtsPlaybackQuotaResult = {
  capability: "tts_play",
  sessionDailyLimit: 30,
  sessionDailyRemaining: 29,
  globalDailyLimit: -1,
  globalDailyRemaining: Number.POSITIVE_INFINITY,
  resetAt: new Date("2026-05-29T00:00:00.000Z"),
};

const buildGetRequest = (
  params: Record<string, string>,
  headers: Record<string, string> = {},
) => {
  const url = new URL("http://localhost/api/anonymous/tts/play");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: "GET", headers });
};

const baseDeps = () => ({
  requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
  getPreGeneratedTtsAudioUrl: async () => STORAGE_HIT,
  checkAnonymousTtsPlaybackQuota: async () => QUOTA_OK,
  resolveAnonymousContext: async (): Promise<ResolvedAnonymousContext> => ({
    anonId: VALID_ANON_ID,
    ipHash: IP_HASH,
    isSearchEngineBot: false,
  }),
});

test("handleAnonymousTtsPlay: 已登录 + storage hit 返 200 + signedUrl,无 quota 头", async () => {
  const response = await handleAnonymousTtsPlay(
    buildGetRequest({
      kind: "sentence",
      sceneSlug: "sample",
      sentenceId: "sen-1",
      text: "Hello world.",
    }),
    baseDeps(),
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.signedUrl, STORAGE_HIT.signedUrl);
  assert.equal(body.source, "storage-hit");
  assert.equal(response.headers.get("X-Quota-Type"), null, "已登录用户响应不带匿名 quota 头");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("handleAnonymousTtsPlay: 已登录 + storage miss → 404 NOT_FOUND(不 fallback 生成)", async () => {
  const response = await handleAnonymousTtsPlay(
    buildGetRequest({
      kind: "sentence",
      sceneSlug: "sample",
      sentenceId: "sen-1",
      text: "Hello world.",
    }),
    { ...baseDeps(), getPreGeneratedTtsAudioUrl: async () => null },
  );
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.code, "NOT_FOUND");
});

test("handleAnonymousTtsPlay: 匿名 + ALLOW_ANONYMOUS_TRIAL 关闭 → 401 透传 AuthError", async () => {
  delete process.env.ALLOW_ANONYMOUS_TRIAL;
  let resolveCalled = false;
  const response = await handleAnonymousTtsPlay(
    buildGetRequest(
      { kind: "sentence", sceneSlug: "sample", sentenceId: "sen-1", text: "Hi." },
      { "x-anonymous-id": VALID_ANON_ID },
    ),
    {
      ...baseDeps(),
      requireCurrentProfile: async () => {
        throw new AuthError();
      },
      resolveAnonymousContext: async () => {
        resolveCalled = true;
        throw new Error("不应进入 resolveAnonymousContext");
      },
    },
  );
  assert.equal(response.status, 401);
  assert.equal(resolveCalled, false);
});

test("handleAnonymousTtsPlay: 匿名 + 开启 + storage hit → 200 + signedUrl + quota 头", async () => {
  process.env.ALLOW_ANONYMOUS_TRIAL = "true";
  let quotaCalled = false;
  let lookupCalled = false;
  const response = await handleAnonymousTtsPlay(
    buildGetRequest(
      { kind: "sentence", sceneSlug: "sample", sentenceId: "sen-1", text: "Hi." },
      { "x-anonymous-id": VALID_ANON_ID },
    ),
    {
      ...baseDeps(),
      requireCurrentProfile: async () => {
        throw new AuthError();
      },
      checkAnonymousTtsPlaybackQuota: async () => {
        quotaCalled = true;
        return QUOTA_OK;
      },
      getPreGeneratedTtsAudioUrl: async () => {
        lookupCalled = true;
        return STORAGE_HIT;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(quotaCalled, true);
  assert.equal(lookupCalled, true);
  assert.equal(response.headers.get("X-Quota-Type"), "tts_play");
  assert.equal(response.headers.get("X-Quota-Session-Limit"), "30");
  assert.equal(response.headers.get("X-Quota-Session-Remaining"), "29");
  assert.equal(response.headers.get("X-Quota-Daily-Limit"), "unlimited");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("handleAnonymousTtsPlay: 匿名 + 开启 + 配额耗尽 → 429 ANON_QUOTA_EXCEEDED_SESSION", async () => {
  process.env.ALLOW_ANONYMOUS_TRIAL = "true";
  let lookupCalled = false;
  const { AnonQuotaExceededSessionError } = await import("@/lib/server/errors");
  const response = await handleAnonymousTtsPlay(
    buildGetRequest(
      { kind: "sentence", sceneSlug: "sample", sentenceId: "sen-1", text: "Hi." },
      { "x-anonymous-id": VALID_ANON_ID },
    ),
    {
      ...baseDeps(),
      requireCurrentProfile: async () => {
        throw new AuthError();
      },
      checkAnonymousTtsPlaybackQuota: async () => {
        throw new AnonQuotaExceededSessionError("tts_play", {
          sessionDailyLimit: 30,
          resetAt: "2026-05-29T00:00:00.000Z",
        });
      },
      getPreGeneratedTtsAudioUrl: async () => {
        lookupCalled = true;
        return STORAGE_HIT;
      },
    },
  );
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.equal(body.code, "ANON_QUOTA_EXCEEDED_SESSION");
  assert.equal(body.details.capability, "tts_play");
  assert.equal(lookupCalled, false, "配额命中不应再调 storage lookup");
});

test("handleAnonymousTtsPlay: 匿名 + 缺 X-Anonymous-Id 头 → 400 ANON_ID_REQUIRED(由 resolveAnonymousContext 抛)", async () => {
  process.env.ALLOW_ANONYMOUS_TRIAL = "true";
  const { AnonIdRequiredError } = await import("@/lib/server/errors");
  const response = await handleAnonymousTtsPlay(
    buildGetRequest({
      kind: "sentence",
      sceneSlug: "sample",
      sentenceId: "sen-1",
      text: "Hi.",
    }),
    {
      ...baseDeps(),
      requireCurrentProfile: async () => {
        throw new AuthError();
      },
      resolveAnonymousContext: async () => {
        throw new AnonIdRequiredError();
      },
    },
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, "ANON_ID_REQUIRED");
});

test("handleAnonymousTtsPlay: 匿名 + 搜索引擎爬虫 → 透传 401(不能签发 signed URL)", async () => {
  process.env.ALLOW_ANONYMOUS_TRIAL = "true";
  const response = await handleAnonymousTtsPlay(
    buildGetRequest(
      { kind: "sentence", sceneSlug: "sample", sentenceId: "sen-1", text: "Hi." },
      { "x-anonymous-id": VALID_ANON_ID, "user-agent": "Googlebot/2.1" },
    ),
    {
      ...baseDeps(),
      requireCurrentProfile: async () => {
        throw new AuthError();
      },
      resolveAnonymousContext: async () => ({
        anonId: null,
        ipHash: null,
        isSearchEngineBot: true,
      }),
    },
  );
  assert.equal(response.status, 401);
});

test("handleAnonymousTtsPlay: 缺 kind 或 unsupported kind → 400 VALIDATION_ERROR(query 校验先于鉴权)", async () => {
  const response = await handleAnonymousTtsPlay(
    buildGetRequest({ sceneSlug: "sample", sentenceId: "sen-1", text: "Hi." }),
    baseDeps(),
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("handleAnonymousTtsPlay: kind=sentence 缺 text query → 400 VALIDATION_ERROR", async () => {
  const response = await handleAnonymousTtsPlay(
    buildGetRequest({ kind: "sentence", sceneSlug: "sample", sentenceId: "sen-1" }),
    baseDeps(),
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, "VALIDATION_ERROR");
});
