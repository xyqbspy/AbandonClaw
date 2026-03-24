import { PracticeAssessmentLevel, PracticeMode } from "@/lib/types/learning-flow";
import { DueScenePracticeReviewItemResponse } from "@/lib/utils/review-api";
import {
  PRACTICE_ASSESSMENT_SHORT_LABELS,
  PRACTICE_MODE_LABELS,
} from "@/lib/shared/scene-training-copy";
import { ReviewPageLabels } from "./review-page-labels";

export const reviewModeLabelMap: Record<
  DueScenePracticeReviewItemResponse["recommendedMode"],
  string
> = {
  cloze: PRACTICE_MODE_LABELS.cloze,
  guided_recall: PRACTICE_MODE_LABELS.guided_recall,
  sentence_recall: PRACTICE_MODE_LABELS.sentence_recall,
  full_dictation: PRACTICE_MODE_LABELS.full_dictation,
};

export const assessmentLabelMap: Record<
  Exclude<DueScenePracticeReviewItemResponse["assessmentLevel"], "complete">,
  string
> = {
  incorrect: PRACTICE_ASSESSMENT_SHORT_LABELS.incorrect,
  keyword: PRACTICE_ASSESSMENT_SHORT_LABELS.keyword,
  structure: PRACTICE_ASSESSMENT_SHORT_LABELS.structure,
};

export const buildReviewInlinePracticeSetId = (item: DueScenePracticeReviewItemResponse) =>
  `review-inline:${item.sceneSlug}:${item.exerciseId}:${item.recommendedMode}`;

export const getInlinePracticeFeedback = (
  assessment: PracticeAssessmentLevel | null | undefined,
  labels: ReviewPageLabels,
) => {
  if (assessment === "complete") return labels.practiceCompleteFeedback;
  if (assessment === "structure") return labels.practiceStructureFeedback;
  if (assessment === "keyword") return labels.practiceKeywordFeedback;
  if (assessment === "incorrect") return labels.practiceIncorrectFeedback;
  return null;
};

export const getReviewModeAccentClassName = (mode: PracticeMode) => {
  if (mode === "guided_recall") return "bg-sky-50 text-sky-700";
  if (mode === "sentence_recall") return "bg-amber-50 text-amber-700";
  if (mode === "full_dictation") return "bg-emerald-50 text-emerald-700";
  return "bg-muted text-muted-foreground";
};

export const getInlinePracticePlaceholder = (
  mode: PracticeMode,
  labels: ReviewPageLabels,
) => {
  if (mode === "guided_recall") return labels.practiceGuidedRecallPlaceholder;
  if (mode === "sentence_recall") return labels.practiceSentenceRecallPlaceholder;
  if (mode === "full_dictation") return labels.practiceFullDictationPlaceholder;
  return labels.practiceInputPlaceholder;
};
