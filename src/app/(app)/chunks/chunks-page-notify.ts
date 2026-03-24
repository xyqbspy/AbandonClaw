import { toast } from "sonner";
import { chunksPageMessages as zh } from "./chunks-page-messages";

export const notifyChunksLoadFailed = (message?: string | null) =>
  toast.error(message || zh.loadFailed);

export const notifyChunksActionSucceeded = (message: string) => toast.success(message);

export const notifyChunksActionMessage = (message: string) => toast.message(message);

export const notifyChunksSentenceReviewPending = () => toast.message(zh.sentenceReviewPending);

export const notifyChunksReviewFamilyStarted = () => toast.success(zh.reviewFamilyFeedback);

export const notifyChunksReviewStarted = () => toast.success(zh.reviewStartFeedback);

export const notifyChunksExpressionComposerOpened = () =>
  toast.message(zh.sentenceOpenExpressionComposer);

export const notifyChunksSentenceExpressionSaved = () =>
  toast.success(zh.sentenceExpressionSaved);

export const notifyChunksExpressionMapOpened = () => toast.success(zh.openMapFeedback);

export const notifyChunksSelectAtLeastOne = () => toast.message(zh.selectAtLeastOne);

export const notifyChunksRetryEnrichmentSuccess = () =>
  toast.success(zh.retryEnrichmentSuccess);

export const notifyChunksRetryEnrichmentFailed = (message?: string | null) =>
  toast.error(message || zh.retryEnrichmentFailed);

export const notifyChunksSpeechUnsupported = (message?: string | null) =>
  toast.error(message || zh.speechUnsupported);

export const notifyChunksMissingExpression = () => toast.error(zh.missingExpression);

export const notifyChunksMissingSentence = () => toast.error(zh.missingSentence);

export const notifyChunksQuickAddCopySuccess = () => toast.success(zh.quickAddCopySuccess);

export const notifyChunksQuickAddCopyFailed = () => toast.error(zh.quickAddCopyFailed);

export const notifyChunksNoSourceSentence = () => toast.message(zh.noSourceSentence);

export const notifyChunksRegenerateAudioSuccess = () =>
  toast.success(zh.regenerateAudioSuccess);

export const notifyChunksRegenerateAudioFailed = (message?: string | null) =>
  toast.error(message || zh.regenerateAudioFailed);
