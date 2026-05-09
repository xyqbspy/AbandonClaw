import assert from "node:assert/strict";
import test from "node:test";
import { getDailyQuotaLimit } from "./high-cost-usage";

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
