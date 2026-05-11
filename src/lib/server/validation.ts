import { ValidationError } from "@/lib/server/errors";
import { UserAccessStatus } from "@/lib/server/db/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const parseRequiredTrimmedString = (
  value: unknown,
  field: string,
  maxLength?: number,
) => {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${field} is required.`);
  }
  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`${field} must be <= ${maxLength} characters.`);
  }
  return trimmed;
};

export const parseJsonBody = async <T extends Record<string, unknown>>(
  request: Request,
): Promise<T> => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return payload as T;
};

export const parseRequiredObjectArray = (
  value: unknown,
  field: string,
  options?: {
    minItems?: number;
    maxItems?: number;
  },
) => {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array.`);
  }

  const minItems = options?.minItems ?? 1;
  const maxItems = options?.maxItems;

  if (value.length < minItems) {
    throw new ValidationError(`${field} must contain at least ${minItems} item(s).`);
  }

  if (maxItems && value.length > maxItems) {
    throw new ValidationError(`${field} must contain at most ${maxItems} item(s).`);
  }

  const objects = value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  if (objects.length !== value.length) {
    throw new ValidationError(`${field} must contain only objects.`);
  }

  return objects;
};

export const parseOptionalTrimmedString = (
  value: unknown,
  field: string,
  maxLength?: number,
) => {
  if (value == null) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`${field} must be <= ${maxLength} characters.`);
  }
  return trimmed;
};

export const parseRequiredStringArray = (
  value: unknown,
  field: string,
  options?: {
    maxItems?: number;
    maxItemLength?: number;
    dedupe?: boolean;
  },
) => {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array.`);
  }

  const maxItems = options?.maxItems ?? 100;
  const maxItemLength = options?.maxItemLength;
  const dedupe = options?.dedupe !== false;
  const items = value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .map((item) => (maxItemLength ? item.slice(0, maxItemLength) : item));

  const normalizedItems = dedupe ? Array.from(new Set(items)) : items;
  const slicedItems = normalizedItems.slice(0, maxItems);

  if (slicedItems.length === 0) {
    throw new ValidationError(`${field} is required.`);
  }

  return slicedItems;
};

export const parseVariantCount = (value: unknown, fallback = 3) => {
  if (value == null) return fallback;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError("variantCount must be a number.");
  }
  return clamp(Math.round(value), 1, 3);
};

export const parseRetainChunkRatio = (value: unknown, fallback = 0.6) => {
  if (value == null) return fallback;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError("retainChunkRatio must be a number.");
  }
  return clamp(value, 0.5, 0.7);
};

export const parseBooleanFromForm = (
  value: FormDataEntryValue | null,
  fallback = false,
) => {
  if (typeof value !== "string") return fallback;
  return value.toLowerCase() === "true";
};

export const parseRequiredIdFromForm = (
  value: FormDataEntryValue | null,
  fieldName = "id",
) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  return value.trim();
};

export const parseUserAccessStatus = (
  value: unknown,
  fieldName = "accessStatus",
): UserAccessStatus => {
  if (
    value === "active" ||
    value === "disabled" ||
    value === "generation_limited" ||
    value === "readonly"
  ) {
    return value;
  }

  throw new ValidationError(
    `${fieldName} must be one of active/disabled/generation_limited/readonly.`,
  );
};

export const parseOptionalUserAccessStatusFilter = (
  value: unknown,
): UserAccessStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return parseUserAccessStatus(normalized, "accessStatus");
};

export const parseProgressPercent = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError("progressPercent must be a number.");
  }
  return clamp(value, 0, 100);
};

export const parseOptionalNonNegativeInt = (value: unknown, fieldName: string) => {
  if (value == null) return undefined;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number.`);
  }
  const rounded = Math.floor(value);
  if (rounded < 0) {
    throw new ValidationError(`${fieldName} must be >= 0.`);
  }
  return rounded;
};

export const parseOptionalNonNegativeDelta = (value: unknown, fieldName: string) => {
  if (value == null) return 0;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number.`);
  }
  const rounded = Math.floor(value);
  if (rounded < 0) {
    throw new ValidationError(`${fieldName} must be >= 0.`);
  }
  return rounded;
};

export type ProgressStatusFilter =
  | "not_started"
  | "in_progress"
  | "completed"
  | "paused";

export const parseOptionalStatusFilter = (
  value: unknown,
): ProgressStatusFilter | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (
    normalized !== "not_started" &&
    normalized !== "in_progress" &&
    normalized !== "completed" &&
    normalized !== "paused"
  ) {
    throw new ValidationError("status must be one of not_started/in_progress/completed/paused.");
  }
  return normalized;
};

export type ReviewResult = "again" | "hard" | "good";
export type ReviewRecognitionState = "recognized" | "unknown";
export type ReviewOutputConfidence = "high" | "low";
export type ReviewFullOutputStatus = "completed" | "not_started";
export type ReviewVariantRewriteStatus = "completed" | "not_started";
export type ReviewVariantRewritePromptId = "self" | "colleague" | "past";
export type ReviewFullOutputCoverage =
  | "contains_target"
  | "missing_target"
  | "not_started";

export const parseReviewResult = (value: unknown): ReviewResult => {
  if (value === "again" || value === "hard" || value === "good") {
    return value;
  }
  throw new ValidationError("reviewResult must be one of again/hard/good.");
};

export const parseOptionalReviewRecognitionState = (
  value: unknown,
): ReviewRecognitionState | undefined => {
  if (value == null) return undefined;
  if (value === "recognized" || value === "unknown") return value;
  throw new ValidationError("recognitionState must be one of recognized/unknown.");
};

export const parseOptionalReviewOutputConfidence = (
  value: unknown,
): ReviewOutputConfidence | undefined => {
  if (value == null) return undefined;
  if (value === "high" || value === "low") return value;
  throw new ValidationError("outputConfidence must be one of high/low.");
};

export const parseOptionalReviewFullOutputStatus = (
  value: unknown,
): ReviewFullOutputStatus | undefined => {
  if (value == null) return undefined;
  if (value === "completed" || value === "not_started") return value;
  throw new ValidationError("fullOutputStatus must be one of completed/not_started.");
};

export const parseOptionalReviewVariantRewriteStatus = (
  value: unknown,
): ReviewVariantRewriteStatus | undefined => {
  if (value == null) return undefined;
  if (value === "completed" || value === "not_started") return value;
  throw new ValidationError("variantRewriteStatus must be one of completed/not_started.");
};

export const parseOptionalReviewVariantRewritePromptId = (
  value: unknown,
): ReviewVariantRewritePromptId | undefined => {
  if (value == null) return undefined;
  if (value === "self" || value === "colleague" || value === "past") return value;
  throw new ValidationError("variantRewritePromptId must be one of self/colleague/past.");
};

export const parseOptionalReviewFullOutputCoverage = (
  value: unknown,
): ReviewFullOutputCoverage | undefined => {
  if (value == null) return undefined;
  if (
    value === "contains_target" ||
    value === "missing_target" ||
    value === "not_started"
  ) {
    return value;
  }
  throw new ValidationError(
    "fullOutputCoverage must be one of contains_target/missing_target/not_started.",
  );
};

export const parsePracticeMode = (value: unknown) => {
  if (
    value === "cloze" ||
    value === "guided_recall" ||
    value === "sentence_recall" ||
    value === "full_dictation"
  ) {
    return value;
  }
  throw new ValidationError(
    "mode must be one of cloze/guided_recall/sentence_recall/full_dictation.",
  );
};

export const parsePracticeAssessmentLevel = (value: unknown) => {
  if (
    value === "incorrect" ||
    value === "keyword" ||
    value === "structure" ||
    value === "complete"
  ) {
    return value;
  }
  throw new ValidationError(
    "assessmentLevel must be one of incorrect/keyword/structure/complete.",
  );
};

export const parseSourceType = (value: unknown) => {
  if (value === "original" || value === "variant") return value;
  throw new ValidationError("sourceType must be one of original/variant.");
};

export const parseOptionalBoolean = (value: unknown, fieldName: string) => {
  if (value == null) return undefined;
  if (typeof value !== "boolean") {
    throw new ValidationError(`${fieldName} must be a boolean.`);
  }
  return value;
};

export const parseOptionalJsonObject = (value: unknown, fieldName: string) => {
  if (value == null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object.`);
  }
  return value as Record<string, unknown>;
};
