import assert from "node:assert/strict";
import test from "node:test";
import { reviewPageLabels } from "./review-page-labels";
import {
  assessmentLabelMap,
  buildReviewInlinePracticeSetId,
  getInlinePracticeFeedback,
  getInlinePracticePlaceholder,
  getReviewModeAccentClassName,
  reviewModeLabelMap,
} from "./review-page-messages";

test("review page messages 会复用统一的题型与评估文案", () => {
  assert.deepEqual(reviewModeLabelMap, {
    cloze: "填空练习",
    guided_recall: "半句复现",
    sentence_recall: "整句复现",
    full_dictation: "默写全文",
  });
  assert.deepEqual(assessmentLabelMap, {
    incorrect: "还不稳",
    keyword: "关键词命中",
    structure: "骨架已对上",
  });
});

test("review inline helper 会生成稳定的 set id、placeholder 与反馈文案", () => {
  assert.equal(
    buildReviewInlinePracticeSetId({
      sceneSlug: "coffee-chat",
      exerciseId: "exercise-1",
      recommendedMode: "sentence_recall",
    } as never),
    "review-inline:coffee-chat:exercise-1:sentence_recall",
  );
  assert.equal(
    getInlinePracticePlaceholder("full_dictation", reviewPageLabels),
    reviewPageLabels.practiceFullDictationPlaceholder,
  );
  assert.equal(
    getInlinePracticePlaceholder("guided_recall", reviewPageLabels),
    reviewPageLabels.practiceGuidedRecallPlaceholder,
  );
  assert.equal(
    getInlinePracticeFeedback("keyword", reviewPageLabels),
    reviewPageLabels.practiceKeywordFeedback,
  );
  assert.equal(
    getInlinePracticeFeedback("complete", reviewPageLabels),
    reviewPageLabels.practiceCompleteFeedback,
  );
  assert.equal(getInlinePracticeFeedback(null, reviewPageLabels), null);
});

test("review mode accent class 会按题型返回稳定样式", () => {
  assert.equal(getReviewModeAccentClassName("guided_recall"), "bg-sky-50 text-sky-700");
  assert.equal(getReviewModeAccentClassName("sentence_recall"), "bg-amber-50 text-amber-700");
  assert.equal(getReviewModeAccentClassName("full_dictation"), "bg-emerald-50 text-emerald-700");
  assert.equal(getReviewModeAccentClassName("cloze"), "bg-muted text-muted-foreground");
});
