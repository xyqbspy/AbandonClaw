import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getDailyQuotaLimit,
  parseDisabledHighCostCapabilities,
  reserveHighCostUsage,
} from "./high-cost-usage";
import { HighCostCapabilityDisabledError } from "@/lib/server/errors";

test("getDailyQuotaLimit 使用保守默认值", () => {
  const original = process.env.DAILY_QUOTA_PRACTICE_GENERATE;
  delete process.env.DAILY_QUOTA_PRACTICE_GENERATE;
  try {
    assert.equal(getDailyQuotaLimit("practice_generate"), 20);
  } finally {
    if (original == null) {
      delete process.env.DAILY_QUOTA_PRACTICE_GENERATE;
    } else {
      process.env.DAILY_QUOTA_PRACTICE_GENERATE = original;
    }
  }
});

test("getDailyQuotaLimit 支持按 capability 用环境变量覆盖", () => {
  const original = process.env.DAILY_QUOTA_TTS_REGENERATE;
  process.env.DAILY_QUOTA_TTS_REGENERATE = "3";
  try {
    assert.equal(getDailyQuotaLimit("tts_regenerate"), 3);
  } finally {
    if (original == null) {
      delete process.env.DAILY_QUOTA_TTS_REGENERATE;
    } else {
      process.env.DAILY_QUOTA_TTS_REGENERATE = original;
    }
  }
});

test("getDailyQuotaLimit 会忽略非法覆盖值", () => {
  const original = process.env.DAILY_QUOTA_SCENE_GENERATE;
  process.env.DAILY_QUOTA_SCENE_GENERATE = "not-a-number";
  try {
    assert.equal(getDailyQuotaLimit("scene_generate"), 8);
  } finally {
    if (original == null) {
      delete process.env.DAILY_QUOTA_SCENE_GENERATE;
    } else {
      process.env.DAILY_QUOTA_SCENE_GENERATE = original;
    }
  }
});

test("parseDisabledHighCostCapabilities 只保留合法 capability", () => {
  assert.deepEqual(
    parseDisabledHighCostCapabilities('["practice_generate","bad","tts_regenerate","practice_generate"]'),
    ["practice_generate", "tts_regenerate"],
  );
  assert.deepEqual(parseDisabledHighCostCapabilities("bad-json"), []);
});

test("reserveHighCostUsage 在 capability 被关闭时不会预占 quota", async () => {
  let rpcCalled = false;

  await assert.rejects(
    () =>
      reserveHighCostUsage({
        userId: "user-1",
        capability: "practice_generate",
        dependencies: {
          createSupabaseAdminClient: () =>
            ({
              from: (table: string) => {
                assert.equal(table, "app_runtime_settings");
                return {
                  select: () => ({
                    eq: () => ({
                      maybeSingle: async () => ({
                        data: { value: '["practice_generate"]' },
                        error: null,
                      }),
                    }),
                  }),
                };
              },
              rpc: async () => {
                rpcCalled = true;
                return { data: null, error: null };
              },
            }) as never,
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof HighCostCapabilityDisabledError);
      assert.equal(rpcCalled, false);
      return true;
    },
  );
});

test("reserve_daily_high_cost_usage SQL 已消除 reserved_count 歧义", () => {
  const sql = readFileSync("supabase/sql/20260509_public_registration_p0b.sql", "utf8");

  assert.match(sql, /v_reserved_count integer;/);
  assert.match(sql, /update public\.user_daily_high_cost_usage as h/);
  assert.match(sql, /set reserved_count = h\.reserved_count \+ 1,/);
  assert.match(sql, /into v_reserved_count, v_limit_count;/);
  assert.doesNotMatch(sql, /set reserved_count = reserved_count \+ 1,/);
  assert.doesNotMatch(sql, /into reserved_count, limit_count;/);
});
