export type SceneFullFailureReason =
  | "provider_error"
  | "timeout"
  | "segment_assembly_failed"
  | "storage_upload_failed"
  | "signed_url_failed"
  | "empty_audio_result"
  | "cooling_down"
  | "unknown";

export const sceneFullFailureReasons = new Set<SceneFullFailureReason>([
  "provider_error",
  "timeout",
  "segment_assembly_failed",
  "storage_upload_failed",
  "signed_url_failed",
  "empty_audio_result",
  "cooling_down",
  "unknown",
]);

export const normalizeSceneFullFailureReason = (value: unknown): SceneFullFailureReason => {
  if (typeof value === "string" && sceneFullFailureReasons.has(value as SceneFullFailureReason)) {
    return value as SceneFullFailureReason;
  }
  return "unknown";
};

export const inferSceneFullFailureReason = (error: unknown): SceneFullFailureReason => {
  if (!error) return "unknown";

  const maybeDetails =
    typeof error === "object" && "details" in error
      ? (error as { details?: Record<string, unknown> }).details
      : null;
  const detailReason = normalizeSceneFullFailureReason(maybeDetails?.failureReason);
  if (detailReason !== "unknown") return detailReason;

  const maybeName =
    typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name) : "";
  const maybeMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = maybeMessage.toLowerCase();

  if (maybeName === "AbortError" || lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return "timeout";
  }
  if (lowerMessage.includes("segment") || lowerMessage.includes("segments")) {
    return "segment_assembly_failed";
  }
  if (lowerMessage.includes("no audio data") || lowerMessage.includes("empty audio")) {
    return "empty_audio_result";
  }
  if (lowerMessage.includes("storage") || lowerMessage.includes("upload")) {
    return "storage_upload_failed";
  }
  if (lowerMessage.includes("signed url") || lowerMessage.includes("signature")) {
    return "signed_url_failed";
  }
  if (maybeMessage) return "provider_error";
  return "unknown";
};
