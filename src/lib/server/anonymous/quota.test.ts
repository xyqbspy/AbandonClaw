import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  AnonFeatureDisabledError,
  AnonIpRateLimitedError,
  AnonQuotaExceededGlobalError,
  AnonQuotaExceededSessionError,
  HighCostCapabilityDisabledError,
} from "@/lib/server/errors";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import { clearAnonymousCounterStore, peekDailyCounter } from "./counter";
import { checkAnonymousQuota } from "./quota";

const VALID_ANON_ID = "11111111-2222-4333-8444-555555555555";
const IP_HASH = "a".repeat(64);

const FIXED_NOW = new Date("2026-05-28T10:00:00Z");

const ORIGINAL_IP_LIMIT = process.env.ANON_IP_RATE_LIMIT_PER_MINUTE;
const ORIGINAL_GLOBAL_OVERRIDE = process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION;
const ORIGINAL_SESSION_OVERRIDE = process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION;

const restoreEnv = () => {
  if (ORIGINAL_IP_LIMIT === undefined) delete process.env.ANON_IP_RATE_LIMIT_PER_MINUTE;
  else process.env.ANON_IP_RATE_LIMIT_PER_MINUTE = ORIGINAL_IP_LIMIT;
  if (ORIGINAL_GLOBAL_OVERRIDE === undefined) delete process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION;
  else process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION = ORIGINAL_GLOBAL_OVERRIDE;
  if (ORIGINAL_SESSION_OVERRIDE === undefined) delete process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION;
  else process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION = ORIGINAL_SESSION_OVERRIDE;
};

const noDisabledDeps = {
  listDisabledHighCostCapabilities: async () => [],
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

test("checkAnonymousQuota: 紧急关闭优先级最高,不消耗任何计数", async () => {
  await assert.rejects(
    () =>
      checkAnonymousQuota(
        { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
        { listDisabledHighCostCapabilities: async () => ["explain_selection"] },
      ),
    HighCostCapabilityDisabledError,
  );

  const next = await checkAnonymousQuota(
    { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
    noDisabledDeps,
  );
  assert.equal(next.sessionDailyRemaining, 2);
});

test("checkAnonymousQuota: anonAllowed=false 的 capability 直接抛 AnonFeatureDisabledError", async () => {
  await assert.rejects(
    () =>
      checkAnonymousQuota(
        { capability: "scene_generate", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
        noDisabledDeps,
      ),
    AnonFeatureDisabledError,
  );
});

test("checkAnonymousQuota: 单会话日配额达上限后第 N+1 次抛 AnonQuotaExceededSessionError", async () => {
  for (let i = 0; i < 3; i += 1) {
    const result = await checkAnonymousQuota(
      { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
      noDisabledDeps,
    );
    assert.equal(result.sessionDailyRemaining, 2 - i);
  }

  await assert.rejects(
    () =>
      checkAnonymousQuota(
        { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
        noDisabledDeps,
      ),
    AnonQuotaExceededSessionError,
  );
});

test("checkAnonymousQuota: 全站匿名池达上限后抛 AnonQuotaExceededGlobalError(不依赖单会话)", async () => {
  process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION = "2";
  process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION = "100";

  await checkAnonymousQuota(
    { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
    noDisabledDeps,
  );
  await checkAnonymousQuota(
    { capability: "explain_selection", anonId: "22222222-2222-4222-8222-222222222222", ipHash: "b".repeat(64), now: FIXED_NOW },
    noDisabledDeps,
  );

  await assert.rejects(
    () =>
      checkAnonymousQuota(
        {
          capability: "explain_selection",
          anonId: "33333333-3333-4333-8333-333333333333",
          ipHash: "c".repeat(64),
          now: FIXED_NOW,
        },
        noDisabledDeps,
      ),
    AnonQuotaExceededGlobalError,
  );
});

test("checkAnonymousQuota: IP 滑窗 QPS 超阈值抛 AnonIpRateLimitedError(优先于配额)", async () => {
  process.env.ANON_IP_RATE_LIMIT_PER_MINUTE = "2";
  process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION = "100";
  process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION = "100";

  await checkAnonymousQuota(
    { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
    noDisabledDeps,
  );
  await checkAnonymousQuota(
    { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
    noDisabledDeps,
  );

  await assert.rejects(
    () =>
      checkAnonymousQuota(
        { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
        noDisabledDeps,
      ),
    AnonIpRateLimitedError,
  );
});

test("checkAnonymousQuota: 不同 anon_id 单会话配额相互独立", async () => {
  for (let i = 0; i < 3; i += 1) {
    await checkAnonymousQuota(
      { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
      noDisabledDeps,
    );
  }

  const result = await checkAnonymousQuota(
    {
      capability: "explain_selection",
      anonId: "44444444-4444-4444-8444-444444444444",
      ipHash: "d".repeat(64),
      now: FIXED_NOW,
    },
    noDisabledDeps,
  );
  assert.equal(result.sessionDailyRemaining, 2);
});

test("checkAnonymousQuota: 返回的 resetAt 为次日 00:00:00 UTC", async () => {
  const result = await checkAnonymousQuota(
    { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
    noDisabledDeps,
  );
  assert.equal(result.resetAt.toISOString(), "2026-05-29T00:00:00.000Z");
});

// === 回滚行为(decrDailyCounter)===
// key 格式见 quota.ts buildGlobalKey / buildSessionKey,与 spec 文档一致

const dateKey = "2026-05-28";
const globalKey = `anon:quota:global:explain_selection:${dateKey}`;
const sessionKey = (anonId: string) =>
  `anon:quota:session:${anonId}:explain_selection:${dateKey}`;

test("checkAnonymousQuota: global 命中后 DECR 回滚,持续失败请求 count 不会无限漂移", async () => {
  process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION = "1";
  process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION = "100";

  // 1 次成功
  await checkAnonymousQuota(
    { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
    noDisabledDeps,
  );
  let peek = await peekDailyCounter(globalKey, FIXED_NOW.getTime());
  assert.equal(peek.count, 1, "成功 1 次后 global count = 1");

  // 5 次失败,每次都命中 global 阈值并应该 DECR 回滚
  for (let i = 0; i < 5; i += 1) {
    await assert.rejects(
      () =>
        checkAnonymousQuota(
          {
            capability: "explain_selection",
            anonId: `2222222${i}-2222-4222-8222-222222222222`,
            ipHash: `b${i}`.repeat(32).slice(0, 64),
            now: FIXED_NOW,
          },
          noDisabledDeps,
        ),
      AnonQuotaExceededGlobalError,
    );
  }
  peek = await peekDailyCounter(globalKey, FIXED_NOW.getTime());
  assert.equal(
    peek.count,
    1,
    "5 次失败请求都被 DECR 回滚后,global count 应仍为 1(命中阈值时的快照值),不会涨到 6",
  );
});

test("checkAnonymousQuota: session 命中后,session + global 都被回滚(避免单 session 满后仍消耗全站池)", async () => {
  process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION = "100";
  process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION = "3";

  for (let i = 0; i < 3; i += 1) {
    await checkAnonymousQuota(
      { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
      noDisabledDeps,
    );
  }

  const globalAfterSuccess = await peekDailyCounter(globalKey, FIXED_NOW.getTime());
  assert.equal(globalAfterSuccess.count, 3);
  const sessionAfterSuccess = await peekDailyCounter(sessionKey(VALID_ANON_ID), FIXED_NOW.getTime());
  assert.equal(sessionAfterSuccess.count, 3);

  // 第 4 次同 anonId 命中 session 上限
  await assert.rejects(
    () =>
      checkAnonymousQuota(
        { capability: "explain_selection", anonId: VALID_ANON_ID, ipHash: IP_HASH, now: FIXED_NOW },
        noDisabledDeps,
      ),
    AnonQuotaExceededSessionError,
  );

  // session 应被回滚回 3 而不是 4
  const sessionAfterFail = await peekDailyCounter(sessionKey(VALID_ANON_ID), FIXED_NOW.getTime());
  assert.equal(sessionAfterFail.count, 3, "session count 应回滚回 3,不是漂到 4");
  // 关键:global 也应被回滚(单 session 已满,不该再吃全站池)
  const globalAfterFail = await peekDailyCounter(globalKey, FIXED_NOW.getTime());
  assert.equal(
    globalAfterFail.count,
    3,
    "session 命中时 global 也要回滚,否则单 session 满后仍持续消耗全站池",
  );
});
