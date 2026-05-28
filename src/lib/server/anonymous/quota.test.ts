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
import { clearAnonymousCounterStore } from "./counter";
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
