export const REQUEST_ID_HEADER = "x-request-id";

const fallbackRequestId = () =>
  `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const createRequestId = () => globalThis.crypto?.randomUUID?.() ?? fallbackRequestId();

const toHeaders = (
  value?: Request | Headers | { headers?: HeadersInit | undefined } | null,
) => {
  if (!value) return null;
  if (value instanceof Headers) return value;
  if (typeof Request !== "undefined" && value instanceof Request) {
    return value.headers;
  }
  if ("headers" in value && value.headers) {
    return new Headers(value.headers);
  }
  return null;
};

export const getRequestId = (
  value?: Request | Headers | { headers?: HeadersInit | undefined } | null,
) => {
  const headers = toHeaders(value);
  const requestId = headers?.get(REQUEST_ID_HEADER)?.trim();
  return requestId || null;
};

export const getOrCreateRequestId = (
  value?: Request | Headers | { headers?: HeadersInit | undefined } | null,
) => getRequestId(value) ?? createRequestId();

export const attachRequestIdToResponse = <T extends Response>(response: T, requestId: string) => {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
};
