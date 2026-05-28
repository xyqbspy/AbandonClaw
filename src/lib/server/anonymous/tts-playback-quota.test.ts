import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  AnonIpRateLimitedError,
  AnonQuotaExceededSessionError,
} from "@/lib/server/errors";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import { clearAnonymousCounterStore, peekDailyCounter } from "./counter";
import {
  checkAnonymousTtsPlaybackQuota,
  getAnonymousTtsPlaybackSessionDailyLimit,
  peekAnonymousTtsPlaybackQuota,
} from "./tts-playback-quota";

const VALID_ANON_ID = "11111111-2222-4333-8444-555555555555";
const IP_HASH = "a".repeat(64);
const FIXED_NOW = new Date("2026-05-28T10:00:00Z");

const ORIGINAL_IP_LIMIT = process.env.ANON_IP_RATE_LIMIT_PER_MINUTE;
const ORIGINAL_SESSION_OVERRIDE = process.env.ANON_QUOTA_SESSION_TTS_PLAY;

const restoreEnv = () => {
  if (ORIGINAL_IP_LIMIT === undefined) delete process.env.ANON_IP_RATE_LIMIT_PER_MINUTE;
  else process.env.ANON_IP_RATE_LIMIT_PER_MINUTE = ORIGINAL_IP_LIMIT;
  if (ORIGINAL_SESSION_OVERRIDE === undefined) delete process.env.ANON_QUOTA_SESSION_TTS_PLAY;
  else process.env.ANON_QUOTA_SESSION_TTS_PLAY = ORIGINAL_SESSION_OVERRIDE;
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

test("getAnonymousTtsPlaybackSessionDailyLimit: 默认 30 / env 覆盖", () => {
  delete process.env.ANON_QUOTA_SESSION_TTS_PLAY;
  assert.equal(getAnonymousTtsPlaybackSessionDailyLimit(), 30);

  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "7";
  assert.equal(getAnonymousTtsPlaybackSessionDailyLimit(), 7);

  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "  abc  ";
  assert.equal(getAnonymousTtsPlaybackSessionDailyLimit(), 30, "非数字回退默认 30");

  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "0";
  assert.equal(getAnonymousTtsPlaybackSessionDailyLimit(), 30, "0 回退默认 30(防误关全部播放)");
});

test("checkAnonymousTtsPlaybackQuota: 不限全站,sessionDailyRemaining 递减,globalDailyLimit=-1 表示 unlimited", async () => {
  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "3";
  for (let i = 0; i < 3; i += 1) {
    const result = await checkAnonymousTtsPlaybackQuota({
      anonId: VALID_ANON_ID,
      ipHash: IP_HASH,
      now: FIXED_NOW,
    });
    assert.equal(result.capability, "tts_play");
    assert.equal(result.globalDailyLimit, -1);
    assert.equal(result.globalDailyRemaining, Number.POSITIVE_INFINITY);
    assert.equal(result.sessionDailyLimit, 3);
    assert.equal(result.sessionDailyRemaining, 2 - i);
    assert.equal(result.resetAt.toISOString(), "2026-05-29T00:00:00.000Z");
  }
});

test("checkAnonymousTtsPlaybackQuota: 单会话达上限后第 N+1 次抛 AnonQuotaExceededSessionError,且 capability=tts_play", async () => {
  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "2";

  await checkAnonymousTtsPlaybackQuota({ anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW });
  await checkAnonymousTtsPlaybackQuota({ anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW });

  await assert.rejects(
    () =>
      checkAnonymousTtsPlaybackQuota({
        anonId: VALID_ANON_ID,
        ipHash: IP_HASH,
        now: FIXED_NOW,
      }),
    (error) => {
      assert.ok(error instanceof AnonQuotaExceededSessionError);
      assert.equal((error as AnonQuotaExceededSessionError).details?.capability, "tts_play");
      return true;
    },
  );
});

test("checkAnonymousTtsPlaybackQuota: 命中阈值后 DECR 回滚,count 不漂移", async () => {
  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "1";

  await checkAnonymousTtsPlaybackQuota({ anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW });

  // 5 次失败请求,每次都应该 DECR 回滚
  for (let i = 0; i < 5; i += 1) {
    await assert.rejects(
      () =>
        checkAnonymousTtsPlaybackQuota({
          anonId: VALID_ANON_ID,
          ipHash: IP_HASH,
          now: FIXED_NOW,
        }),
      AnonQuotaExceededSessionError,
    );
  }

  const sessionKey = `anon:quota:session:${VALID_ANON_ID}:tts_play:2026-05-28`;
  const peek = await peekDailyCounter(sessionKey, FIXED_NOW.getTime());
  assert.equal(peek.count, 1, "5 次失败回滚后 count 稳定在 1");
});

test("checkAnonymousTtsPlaybackQuota: 共享 IP 滑窗 scope(跟 explain_selection 同 anon-ip-rate),超阈值抛 AnonIpRateLimitedError", async () => {
  process.env.ANON_IP_RATE_LIMIT_PER_MINUTE = "2";
  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "100";

  await checkAnonymousTtsPlaybackQuota({ anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW });
  await checkAnonymousTtsPlaybackQuota({ anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW });

  await assert.rejects(
    () =>
      checkAnonymousTtsPlaybackQuota({
        anonId: VALID_ANON_ID,
        ipHash: IP_HASH,
        now: FIXED_NOW,
      }),
    AnonIpRateLimitedError,
  );
});

test("checkAnonymousTtsPlaybackQuota: 不同 anon 会话独立(单 anon 满后另一个 anon 仍可播)", async () => {
  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "2";

  for (let i = 0; i < 2; i += 1) {
    await checkAnonymousTtsPlaybackQuota({ anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW });
  }

  const result = await checkAnonymousTtsPlaybackQuota({
    anonId: "22222222-2222-4222-8222-222222222222",
    ipHash: "b".repeat(64),
    now: FIXED_NOW,
  });
  assert.equal(result.sessionDailyRemaining, 1);
});

test("peekAnonymousTtsPlaybackQuota: 不消耗计数,准确返回当前剩余", async () => {
  process.env.ANON_QUOTA_SESSION_TTS_PLAY = "5";

  await checkAnonymousTtsPlaybackQuota({ anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW });
  await checkAnonymousTtsPlaybackQuota({ anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW });

  const peek1 = await peekAnonymousTtsPlaybackQuota({
    anonId: VALID_ANON_ID,
    ipHash: IP_HASH,
    now: FIXED_NOW,
  });
  const peek2 = await peekAnonymousTtsPlaybackQuota({
    anonId: VALID_ANON_ID,
    ipHash: IP_HASH,
    now: FIXED_NOW,
  });
  assert.equal(peek1.sessionDailyRemaining, 3);
  assert.equal(peek2.sessionDailyRemaining, 3, "两次 peek 不应该改变剩余");
});
