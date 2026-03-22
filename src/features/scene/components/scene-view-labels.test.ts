import assert from "node:assert/strict";
import test from "node:test";
import { sceneViewLabels } from "./scene-view-labels";

test("sceneViewLabels 会提供各视图必需的操作标签", () => {
  assert.equal(typeof sceneViewLabels.practice.back, "string");
  assert.equal(sceneViewLabels.practice.back.length > 0, true);
  assert.equal(typeof sceneViewLabels.practice.showAnswer, "string");
  assert.equal(typeof sceneViewLabels.variants.openMap, "string");
  assert.equal(typeof sceneViewLabels.variants.statusPrefix, "string");
  assert.equal(typeof sceneViewLabels.expressionMap.back, "string");
  assert.equal(typeof sceneViewLabels.expressionMap.empty, "string");
});
