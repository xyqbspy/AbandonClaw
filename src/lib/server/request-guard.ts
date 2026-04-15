import { ForbiddenError } from "@/lib/server/errors";

const getConfiguredOrigins = () =>
  [
    process.env.APP_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

export const getAllowedOrigins = (request: Request) =>
  Array.from(new Set([new URL(request.url).origin, ...getConfiguredOrigins()]));

export const assertAllowedOrigin = (
  request: Request,
  options?: {
    allowMissingOrigin?: boolean;
    allowedOrigins?: string[];
  },
) => {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) {
    if (options?.allowMissingOrigin ?? true) return;
    throw new ForbiddenError("Cross-site requests are not allowed.");
  }

  const allowedOrigins = options?.allowedOrigins ?? getAllowedOrigins(request);
  if (!allowedOrigins.includes(origin)) {
    throw new ForbiddenError("Cross-site requests are not allowed.");
  }
};
