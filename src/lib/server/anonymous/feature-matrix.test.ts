import assert from "node:assert/strict";
import test from "node:test";
import { getAnonymousFeatureConfig } from "./feature-matrix";

const ORIGINAL_GLOBAL = process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION;
const ORIGINAL_SESSION = process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION;
const restore = () => {
  if (ORIGINAL_GLOBAL === undefined) delete process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION;
  else process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION = ORIGINAL_GLOBAL;
  if (ORIGINAL_SESSION === undefined) delete process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION;
  else process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION = ORIGINAL_SESSION;
};

test("AI 表达解释默认匿名允许,全站 200/天 + 单会话 3/天", () => {
  delete process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION;
  delete process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION;
  const cfg = getAnonymousFeatureConfig("explain_selection");
  assert.equal(cfg.anonAllowed, true);
  assert.equal(cfg.globalDailyLimit, 200);
  assert.equal(cfg.sessionDailyLimit, 3);
  assert.equal(cfg.alertThresholdRatio, 0.8);
  restore();
});

test("AI 场景生成 / 相似表达 / TTS 实时生成 匿名禁用", () => {
  for (const cap of ["scene_generate", "similar_generate", "tts_generate", "tts_regenerate"] as const) {
    const cfg = getAnonymousFeatureConfig(cap);
    assert.equal(cfg.anonAllowed, false, `${cap} 应禁用`);
  }
});

test("env 覆盖单 capability 的全站 / 单会话上限", () => {
  process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION = "500";
  process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION = "5";
  const cfg = getAnonymousFeatureConfig("explain_selection");
  assert.equal(cfg.globalDailyLimit, 500);
  assert.equal(cfg.sessionDailyLimit, 5);
  restore();
});
