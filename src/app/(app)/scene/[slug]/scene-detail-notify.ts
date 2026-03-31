"use client";

import { toast } from "sonner";
import {
  getSceneContinueStepToastMessage,
  getSceneMilestoneToastMessage,
  sceneDetailMessages,
  TrainingStepKey,
} from "./scene-detail-messages";

export const notifySceneSessionCompleted = () => {
  toast.success(sceneDetailMessages.sessionCompleted);
};

export const notifySceneMilestone = (step: TrainingStepKey, sceneTitle: string) => {
  toast.success(getSceneMilestoneToastMessage(step, sceneTitle));
};

export const notifySceneContinueStep = (
  step: Exclude<TrainingStepKey, "listen" | "done">,
) => {
  toast.message(getSceneContinueStepToastMessage(step));
};

export const notifySceneLoopPrompt = () => {
  toast.message(sceneDetailMessages.loopScenePrompt);
};

export const notifySceneExpressionFocused = () => {
  toast.message(sceneDetailMessages.focusExpressionPrompt);
};

export const notifySceneSentencePracticed = () => {
  toast.success(sceneDetailMessages.practiceSentencePrompt);
};

export const notifyScenePhraseAlreadySaved = () => {
  toast.message(sceneDetailMessages.savePhrase.existed);
};

export const notifyScenePhraseSaved = () => {
  toast.success(sceneDetailMessages.savePhrase.success);
};

export const notifyScenePhraseSaveFailed = (fallback?: string) => {
  toast.error(fallback ?? sceneDetailMessages.savePhrase.failed);
};

export const notifySceneFocusStepHint = () => {
  toast.message(sceneDetailMessages.focusStepHint);
};

export const notifySceneLoadError = (message: string) => {
  toast.error(message);
};
