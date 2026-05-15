import * as Sentry from "@sentry/nextjs";
import { getOrCreateRequestId } from "@/lib/server/request-context";

type LogLevel = "info" | "warn" | "error";

type LogContext = {
  request?: Request | null;
  requestId?: string;
  path?: string;
  method?: string;
  userId?: string | null;
  module?: string;
  errorCode?: string;
  error?: unknown;
  details?: Record<string, unknown> | null;
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const logServerEvent = (
  level: LogLevel,
  message: string,
  context: LogContext = {},
) => {
  const payload = {
    requestId: context.requestId ?? getOrCreateRequestId(context.request),
    path: context.path ?? context.request?.url ?? undefined,
    method: context.method ?? context.request?.method ?? undefined,
    userId: context.userId ?? null,
    module: context.module ?? "server",
    errorCode: context.errorCode,
    details: context.details ?? null,
    error: context.error == null ? undefined : toErrorMessage(context.error),
  };

  console[level](message, payload);
};

export const logApiError = (
  module: string,
  error: unknown,
  context: Omit<LogContext, "module" | "error"> = {},
) => {
  const requestId = context.requestId ?? getOrCreateRequestId(context.request);

  Sentry.addBreadcrumb({
    category: "api",
    message: `${module} failed`,
    level: "error",
    data: {
      requestId,
      path: context.path ?? context.request?.url,
      method: context.method ?? context.request?.method,
      userId: context.userId ?? null,
      errorCode: context.errorCode,
      errorMessage: toErrorMessage(error),
    },
  });

  logServerEvent("error", `${module} failed`, {
    ...context,
    requestId,
    module,
    error,
  });
};
