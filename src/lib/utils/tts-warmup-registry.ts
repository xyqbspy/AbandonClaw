export type WarmupSource = "initial" | "idle" | "playback";

type WarmupRecord = {
  warmedAt: number;
  source: WarmupSource;
};

type WarmupInfo = {
  wasWarmed: boolean;
  source?: WarmupSource;
};

const defaultWarmupRecordTtlMs = 20 * 60 * 1000;
const defaultWarmupRecordLimit = 240;
const sourceRank: Record<WarmupSource, number> = {
  initial: 1,
  idle: 2,
  playback: 3,
};

const warmupRegistry = new Map<string, WarmupRecord>();
let warmupRecordTtlMs = defaultWarmupRecordTtlMs;
let warmupRecordLimit = defaultWarmupRecordLimit;

const pruneExpiredWarmupRecords = (now = Date.now()) => {
  for (const [cacheKey, record] of warmupRegistry) {
    if (record.warmedAt + warmupRecordTtlMs <= now) {
      warmupRegistry.delete(cacheKey);
    }
  }
};

const pruneOverflowWarmupRecords = () => {
  const overflow = warmupRegistry.size - warmupRecordLimit;
  if (overflow <= 0) return;

  const toDelete = Array.from(warmupRegistry.entries())
    .sort((left, right) => left[1].warmedAt - right[1].warmedAt)
    .slice(0, overflow)
    .map(([cacheKey]) => cacheKey);

  for (const cacheKey of toDelete) {
    warmupRegistry.delete(cacheKey);
  }
};

export const markAudioWarmed = (cacheKey: string, source: WarmupSource) => {
  const normalizedKey = cacheKey.trim();
  if (!normalizedKey) return;

  const now = Date.now();
  pruneExpiredWarmupRecords(now);

  const existing = warmupRegistry.get(normalizedKey);
  const nextSource =
    existing && sourceRank[existing.source] > sourceRank[source] ? existing.source : source;

  warmupRegistry.set(normalizedKey, {
    warmedAt: now,
    source: nextSource,
  });
  pruneOverflowWarmupRecords();
};

export const getWarmupInfo = (cacheKey: string): WarmupInfo => {
  const normalizedKey = cacheKey.trim();
  if (!normalizedKey) return { wasWarmed: false };

  const now = Date.now();
  pruneExpiredWarmupRecords(now);
  const record = warmupRegistry.get(normalizedKey);
  if (!record) return { wasWarmed: false };

  return {
    wasWarmed: true,
    source: record.source,
  };
};

export const __resetTtsWarmupRegistryForTests = (options?: {
  ttlMs?: number;
  limit?: number;
}) => {
  warmupRegistry.clear();
  warmupRecordTtlMs = options?.ttlMs ?? defaultWarmupRecordTtlMs;
  warmupRecordLimit = options?.limit ?? defaultWarmupRecordLimit;
};

