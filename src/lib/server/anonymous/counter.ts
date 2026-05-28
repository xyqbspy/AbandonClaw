interface CounterState {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, CounterState>();

const getUpstashConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
};

interface IncrResult {
  count: number;
  ttlSeconds: number;
}

const incrMemoryCounter = (
  key: string,
  ttlSeconds: number,
  now: number,
): IncrResult => {
  const current = memoryStore.get(key);
  if (!current || current.resetAt <= now) {
    const state = { count: 1, resetAt: now + ttlSeconds * 1000 };
    memoryStore.set(key, state);
    return { count: 1, ttlSeconds };
  }
  current.count += 1;
  memoryStore.set(key, current);
  return {
    count: current.count,
    ttlSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
};

const peekMemoryCounter = (key: string, now: number): IncrResult => {
  const current = memoryStore.get(key);
  if (!current || current.resetAt <= now) {
    return { count: 0, ttlSeconds: 0 };
  }
  return {
    count: current.count,
    ttlSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
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
    throw new Error(`Upstash counter request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  if (!Array.isArray(payload)) {
    throw new Error("Upstash counter response is invalid.");
  }
  const failed = payload.find((item) => typeof item?.error === "string" && item.error);
  if (failed?.error) {
    throw new Error(`Upstash counter pipeline failed: ${failed.error}`);
  }
  return payload;
};

const incrUpstashCounter = async (
  config: { url: string; token: string },
  key: string,
  ttlSeconds: number,
): Promise<IncrResult> => {
  const payload = await callUpstashPipeline(config, [
    ["INCR", key],
    ["EXPIRE", key, ttlSeconds, "NX"],
    ["TTL", key],
  ]);
  const count = Number(payload[0]?.result ?? 0);
  const ttlRaw = Number(payload[2]?.result ?? -1);
  const ttl = Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : ttlSeconds;
  return { count, ttlSeconds: ttl };
};

const peekUpstashCounter = async (
  config: { url: string; token: string },
  key: string,
): Promise<IncrResult> => {
  const payload = await callUpstashPipeline(config, [
    ["GET", key],
    ["TTL", key],
  ]);
  const count = Number(payload[0]?.result ?? 0);
  const ttlRaw = Number(payload[1]?.result ?? -1);
  return {
    count: Number.isFinite(count) ? count : 0,
    ttlSeconds: Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : 0,
  };
};

/** INCR + EXPIRE NX,返回当前 count 与剩余 TTL。后端不可用时自动回退到内存计数器。 */
export const incrDailyCounter = async (
  key: string,
  ttlSeconds: number,
  now: number = Date.now(),
): Promise<IncrResult> => {
  const upstash = getUpstashConfig();
  if (upstash) {
    try {
      return await incrUpstashCounter(upstash, key, ttlSeconds);
    } catch {
      return incrMemoryCounter(key, ttlSeconds, now);
    }
  }
  return incrMemoryCounter(key, ttlSeconds, now);
};

export const peekDailyCounter = async (
  key: string,
  now: number = Date.now(),
): Promise<IncrResult> => {
  const upstash = getUpstashConfig();
  if (upstash) {
    try {
      return await peekUpstashCounter(upstash, key);
    } catch {
      return peekMemoryCounter(key, now);
    }
  }
  return peekMemoryCounter(key, now);
};

/** 仅供测试调用。 */
export const clearAnonymousCounterStore = () => {
  memoryStore.clear();
};
