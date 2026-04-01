const DEFAULT_UPSTREAM_TIMEOUT_MS = 15000;

export const getUpstreamTimeoutMs = (override?: number) =>
  override ?? Number(process.env.UPSTREAM_FETCH_TIMEOUT_MS ?? DEFAULT_UPSTREAM_TIMEOUT_MS);

export const isAbortLikeError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = getUpstreamTimeoutMs(),
  fetchImpl: typeof fetch = fetch,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
