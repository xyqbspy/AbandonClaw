import { toast } from "sonner";
import { ReviewPageLabels } from "./review-page-labels";

export const notifyReviewLoadFailed = (message: string) => toast.error(message);

export const notifyReviewSubmitFailed = (message: string) => toast.error(message);

export const notifyPhraseReviewSubmitted = (labels: ReviewPageLabels) =>
  toast.success(labels.submitOk);

export const notifyInlinePracticeMissingAnswer = (labels: ReviewPageLabels) =>
  toast.error(labels.practiceMissingAnswer);

export const notifyInlinePracticeMissingExpectedAnswer = (labels: ReviewPageLabels) =>
  toast.error(labels.practiceMissingExpectedAnswer);

export const notifyInlinePracticeCompleted = (labels: ReviewPageLabels) =>
  toast.success(labels.practiceInlineCompleted);

export const notifyInlinePracticeRecorded = (labels: ReviewPageLabels) =>
  toast.success(labels.practiceInlineRecorded);

export const notifyInlinePracticeFailed = (message: string) => toast.error(message);
