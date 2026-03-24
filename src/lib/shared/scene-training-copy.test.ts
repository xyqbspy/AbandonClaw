import assert from "node:assert/strict";
import test from "node:test";
import {
  getPracticeModeLabel,
  PRACTICE_ASSESSMENT_FEEDBACK,
  PRACTICE_ASSESSMENT_SHORT_LABELS,
  PRACTICE_MODE_LABELS,
  PRACTICE_SENTENCE_MILESTONE_LABELS,
  PRACTICE_SENTENCE_UPGRADE_MESSAGES,
  SCENE_PRACTICE_STAGE_TITLE,
  SCENE_TRAINING_STEP_TITLES,
} from "./scene-training-copy";

test("scene training copy 会统一提供训练阶段标题", () => {
  assert.deepEqual(SCENE_TRAINING_STEP_TITLES, {
    listen: "听熟这段",
    focus_expression: "看 1 个重点表达",
    practice_sentence: "练 1 句核心句",
    scene_practice: "开始练习",
    done: "解锁变体",
  });
  assert.equal(SCENE_PRACTICE_STAGE_TITLE, "开始练习");
});

test("scene training copy 会统一提供练习题型和评估文案", () => {
  assert.deepEqual(PRACTICE_MODE_LABELS, {
    cloze: "填空练习",
    guided_recall: "半句复现",
    sentence_recall: "整句复现",
    full_dictation: "默写全文",
  });
  assert.deepEqual(PRACTICE_ASSESSMENT_SHORT_LABELS, {
    incorrect: "还不稳",
    keyword: "关键词命中",
    structure: "骨架已对上",
  });
  assert.deepEqual(PRACTICE_SENTENCE_MILESTONE_LABELS, {
    keyword: "已抓到关键词",
    structure: "已搭好骨架",
    complete: "已完整复现",
  });
  assert.deepEqual(PRACTICE_SENTENCE_UPGRADE_MESSAGES, {
    keyword: "这句已经抓到关键表达了。",
    structure: "这句已经升到骨架复现。",
    complete: "这句已经完整复现了。",
  });
  assert.equal(PRACTICE_ASSESSMENT_FEEDBACK.keyword, "关键表达抓到了，再把句子骨架补完整。");
  assert.equal(PRACTICE_ASSESSMENT_FEEDBACK.reviewComplete, "这次已经完整复现，说明复习接住了。");
});

test("getPracticeModeLabel 会返回稳定题型文案并兜底到填空", () => {
  assert.equal(getPracticeModeLabel("guided_recall"), "半句复现");
  assert.equal(getPracticeModeLabel("sentence_recall"), "整句复现");
  assert.equal(getPracticeModeLabel(null), "填空练习");
  assert.equal(getPracticeModeLabel(undefined), "填空练习");
});
