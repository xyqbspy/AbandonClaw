import assert from "node:assert/strict";
import test from "node:test";
import { sceneViewLabels } from "./scene-view-labels";

test("sceneViewLabels 会提供稳定的场景视图文案", () => {
  assert.equal(sceneViewLabels.practice.back, "返回原场景");
  assert.equal(sceneViewLabels.practice.showAnswer, "Show Answer");
  assert.equal(sceneViewLabels.variants.openMap, "查看表达地图");
  assert.equal(sceneViewLabels.variants.statusPrefix, "状态：");
  assert.equal(sceneViewLabels.expressionMap.back, "返回变体页");
  assert.equal(sceneViewLabels.expressionMap.empty, "暂无表达簇。先生成变体后再查看表达地图。");
});
