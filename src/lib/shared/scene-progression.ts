export type SceneProgressStep =
  | "listen"
  | "focus_expression"
  | "practice_sentence"
  | "scene_practice"
  | "done"
  | null
  | undefined;

export type SceneMasteryStage =
  | "listening"
  | "focus"
  | "sentence_practice"
  | "scene_practice"
  | "variant_unlocked"
  | "mastered"
  | null
  | undefined;

const SCENE_PROGRESS_STEP_LABELS: Record<Exclude<SceneProgressStep, null | undefined>, string> = {
  listen: "听熟这段",
  focus_expression: "看重点表达",
  practice_sentence: "进入句子练习",
  scene_practice: "继续整段练习",
  done: "本轮已完成",
};

const SCENE_MASTERY_STAGE_LABELS: Record<Exclude<SceneMasteryStage, null | undefined>, string> = {
  listening: "先听熟场景",
  focus: "抓住重点表达",
  sentence_practice: "进入句子练习",
  scene_practice: "继续整段练习",
  variant_unlocked: "可以解锁变体",
  mastered: "这一组已经练熟",
};

export const getSceneProgressStepLabel = (step: SceneProgressStep) =>
  step ? SCENE_PROGRESS_STEP_LABELS[step] : null;

export const getSceneMasteryStageLabel = (stage: SceneMasteryStage) =>
  stage ? SCENE_MASTERY_STAGE_LABELS[stage] : null;
