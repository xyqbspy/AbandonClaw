import { toast } from "sonner";
import { PracticeAssessmentLevel, PracticeMode, PracticeModule } from "@/lib/types/learning-flow";
import { ScenePracticeViewLabels } from "./scene-view-labels";

export const notifyPracticeModuleCompleted = (
  labels: ScenePracticeViewLabels,
  moduleLabel: string,
) => {
  const message = `${labels.moduleCompletedPrefix}${moduleLabel}`;
  toast.success(message);
  return message;
};

export const notifyPracticeModuleUnlocked = (
  labels: ScenePracticeViewLabels,
  moduleLabel: string,
) => {
  const message = `${labels.moduleUnlockedPrefix}${moduleLabel}`;
  toast.message(message);
  return message;
};

export const notifyAllPracticeModulesCompleted = (labels: ScenePracticeViewLabels) => {
  toast.success(labels.allModulesCompletedToast);
  return labels.allModulesCompletedToast;
};

export const notifyPracticeSentenceMilestone = (
  labels: ScenePracticeViewLabels,
  assessment: PracticeAssessmentLevel,
) => {
  const message =
    assessment === "complete"
      ? labels.sentenceUpgradeComplete
      : assessment === "structure"
        ? labels.sentenceUpgradeStructure
        : assessment === "keyword"
          ? labels.sentenceUpgradeKeyword
          : null;

  if (!message) return null;
  toast.success(message);
  return message;
};

export const buildReportedUnlockedModesSeed = (modules: PracticeModule[]) =>
  new Set<PracticeMode>(modules.length > 0 && modules[0]?.mode ? [modules[0].mode] : []);
