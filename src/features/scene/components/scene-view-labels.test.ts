import assert from "node:assert/strict";
import test from "node:test";
import { sceneViewLabels } from "./scene-view-labels";

test("sceneViewLabels 会提供各视图必需的操作标签", () => {
  assert.equal(typeof sceneViewLabels.practice.back, "string");
  assert.equal(sceneViewLabels.practice.back.length > 0, true);
  assert.equal(typeof sceneViewLabels.practice.showAnswer, "string");
  assert.equal(typeof sceneViewLabels.practice.inputPlaceholder, "string");
  assert.equal(typeof sceneViewLabels.practice.checkAnswer, "string");
  assert.equal(typeof sceneViewLabels.practice.progressLabel, "string");
  assert.equal(typeof sceneViewLabels.practice.totalAttemptsLabel, "string");
  assert.equal(typeof sceneViewLabels.practice.totalIncorrectLabel, "string");
  assert.equal(typeof sceneViewLabels.practice.currentQuestionLabel, "string");
  assert.equal(typeof sceneViewLabels.practice.currentAttemptsLabel, "string");
  assert.equal(typeof sceneViewLabels.practice.currentIncorrectLabel, "string");
  assert.equal(typeof sceneViewLabels.practice.summaryTitle, "string");
  assert.equal(typeof sceneViewLabels.practice.summaryNoMistakes, "string");
  assert.equal(typeof sceneViewLabels.practice.summaryReviewHint, "string");
  assert.equal(typeof sceneViewLabels.practice.summaryVariantHint, "string");
  assert.equal(typeof sceneViewLabels.practice.summaryReviewAction, "string");
  assert.equal(typeof sceneViewLabels.practice.summaryVariantAction, "string");
  assert.equal(typeof sceneViewLabels.variants.openMap, "string");
  assert.equal(typeof sceneViewLabels.variants.statusPrefix, "string");
  assert.equal(typeof sceneViewLabels.expressionMap.back, "string");
  assert.equal(typeof sceneViewLabels.expressionMap.empty, "string");
});
