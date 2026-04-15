import { createHash } from "node:crypto";

const IDEMPOTENCY_KEY_HEADER = "x-idempotency-key";
const IDEMPOTENCY_FALLBACK_HEADER = "x-client-request-id";

interface CachedEntry {
  expiresAt: number;
  value?: unknown;
  promise?: Promise<unknown>;
}

const idempotencyStore = new Map<string, CachedEntry>();

const cleanupExpiredEntries = (now: number) => {
  for (const [key, entry] of idempotencyStore.entries()) {
    if (entry.expiresAt <= now) {
      idempotencyStore.delete(key);
    }
  }
};

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
};

const normalizeKey = (scope: string, key: string) => `${scope}:${key.trim().slice(0, 160)}`;

export const buildDeterministicIdempotencyKey = (...parts: unknown[]) => {
  const hash = createHash("sha256");
  hash.update(stableStringify(parts));
  return hash.digest("hex");
};

export const getRequestIdempotencyKey = (
  request: Request,
  fallbackKey: string,
) => {
  const explicitKey =
    request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim() ??
    request.headers.get(IDEMPOTENCY_FALLBACK_HEADER)?.trim() ??
    "";
  return explicitKey || fallbackKey;
};

export async function runIdempotentMutation<T>(params: {
  scope: string;
  key: string;
  ttlMs?: number;
  execute: () => Promise<T>;
}): Promise<T> {
  const ttlMs = params.ttlMs ?? 15_000;
  const now = Date.now();
  cleanupExpiredEntries(now);

  const normalizedKey = normalizeKey(params.scope, params.key);
  const existing = idempotencyStore.get(normalizedKey);
  if (existing && existing.expiresAt > now) {
    if (existing.promise) {
      return existing.promise as Promise<T>;
    }
    return existing.value as T;
  }

  const promise = params.execute().then(
    (value) => {
      idempotencyStore.set(normalizedKey, {
        expiresAt: Date.now() + ttlMs,
        value,
      });
      return value;
    },
    (error) => {
      idempotencyStore.delete(normalizedKey);
      throw error;
    },
  );

  idempotencyStore.set(normalizedKey, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}

export const clearIdempotencyStore = () => {
  idempotencyStore.clear();
};
