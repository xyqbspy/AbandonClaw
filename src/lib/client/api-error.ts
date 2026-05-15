const NETWORK_ERROR_MESSAGE = "网络请求失败，请刷新后重试";
const RATE_LIMIT_ERROR_MESSAGE = "操作太频繁，请稍后再试";
const INVALID_INVITE_ERROR_MESSAGE = "邀请码无效或已过期";
const INVALID_CREDENTIALS_ERROR_MESSAGE = "邮箱或密码不正确";
const INVALID_SESSION_ERROR_MESSAGE = "登录状态已失效，请重新登录";
const VERIFY_CODE_SEND_ERROR_MESSAGE = "验证码发送失败，请稍后再试";
const PERMISSION_DENIED_ERROR_MESSAGE = "当前账号没有权限执行此操作";
const SERVICE_UNAVAILABLE_ERROR_MESSAGE = "服务暂时不可用，请稍后再试";

type ApiErrorBody = {
  error?: string;
  code?: string;
  requestId?: string;
};

type ReadableMessageContext =
  | "login"
  | "signup"
  | "send-email-code"
  | "review-submit"
  | "review-load"
  | "scenes-load"
  | "phrases-load"
  | "generic";

export class ClientApiError extends Error {
  status: number | null;
  code: string | null;
  requestId: string | null;
  rawMessage: string | null;

  constructor(params: {
    message: string;
    status?: number | null;
    code?: string | null;
    requestId?: string | null;
    rawMessage?: string | null;
  }) {
    super(params.message);
    this.name = "ClientApiError";
    this.status = params.status ?? null;
    this.code = params.code ?? null;
    this.requestId = params.requestId ?? null;
    this.rawMessage = params.rawMessage ?? null;
  }
}

const REQUEST_ID_PATTERN = /\brequest[-_\s]?id\b/i;

const isNetworkFailureMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed")
  );
};

const isInvalidInviteMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("invite code is invalid or expired") ||
    normalized.includes("invalid_invite_code") ||
    normalized.includes("missing_invite_code")
  );
};

const isInvalidCredentialsMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials") ||
    normalized.includes("email or password")
  );
};

const isVerifyCodeSendFailureMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("failed to send signup email code") ||
    normalized.includes("failed to send verification code email") ||
    normalized.includes("email provider is not configured")
  );
};

const isInvalidSessionMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();
  return (
    normalized === "unauthorized" ||
    normalized.includes("auth session missing") ||
    normalized.includes("email verification required") ||
    normalized.includes("jwt") ||
    normalized.includes("session")
  );
};

const resolveReadableMessage = (params: {
  status?: number | null;
  code?: string | null;
  rawMessage?: string | null;
  fallbackMessage?: string;
  context?: ReadableMessageContext;
}) => {
  const rawMessage = params.rawMessage?.trim() ?? "";
  const status = params.status ?? null;
  const code = params.code?.trim() ?? "";

  if (rawMessage && isNetworkFailureMessage(rawMessage)) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (status === 429 || code === "RATE_LIMITED" || rawMessage.toLowerCase().includes("too many requests")) {
    return RATE_LIMIT_ERROR_MESSAGE;
  }

  if (isInvalidInviteMessage(rawMessage)) {
    return INVALID_INVITE_ERROR_MESSAGE;
  }

  if (status === 401 && params.context === "login") {
    return INVALID_CREDENTIALS_ERROR_MESSAGE;
  }

  if (code === "AUTH_UNAUTHORIZED" || (status === 401 && params.context !== "login")) {
    return params.context === "login"
      ? INVALID_CREDENTIALS_ERROR_MESSAGE
      : INVALID_SESSION_ERROR_MESSAGE;
  }

  if (status === 403 || code === "AUTH_FORBIDDEN") {
    if (isInvalidSessionMessage(rawMessage)) {
      return INVALID_SESSION_ERROR_MESSAGE;
    }
    return PERMISSION_DENIED_ERROR_MESSAGE;
  }

  if (isInvalidCredentialsMessage(rawMessage)) {
    return INVALID_CREDENTIALS_ERROR_MESSAGE;
  }

  if (params.context === "send-email-code" && isVerifyCodeSendFailureMessage(rawMessage)) {
    return VERIFY_CODE_SEND_ERROR_MESSAGE;
  }

  if (params.context === "send-email-code" && status === 500) {
    return VERIFY_CODE_SEND_ERROR_MESSAGE;
  }

  if (status !== null && status >= 500) {
    return params.fallbackMessage ?? SERVICE_UNAVAILABLE_ERROR_MESSAGE;
  }

  if (rawMessage && !REQUEST_ID_PATTERN.test(rawMessage)) {
    return rawMessage;
  }

  return params.fallbackMessage ?? SERVICE_UNAVAILABLE_ERROR_MESSAGE;
};

const logRequestId = ({
  requestId,
  status,
  code,
  rawMessage,
  context,
}: {
  requestId: string | null;
  status: number | null;
  code: string | null;
  rawMessage: string | null;
  context: ReadableMessageContext;
}) => {
  if (!requestId) return;
  console.error(`[client-api:${context}] requestId=${requestId}`, {
    status,
    code,
    error: rawMessage,
  });
};

export const createClientApiError = async (
  response: Response,
  options: {
    fallbackMessage?: string;
    context?: ReadableMessageContext;
  } = {},
) => {
  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = null;
  }

  const requestId =
    body?.requestId?.trim() || response.headers.get("x-request-id")?.trim() || null;
  const code = body?.code?.trim() || null;
  const rawMessage = body?.error?.trim() || null;
  const context = options.context ?? "generic";

  logRequestId({
    requestId,
    status: response.status,
    code,
    rawMessage,
    context,
  });

  return new ClientApiError({
    message: resolveReadableMessage({
      status: response.status,
      code,
      rawMessage,
      fallbackMessage: options.fallbackMessage,
      context,
    }),
    status: response.status,
    code,
    requestId,
    rawMessage,
  });
};

export const normalizeClientError = (
  error: unknown,
  options: {
    fallbackMessage?: string;
    context?: ReadableMessageContext;
  } = {},
) => {
  const context = options.context ?? "generic";

  if (error instanceof ClientApiError) {
    return error;
  }

  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = resolveReadableMessage({
    rawMessage,
    fallbackMessage: options.fallbackMessage,
    context,
  });

  return new ClientApiError({
    message: normalizedMessage,
    rawMessage: rawMessage || null,
  });
};

export const clientErrorMessages = {
  invalidCredentials: INVALID_CREDENTIALS_ERROR_MESSAGE,
  invalidInvite: INVALID_INVITE_ERROR_MESSAGE,
  invalidSession: INVALID_SESSION_ERROR_MESSAGE,
  network: NETWORK_ERROR_MESSAGE,
  permissionDenied: PERMISSION_DENIED_ERROR_MESSAGE,
  rateLimited: RATE_LIMIT_ERROR_MESSAGE,
  serviceUnavailable: SERVICE_UNAVAILABLE_ERROR_MESSAGE,
  verifyCodeSendFailed: VERIFY_CODE_SEND_ERROR_MESSAGE,
};
