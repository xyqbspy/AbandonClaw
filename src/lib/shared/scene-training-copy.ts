import { PracticeAssessmentLevel, PracticeMode } from "@/lib/types/learning-flow";

export const SCENE_TRAINING_STEP_TITLES = {
  listen: "听熟这段",
  focus_expression: "看 1 个重点表达",
  practice_sentence: "进入练习",
  scene_practice: "开始练习",
  done: "解锁变体",
} as const;

export const SCENE_PRACTICE_STAGE_TITLE = "开始练习";

export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  cloze: "填空练习",
  guided_recall: "半句复现",
  sentence_recall: "整句复现",
  full_dictation: "默写全文",
};

export const PRACTICE_ASSESSMENT_SHORT_LABELS: Record<
  Exclude<PracticeAssessmentLevel, "complete">,
  string
> = {
  incorrect: "还不稳",
  keyword: "关键词命中",
  structure: "骨架已对上",
};

export const PRACTICE_SENTENCE_MILESTONE_LABELS = {
  keyword: "已抓到关键词",
  structure: "已搭好骨架",
  complete: "已完整复现",
} as const;

export const PRACTICE_ASSESSMENT_FEEDBACK = {
  keyword: "关键表达抓到了，再把句子骨架补完整。",
  structure: "句子骨架已经对上了，再把小词和细节补齐。",
  complete: "已经完整复现，可以进入下一题。",
  reviewKeyword: "这次已经抓到关键表达了，继续把句子骨架补完整。",
  reviewStructure: "这次骨架已经对上了，再把细节补齐就能过。",
  reviewComplete: "这次已经完整复现，说明复习接住了。",
} as const;

export const PRACTICE_SENTENCE_UPGRADE_MESSAGES = {
  keyword: "这句已经抓到关键表达了。",
  structure: "这句已经升到骨架复现。",
  complete: "这句已经完整复现了。",
} as const;

export const getPracticeModeLabel = (mode: PracticeMode | null | undefined) =>
  (mode ? PRACTICE_MODE_LABELS[mode] : null) ?? PRACTICE_MODE_LABELS.cloze;
