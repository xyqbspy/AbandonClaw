import { SceneLearningProgressResponse, ScenePracticeSnapshotResponse } from "@/lib/utils/learning-api";
import { SCENE_TRAINING_STEPS, TrainingStepKey } from "./scene-detail-messages";

export const deriveSceneTrainingCompletedMap = ({
  session,
  practiceSetStatus,
  practiceSnapshot,
  variantUnlocked,
}: {
  session: SceneLearningProgressResponse["session"] | null | undefined;
  practiceSetStatus: "idle" | "generated" | "completed";
  practiceSnapshot: ScenePracticeSnapshotResponse | null;
  variantUnlocked: boolean;
}) => ({
  listen: (session?.fullPlayCount ?? 0) >= 1,
  focus_expression: (session?.openedExpressionCount ?? 0) >= 1,
  practice_sentence: (session?.practicedSentenceCount ?? 0) >= 1,
  scene_practice:
    practiceSetStatus === "completed" ||
    practiceSnapshot?.run?.status === "completed" ||
    Boolean(session?.scenePracticeCompleted),
  done: Boolean(variantUnlocked || session?.isDone),
});

export const deriveSceneTrainingState = (
  completedMap: Record<TrainingStepKey, boolean>,
) => {
  const completedKeys = new Set<TrainingStepKey>();
  const stepStates = SCENE_TRAINING_STEPS.map((step) => ({
    key: step.key,
    title: step.title,
    status: "pending" as "pending" | "current" | "done",
  }));

  let blocked = false;
  let currentStep: TrainingStepKey | null = null;

  for (const stepState of stepStates) {
    if (!blocked && completedMap[stepState.key]) {
      stepState.status = "done";
      completedKeys.add(stepState.key);
      continue;
    }

    if (!currentStep) {
      stepState.status = "current";
      currentStep = stepState.key;
    }
    blocked = true;
  }

  const resolvedCurrentStep =
    currentStep ?? (completedMap.done ? "done" : SCENE_TRAINING_STEPS[0]?.key ?? "listen");

  return {
    completedKeys,
    currentStep: resolvedCurrentStep,
    progressPercent: Math.round((completedKeys.size / SCENE_TRAINING_STEPS.length) * 100),
    stepStates,
  };
};

export const deriveSceneTrainingStatsSummary = ({
  session,
  completedMap,
  practiceSnapshot,
  practiceModuleCount,
  progressPercent,
}: {
  session: SceneLearningProgressResponse["session"] | null | undefined;
  completedMap: Record<TrainingStepKey, boolean>;
  practiceSnapshot: ScenePracticeSnapshotResponse | null;
  practiceModuleCount: number;
  progressPercent: number;
}) => ({
  fullPlayCount: session?.fullPlayCount ?? 0,
  openedExpressionCount: session?.openedExpressionCount ?? 0,
  practicedSentenceCount: session?.practicedSentenceCount ?? 0,
  practiceModuleCompleted: completedMap.scene_practice ? 1 : 0,
  practiceModesCompleted: practiceSnapshot?.summary.completedModeCount ?? 0,
  practiceModeCount: practiceModuleCount,
  practiceAttemptCount: practiceSnapshot?.summary.totalAttemptCount ?? 0,
  progressPercent,
});
