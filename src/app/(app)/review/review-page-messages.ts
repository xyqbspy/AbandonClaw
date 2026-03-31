import { PracticeAssessmentLevel, PracticeMode } from "@/lib/types/learning-flow";
import { DueScenePracticeReviewItemResponse } from "@/lib/utils/review-api";
import { ReviewPageLabels } from "./review-page-labels";

export const reviewModeLabelMap: Record<
  DueScenePracticeReviewItemResponse["recommendedMode"],
  string
> = {
  cloze: "填空复现",
  guided_recall: "提示回忆",
  sentence_recall: "整句复现",
  full_dictation: "整段默写",
};

export const assessmentLabelMap: Record<
  Exclude<DueScenePracticeReviewItemResponse["assessmentLevel"], "complete">,
  string
> = {
  incorrect: "还不稳",
  keyword: "抓到关键词",
  structure: "骨架对上了",
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
  return "bg-slate-100 text-slate-700";
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
