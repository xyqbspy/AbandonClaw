import assert from "node:assert/strict";
import test from "node:test";

import { buildBuiltinSeedPhraseRowsForTest } from "./builtin-service";

test("builtin core phrase seed 来自 starter/builtin scenes 且数量落在 P3 第一阶段范围", () => {
  const rows = buildBuiltinSeedPhraseRowsForTest();

  assert.equal(rows.length >= 80, true);
  assert.equal(rows.length <= 120, true);
  assert.equal(new Set(rows.map((row) => row.normalizedText)).size, rows.length);
});

test("builtin core phrase seed 带有来源、分类、等级和高频标签", () => {
  const rows = buildBuiltinSeedPhraseRowsForTest();
  const repeat = rows.find((row) => row.displayText === "Could you say that again?");

  assert.ok(repeat);
  assert.equal(repeat.sourceSceneSlug, "asking-someone-to-repeat");
  assert.equal(repeat.category, "clarification");
  assert.equal(repeat.level, "L0");
  assert.equal(repeat.phraseType, "request");
  assert.equal(repeat.tags.includes("builtin"), true);
  assert.equal(repeat.tags.includes("core_phrase"), true);
});

test("builtin core phrase seed 不包含 user phrase 字段", () => {
  const rows = buildBuiltinSeedPhraseRowsForTest();
  const sample = rows[0] as Record<string, unknown>;

  assert.equal("user_id" in sample, false);
  assert.equal("review_status" in sample, false);
  assert.equal("next_review_at" in sample, false);
});
