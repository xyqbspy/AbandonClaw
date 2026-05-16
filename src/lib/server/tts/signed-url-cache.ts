/**
 * Signed URL 缓存：优先 Upstash Redis（多 PM2 worker 共享），
 * Redis 未配置或失败时退化到进程内 Map（保持本地开发零配置）。
 *
 * Why Redis: 进程内 Map 在 PM2 cluster 模式下每个 worker 独立维护，
 * 命中率被 worker 数稀释；签名 URL 1h TTL 用 Redis 共享后，
 * 同一 storagePath 在任意 worker 命中即所有 worker 受益。
 */

type SignedUrlBackend =
  | { kind: "memory"; map: Map<string, { url: string; expiresAt: number }> }
  | { kind: "upstash"; config: { url: string; token: string }; fallback: Map<string, { url: string; expiresAt: number }> };

let backendCache: SignedUrlBackend | null = null;

const getUpstashConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
};

const getBackend = (): SignedUrlBackend => {
  if (backendCache) return backendCache;
  const upstashConfig = getUpstashConfig();
  backendCache = upstashConfig
    ? { kind: "upstash", config: upstashConfig, fallback: new Map() }
    : { kind: "memory", map: new Map() };
  return backendCache;
};

const buildRedisKey = (storagePath: string) => `tts:signed-url:${storagePath}`;

const callUpstash = async (
  config: { url: string; token: string },
  command: unknown[],
) => {
  const response = await fetch(`${config.url}/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Upstash signed URL cache request failed with status ${response.status}.`);
  }
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload?.error) {
    throw new Error(`Upstash signed URL cache error: ${payload.error}`);
  }
  return payload?.result;
};

const readMemoryEntry = (
  map: Map<string, { url: string; expiresAt: number }>,
  storagePath: string,
) => {
  const entry = map.get(storagePath);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    map.delete(storagePath);
    return null;
  }
  return entry.url;
};

export async function getCachedSignedUrl(storagePath: string): Promise<string | null> {
  const backend = getBackend();
  if (backend.kind === "memory") {
    return readMemoryEntry(backend.map, storagePath);
  }

  // Upstash 命中优先；任何错误都退化到 fallback Map
  try {
    const result = await callUpstash(backend.config, ["GET", buildRedisKey(storagePath)]);
    if (typeof result === "string" && result.length > 0) return result;
  } catch (error) {
    console.warn("[signed-url-cache] upstash get failed, falling back to memory", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return readMemoryEntry(backend.fallback, storagePath);
}

export async function setCachedSignedUrl(
  storagePath: string,
  url: string,
  ttlMs: number,
): Promise<void> {
  const backend = getBackend();
  const expiresAt = Date.now() + ttlMs;
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

  if (backend.kind === "memory") {
    backend.map.set(storagePath, { url, expiresAt });
    return;
  }

  // 始终写 fallback 一份，保证 Redis 抖动时本进程仍能命中
  backend.fallback.set(storagePath, { url, expiresAt });
  try {
    await callUpstash(backend.config, [
      "SET",
      buildRedisKey(storagePath),
      url,
      "EX",
      ttlSeconds,
    ]);
  } catch (error) {
    console.warn("[signed-url-cache] upstash set failed, kept memory fallback only", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function clearCachedSignedUrl(storagePath: string): Promise<void> {
  const backend = getBackend();
  if (backend.kind === "memory") {
    backend.map.delete(storagePath);
    return;
  }
  backend.fallback.delete(storagePath);
  try {
    await callUpstash(backend.config, ["DEL", buildRedisKey(storagePath)]);
  } catch (error) {
    console.warn("[signed-url-cache] upstash del failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const __resetSignedUrlCacheForTests = () => {
  backendCache = null;
};

export const getSignedUrlCacheBackendKind = () => getBackend().kind;
