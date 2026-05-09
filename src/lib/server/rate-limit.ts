import { RateLimitError } from "@/lib/server/errors";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type EnforceRateLimitParams = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
  scope?: string;
};

type RateLimitBackend = {
  kind: "memory" | "upstash";
  enforce: (params: EnforceRateLimitParams) => Promise<void>;
};

type HighCostRateLimitParams = {
  request: Request;
  userId: string;
  scope: string;
  userLimit: number;
  ipLimit: number;
  windowMs: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

let backendCache: RateLimitBackend | null = null;

const toRateLimitKey = (key: string, scope?: string) => `${scope ?? "default"}:${key}`;

const enforceMemoryRateLimit = async (params: EnforceRateLimitParams) => {
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

const createMemoryRateLimitBackend = (): RateLimitBackend => ({
  kind: "memory",
  enforce: enforceMemoryRateLimit,
});

const getUpstashConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) return null;
  return { url, token };
};

export const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
};

const callUpstashPipeline = async (
  config: { url: string; token: string },
  commands: unknown[][],
) => {
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as Array<{
    result?: unknown;
    error?: string;
  }>;

  if (!Array.isArray(payload)) {
    throw new Error("Upstash rate limit response is invalid.");
  }

  const failed = payload.find((item) => typeof item?.error === "string" && item.error);
  if (failed?.error) {
    throw new Error(`Upstash rate limit pipeline failed: ${failed.error}`);
  }

  return payload;
};

const createUpstashRateLimitBackend = (config: { url: string; token: string }): RateLimitBackend => ({
  kind: "upstash",
  enforce: async (params) => {
    const storeKey = toRateLimitKey(params.key, params.scope);
    const windowSeconds = Math.max(1, Math.ceil(params.windowMs / 1000));
    const payload = await callUpstashPipeline(config, [
      ["INCR", storeKey],
      ["TTL", storeKey],
      ["EXPIRE", storeKey, windowSeconds, "NX"],
    ]);

    const count = Number(payload[0]?.result ?? 0);
    const ttlSecondsRaw = Number(payload[1]?.result ?? -1);
    const ttlSeconds =
      Number.isFinite(ttlSecondsRaw) && ttlSecondsRaw > 0 ? ttlSecondsRaw : windowSeconds;

    if (count > params.limit) {
      throw new RateLimitError(ttlSeconds);
    }
  },
});

const getRateLimitBackend = () => {
  if (backendCache) return backendCache;

  const upstashConfig = getUpstashConfig();
  backendCache = upstashConfig
    ? createUpstashRateLimitBackend(upstashConfig)
    : createMemoryRateLimitBackend();
  return backendCache;
};

export const enforceRateLimit = async (params: EnforceRateLimitParams) => {
  const backend = getRateLimitBackend();

  if (backend.kind === "memory") {
    await backend.enforce(params);
    return;
  }

  try {
    await backend.enforce(params);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    await enforceMemoryRateLimit(params);
  }
};

export const enforceHighCostRateLimit = async ({
  request,
  userId,
  scope,
  userLimit,
  ipLimit,
  windowMs,
}: HighCostRateLimitParams) => {
  const clientIp = getClientIp(request);

  await enforceRateLimit({
    key: `user:${userId}`,
    limit: userLimit,
    windowMs,
    scope,
  });
  await enforceRateLimit({
    key: `ip:${clientIp}`,
    limit: ipLimit,
    windowMs,
    scope,
  });
};

export const getRateLimitBackendStatus = () => {
  const backend = getRateLimitBackend();
  return {
    kind: backend.kind,
    upstashConfigured: Boolean(getUpstashConfig()),
  };
};

export const clearRateLimitStore = () => {
  rateLimitStore.clear();
  backendCache = null;
};
