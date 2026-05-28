interface CounterState {
  count: number;
  resetAt: number;
}

import { logServerEvent } from "@/lib/server/logger";

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

/**
 * INCR + EXPIRE NX,返回当前 count 与剩余 TTL。
 *
 * Upstash 不可用时回退到内存计数器并 warn。多实例部署下,内存计数器互不共享,
 * 全站日上限会被实际放大到实例数倍 — 这是 fail-open 选择,业务可用性优先于配额精度。
 * 运维收到 warn 后需排查 Upstash 健康度,并视情况临时关闭 ALLOW_ANONYMOUS_TRIAL 止血。
 */
export const incrDailyCounter = async (
  key: string,
  ttlSeconds: number,
  now: number = Date.now(),
): Promise<IncrResult> => {
  const upstash = getUpstashConfig();
  if (upstash) {
    try {
      return await incrUpstashCounter(upstash, key, ttlSeconds);
    } catch (error) {
      logServerEvent(
        "warn",
        "[anonymous-counter] upstash incr failed, falling back to in-memory counter. Daily anonymous quotas may be inflated by instance count.",
        {
          module: "anonymous/counter",
          error,
          details: { key, ttlSeconds },
        },
      );
      return incrMemoryCounter(key, ttlSeconds, now);
    }
  }
  return incrMemoryCounter(key, ttlSeconds, now);
};

const decrMemoryCounter = (key: string, now: number): void => {
  const current = memoryStore.get(key);
  if (!current || current.resetAt <= now) return;
  current.count = Math.max(0, current.count - 1);
  memoryStore.set(key, current);
};

const decrUpstashCounter = async (
  config: { url: string; token: string },
  key: string,
): Promise<void> => {
  await callUpstashPipeline(config, [["DECR", key]]);
};

/**
 * 回滚一次 INCR(配额命中阈值后调用,避免持续失败请求让计数无限漂移)。
 * 失败时静默——计数轻微漂移不算正确性问题,与 INCR 自身的 fail-open 策略一致。
 */
export const decrDailyCounter = async (
  key: string,
  now: number = Date.now(),
): Promise<void> => {
  const upstash = getUpstashConfig();
  if (upstash) {
    try {
      await decrUpstashCounter(upstash, key);
      return;
    } catch (error) {
      logServerEvent(
        "warn",
        "[anonymous-counter] upstash decr failed; counter may drift by 1 until next reset.",
        {
          module: "anonymous/counter",
          error,
          details: { key },
        },
      );
    }
  }
  decrMemoryCounter(key, now);
};

export const peekDailyCounter = async (
  key: string,
  now: number = Date.now(),
): Promise<IncrResult> => {
  const upstash = getUpstashConfig();
  if (upstash) {
    try {
      return await peekUpstashCounter(upstash, key);
    } catch (error) {
      logServerEvent(
        "warn",
        "[anonymous-counter] upstash peek failed, falling back to in-memory counter.",
        {
          module: "anonymous/counter",
          error,
          details: { key },
        },
      );
      return peekMemoryCounter(key, now);
    }
  }
  return peekMemoryCounter(key, now);
};

/** 仅供测试调用。 */
export const clearAnonymousCounterStore = () => {
  memoryStore.clear();
};
