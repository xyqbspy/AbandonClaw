import { getPracticeModeLabel, SCENE_TRAINING_STEP_TITLES } from "@/lib/shared/scene-training-copy";

export type TrainingStepKey =
  | "listen"
  | "focus_expression"
  | "practice_sentence"
  | "scene_practice"
  | "done";

export const SCENE_TRAINING_STEPS: Array<{
  key: Exclude<TrainingStepKey, "practice_sentence">;
  title: string;
}> = [
  { key: "listen", title: SCENE_TRAINING_STEP_TITLES.listen },
  { key: "focus_expression", title: SCENE_TRAINING_STEP_TITLES.focus_expression },
  { key: "scene_practice", title: SCENE_TRAINING_STEP_TITLES.scene_practice },
  { key: "done", title: SCENE_TRAINING_STEP_TITLES.done },
];

export const getSceneTrainingStepTitle = (step: TrainingStepKey | null | undefined) => {
  if (step === "practice_sentence") return SCENE_TRAINING_STEP_TITLES.scene_practice;
  return SCENE_TRAINING_STEPS.find((item) => item.key === step)?.title ?? SCENE_TRAINING_STEP_TITLES.listen;
};

export const getSceneTrainingNextStep = (
  step: TrainingStepKey | null | undefined,
): TrainingStepKey | null => {
  if (!step || step === "listen") return "focus_expression";
  if (step === "focus_expression" || step === "practice_sentence") return "scene_practice";
  if (step === "scene_practice") return "done";
  return null;
};

export const sceneDetailMessages = {
  loading: "场景加载中...",
  notFound: "场景不存在。",
  trainingPanelTitle: "本轮训练",
  currentStepLabel: "当前步骤",
  nextStepPrefix: "下一步：",
  trainingStepsLabel: "训练步骤",
  stepDone: "已完成",
  stepCurrent: "当前",
  stepPending: "待完成",
  panelProgressLabel: "进度",
  loopScenePrompt: "先把这段听熟，再进入后面的主动提取。",
  focusExpressionPrompt: "先抓一个重点表达，后面开始练习会更顺。",
  practiceSentencePrompt: "这句已经记入练习进度。",
  focusStepHint: "先点开一句里的重点短语，再进入下一步。",
  continueStepPrompts: {
    focus_expression: "继续看重点表达",
    practice_sentence: "继续进入句子练习",
    scene_practice: "继续完成整段练习",
  },
  sessionCompleted: "这段今天已经认真练过一轮了。",
  sceneMilestones: {
    listen: (sceneTitle: string) => `场景升级：已经听熟《${sceneTitle}》。`,
    focus_expression: "场景升级：已经抓到这段里的重点表达。",
    practice_sentence: "场景升级：已经进入句子练习阶段了。",
    scene_practice: "场景升级：已经完成本轮练习。",
    done: (sceneTitle: string) => `场景通关：今天已经练通《${sceneTitle}》。`,
  },
  savePhrase: {
    existed: "该短语已在收藏中",
    success: "已收藏短语",
    failed: "收藏短语失败",
  },
};

export const getSceneMilestoneToastMessage = (
  step: TrainingStepKey,
  sceneTitle: string,
) => {
  if (step === "listen") return sceneDetailMessages.sceneMilestones.listen(sceneTitle);
  if (step === "done") return sceneDetailMessages.sceneMilestones.done(sceneTitle);
  return sceneDetailMessages.sceneMilestones[step];
};

export const getSceneContinueStepToastMessage = (
  step: Exclude<TrainingStepKey, "listen" | "done">,
) => sceneDetailMessages.continueStepPrompts[step];

export const getSceneTrainingCurrentStepSupportText = ({
  currentStep,
  practiceModeLabel,
  practiceModeKey,
  practiceAttemptCount,
}: {
  currentStep: TrainingStepKey;
  practiceModeLabel?: string | null;
  practiceModeKey?: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation" | null;
  practiceAttemptCount: number;
}) => {
  if (currentStep === "practice_sentence") {
    const modeText = practiceModeLabel?.trim() || getPracticeModeLabel(practiceModeKey);
    return `你已经进入句子练习阶段。先把至少一句推进到完整复现，当前建议继续做${modeText}，系统已记录 ${practiceAttemptCount} 次作答。`;
  }
  if (currentStep === "scene_practice") {
    const modeText = practiceModeLabel?.trim() || getPracticeModeLabel(practiceModeKey);
    return `你已经完成句子入门阶段，接下来要把整轮题型做完。当前建议继续做${modeText}，系统已记录 ${practiceAttemptCount} 次作答。`;
  }
  if (currentStep === "done") {
    return "这一轮基础训练已经闭环，可以继续进入变体迁移。";
  }
  return "按顺序完成当前步骤，系统会自动推进到下一步。";
};
