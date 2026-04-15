import { RateLimitError } from "@/lib/server/errors";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const toRateLimitKey = (key: string, scope?: string) => `${scope ?? "default"}:${key}`;

export const enforceRateLimit = (params: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
  scope?: string;
}) => {
  const now = params.now ?? Date.now();
  const storeKey = toRateLimitKey(params.key, params.scope);
  const current = rateLimitStore.get(storeKey);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(storeKey, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return;
  }

  if (current.count >= params.limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
  }

  current.count += 1;
  rateLimitStore.set(storeKey, current);
};

export const clearRateLimitStore = () => {
  rateLimitStore.clear();
};
