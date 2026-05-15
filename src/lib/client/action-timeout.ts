const DEFAULT_CLIENT_ACTION_TIMEOUT_MS = 20000;

export class ClientActionTimeoutError extends Error {
  constructor(message = "操作超时，请稍后再试") {
    super(message);
    this.name = "ClientActionTimeoutError";
  }
}

export const isClientActionTimeoutError = (error: unknown): error is ClientActionTimeoutError =>
  error instanceof ClientActionTimeoutError;

export async function withClientActionTimeout<T>(
  promise: Promise<T>,
  options?: { timeoutMs?: number; timeoutMessage?: string },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CLIENT_ACTION_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new ClientActionTimeoutError(options?.timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
