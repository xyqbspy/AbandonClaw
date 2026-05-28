export class AppError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(params: {
    message: string;
    status: number;
    code: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = "AppError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super({ message, status: 401, code: "AUTH_UNAUTHORIZED" });
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super({ message, status: 403, code: "AUTH_FORBIDDEN" });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not Found") {
    super({ message, status: 404, code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ message, status: 400, code: "VALIDATION_ERROR", details });
    this.name = "ValidationError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number, message = "Too many requests.") {
    super({
      message,
      status: 429,
      code: "RATE_LIMITED",
      details: { retryAfterSeconds },
    });
    this.name = "RateLimitError";
  }
}

export class DailyQuotaExceededError extends AppError {
  constructor(message = "Daily quota exceeded.", details?: Record<string, unknown>) {
    super({
      message,
      status: 429,
      code: "DAILY_QUOTA_EXCEEDED",
      details,
    });
    this.name = "DailyQuotaExceededError";
  }
}

export class HighCostCapabilityDisabledError extends AppError {
  constructor(message = "This capability is temporarily disabled.", details?: Record<string, unknown>) {
    super({
      message,
      status: 503,
      code: "HIGH_COST_CAPABILITY_DISABLED",
      details,
    });
    this.name = "HighCostCapabilityDisabledError";
  }
}

export class SceneParseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ message, status: 422, code: "SCENE_PARSE_ERROR", details });
    this.name = "SceneParseError";
  }
}

export class TtsGenerationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ message, status: 502, code: "TTS_GENERATION_FAILED", details });
    this.name = "TtsGenerationError";
  }
}

export class AnonIdRequiredError extends AppError {
  constructor(message = "Anonymous identifier is required.") {
    super({ message, status: 400, code: "ANON_ID_REQUIRED" });
    this.name = "AnonIdRequiredError";
  }
}

export class AnonFeatureDisabledError extends AppError {
  constructor(capability: string, message = "This feature is not available in anonymous mode.") {
    super({
      message,
      status: 403,
      code: "ANON_FEATURE_DISABLED",
      details: { capability },
    });
    this.name = "AnonFeatureDisabledError";
  }
}

export class AnonIpRateLimitedError extends AppError {
  constructor(message = "Too many anonymous requests from this network.") {
    super({ message, status: 429, code: "ANON_IP_RATE_LIMITED" });
    this.name = "AnonIpRateLimitedError";
  }
}

export class AnonQuotaExceededGlobalError extends AppError {
  constructor(capability: string, details?: Record<string, unknown>) {
    super({
      message: "Anonymous global daily quota exceeded.",
      status: 429,
      code: "ANON_QUOTA_EXCEEDED_GLOBAL",
      details: { capability, ...(details ?? {}) },
    });
    this.name = "AnonQuotaExceededGlobalError";
  }
}

export class AnonQuotaExceededSessionError extends AppError {
  constructor(capability: string, details?: Record<string, unknown>) {
    super({
      message: "Anonymous session daily quota exceeded.",
      status: 429,
      code: "ANON_QUOTA_EXCEEDED_SESSION",
      details: { capability, ...(details ?? {}) },
    });
    this.name = "AnonQuotaExceededSessionError";
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

