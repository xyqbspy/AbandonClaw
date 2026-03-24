import {
  notifyChunksActionMessage,
  notifyChunksActionSucceeded,
  notifyChunksLoadFailed,
  notifyChunksMissingExpression,
  notifyChunksNoSourceSentence,
  notifyChunksQuickAddCopyFailed,
  notifyChunksQuickAddCopySuccess,
  notifyChunksRegenerateAudioFailed,
  notifyChunksRegenerateAudioSuccess,
  notifyChunksRetryEnrichmentFailed,
  notifyChunksRetryEnrichmentSuccess,
} from "./chunks-page-notify";

export const notifyChunksFocusDetailCandidateSaved = (message: string) =>
  notifyChunksActionSucceeded(message);

export const notifyChunksFocusDetailQuickAddValidation = (message: string) =>
  notifyChunksActionMessage(message);

export const notifyChunksFocusDetailQuickAddSucceeded = (message: string) =>
  notifyChunksActionSucceeded(message);

export const notifyChunksFocusDetailQuickAddFailed = (message?: string | null) =>
  notifyChunksLoadFailed(message);

export const notifyChunksFocusDetailRetryEnrichmentSuccess = () =>
  notifyChunksRetryEnrichmentSuccess();

export const notifyChunksFocusDetailRetryEnrichmentFailed = (message?: string | null) =>
  notifyChunksRetryEnrichmentFailed(message);

export const notifyChunksFocusDetailCopyTargetSuccess = () =>
  notifyChunksQuickAddCopySuccess();

export const notifyChunksFocusDetailCopyTargetFailed = () =>
  notifyChunksQuickAddCopyFailed();

export const notifyChunksFocusDetailRegenerateAudioSuccess = () =>
  notifyChunksRegenerateAudioSuccess();

export const notifyChunksFocusDetailRegenerateAudioFailed = (message?: string | null) =>
  notifyChunksRegenerateAudioFailed(message);

export const notifyChunksFocusDetailMissingExpression = () =>
  notifyChunksMissingExpression();

export const notifyChunksFocusDetailNoSourceSentence = () =>
  notifyChunksNoSourceSentence();
