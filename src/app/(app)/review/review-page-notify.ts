import { toast } from "sonner";
import { ReviewSummaryResponse } from "@/lib/utils/review-api";
import { ReviewPageLabels } from "./review-page-labels";

export const notifyReviewLoadFailed = (message: string) => toast.error(message);

export const notifyReviewSubmitFailed = (message: string) => toast.error(message);

const getPhraseReviewSubmittedMessage = (
  labels: ReviewPageLabels,
  summary?: ReviewSummaryResponse,
) => {
  if (!summary) return labels.submitOk;
  if (summary.dueReviewCount > 0) {
    return `${labels.submitOk} 还剩 ${summary.dueReviewCount} 条待回忆。`;
  }
  return `${labels.submitOk} 今天这轮回忆先收住了。`;
};

const getPhraseReviewSubmittedDescription = (summary?: ReviewSummaryResponse) => {
  if (!summary) return undefined;
  if (summary.dueReviewCount > 0) {
    return `已完成 ${summary.reviewedTodayCount} 条，继续下一条会更稳。`;
  }
  return `已完成 ${summary.reviewedTodayCount} 条，可以回到 today 继续推进场景。`;
};

export const notifyPhraseReviewSubmitted = (
  labels: ReviewPageLabels,
  summary?: ReviewSummaryResponse,
) =>
  toast.success(getPhraseReviewSubmittedMessage(labels, summary), {
    description: getPhraseReviewSubmittedDescription(summary),
  });

export const notifyInlinePracticeMissingAnswer = (labels: ReviewPageLabels) =>
  toast.error(labels.practiceMissingAnswer);

export const notifyInlinePracticeMissingExpectedAnswer = (labels: ReviewPageLabels) =>
  toast.error(labels.practiceMissingExpectedAnswer);

export const notifyInlinePracticeCompleted = (labels: ReviewPageLabels) =>
  toast.success(labels.practiceInlineCompleted);

export const notifyInlinePracticeRecorded = (labels: ReviewPageLabels) =>
  toast.success(labels.practiceInlineRecorded);

export const notifyInlinePracticeFailed = (message: string) => toast.error(message);
