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

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

