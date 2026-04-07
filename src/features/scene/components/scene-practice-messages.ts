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
  generationSource,
  sourceType,
  sourceSceneTitle,
  sourceVariantTitle,
  labels,
}: {
  generationSource?: "ai" | "system";
  sourceType?: "original" | "variant";
  sourceSceneTitle?: string | null;
  sourceVariantTitle?: string | null;
  labels: ScenePracticeViewLabels;
}) => {
  const generationLabel =
    generationSource === "system" ? labels.generatedBySystem : labels.generatedByAi;

  if (sourceType === "variant") {
    return [
      labels.basedOnVariantPrefix.replace(/[:：]\s*$/, ""),
      generationLabel,
    ].join(labels.sourceDivider) + `：${sourceVariantTitle ?? "Variant"} / ${labels.basedOnScenePrefix}${sourceSceneTitle ?? "-"}`;
  }
  return [
    labels.basedOnScenePrefix.replace(/[:：]\s*$/, ""),
    generationLabel,
  ].join(labels.sourceDivider) + `：${sourceSceneTitle ?? "-"}`;
};
