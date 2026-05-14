import assert from "node:assert/strict";
import test from "node:test";
import { builtinSceneSeeds } from "./builtin-scene-seeds";

test("builtinSceneSeeds 包含 24 个默认场景且 slug 唯一", () => {
  assert.equal(builtinSceneSeeds.length, 24);
  const slugSet = new Set(builtinSceneSeeds.map((item) => item.meta.slug));
  assert.equal(slugSet.size, 24);
});

test("builtinSceneSeeds 每个场景都带完整元信息和可学习正文", () => {
  for (const item of builtinSceneSeeds) {
    assert.ok(item.meta.level === "L0" || item.meta.level === "L1" || item.meta.level === "L2");
    assert.ok(item.meta.category.length > 0);
    assert.ok(item.meta.learningGoal.length > 0);
    assert.ok(item.meta.estimatedMinutes >= 5);
    assert.equal(item.meta.sourceType, "builtin");
    assert.ok(item.lesson.sections[0]?.blocks.length);

    const sentenceCount = item.lesson.sections[0]?.blocks.reduce(
      (total, block) => total + block.sentences.length,
      0,
    ) ?? 0;
    if (item.meta.level === "L0") {
      assert.ok(sentenceCount >= 8 && sentenceCount <= 12);
    } else {
      assert.ok(sentenceCount >= 12 && sentenceCount <= 18);
    }

    assert.ok(item.lesson.explanations.length >= 4 && item.lesson.explanations.length <= 8);
  }
});
