import { PracticeAssessmentLevel } from "@/lib/types/learning-flow";
import { ScenePracticeViewLabels } from "./scene-view-labels";

export const getPracticeAssessmentMessage = (
  assessment: PracticeAssessmentLevel | null | undefined,
  labels: ScenePracticeViewLabels,
) => {
  if (assessment === "complete") return labels.completeFeedback;
  if (assessment === "structure") return labels.structureFeedback;
  if (assessment === "keyword") return labels.keywordFeedback;
  if (assessment === "incorrect") return labels.incorrect;
  return null;
};

export const getPracticeCompletionHint = ({
  allModulesCompleted,
  allTypingCompleted,
  hasNextModule,
  nextModuleLabel,
  labels,
}: {
  allModulesCompleted: boolean;
  allTypingCompleted: boolean;
  hasNextModule: boolean;
  nextModuleLabel?: string | null;
  labels: ScenePracticeViewLabels;
}) => {
  if (allModulesCompleted) return labels.readyToComplete;
  if (allTypingCompleted && hasNextModule && nextModuleLabel) {
    return `当前题型已完成，继续进入“${nextModuleLabel}”。`;
  }
  return labels.completeAllTypingFirst;
};

export const getPracticeSourceText = ({
  sourceType,
  sourceSceneTitle,
  sourceVariantTitle,
  labels,
}: {
  sourceType?: "original" | "variant";
  sourceSceneTitle?: string | null;
  sourceVariantTitle?: string | null;
  labels: ScenePracticeViewLabels;
}) => {
  if (sourceType === "variant") {
    return `${sourceVariantTitle ?? "Variant"} / ${labels.basedOnScenePrefix}${sourceSceneTitle ?? "-"}`;
  }
  return sourceSceneTitle ?? "-";
};
