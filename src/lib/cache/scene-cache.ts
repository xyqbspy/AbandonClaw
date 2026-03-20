import { Lesson } from "@/lib/types";
import {
  idbDeleteSceneRecord,
  idbGetMeta,
  idbGetSceneRecord,
  idbSetMeta,
  idbSetSceneRecord,
} from "@/lib/cache/indexeddb";

export type SceneCacheRecord<T> = {
  schemaVersion: "scene-cache-v2";
  key: string;
  type: "scene";
  slug: string;
  data: T;
  version?: string | null;
  sourceUpdatedAt?: string | null;
  cachedAt: number;
  lastAccessedAt: number;
  expiresAt: number;
};

type CacheQueueItem = {
  key: string;
  type: "scene";
  slug: string;
  lastAccessedAt: number;
  cachedAt: number;
};

type SceneCacheMap = Map<string, SceneCacheRecord<Lesson>>;

const SCENE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCENE_MAX_ITEMS = 20;
const QUEUE_META_KEY = "scene_queue_v2";
const EXPIRED_HARD_DELETE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const SCHEMA_VERSION: SceneCacheRecord<Lesson>["schemaVersion"] = "scene-cache-v2";

const memorySceneRecords: SceneCacheMap = new Map();
let memoryQueue: CacheQueueItem[] = [];
let queueLoadedFromIdb = false;

// IndexedDB is the persistent source of truth for queue/data across sessions.
// Memory queue + memory records are session mirrors to reduce read latency.
// All queue/data mutations update memory first, then asynchronously persist to IndexedDB.
export const normalizeSceneSlug = (slug: string) => slug.trim().toLowerCase();

const sceneKey = (slug: string) => `scene:${normalizeSceneSlug(slug)}`;

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[scene-cache]", ...args);
};

const nowMs = () => Date.now();

const isLessonCacheable = (lesson: Lesson, expectedSlug: string) => {
  if (!lesson || typeof lesson !== "object") return false;
  if (typeof lesson.id !== "string" || !lesson.id.trim()) return false;
  if (typeof lesson.slug !== "string" || !lesson.slug.trim()) return false;
  if (normalizeSceneSlug(lesson.slug) !== normalizeSceneSlug(expectedSlug)) return false;
  if (typeof lesson.title !== "string" || !lesson.title.trim()) return false;
  if (!Array.isArray(lesson.sections) || lesson.sections.length === 0) return false;
  if (
    lesson.sections.some(
      (section) =>
        !Array.isArray(section.blocks) ||
        section.blocks.length === 0 ||
        section.blocks.some((block) => !Array.isArray(block.sentences) || block.sentences.length === 0),
    )
  ) {
    return false;
  }
  if (typeof lesson.estimatedMinutes !== "number" || Number.isNaN(lesson.estimatedMinutes)) {
    return false;
  }
  return true;
};

const sanitizeQueue = (queue: CacheQueueItem[]) => {
  const seen = new Set<string>();
  const normalizedItems = queue.map((item) => {
    const normalizedSlug = normalizeSceneSlug(item.slug);
    return {
      ...item,
      slug: normalizedSlug,
      key: sceneKey(normalizedSlug),
    };
  });
  const unique = normalizedItems.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
  unique.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
  return unique;
};

const persistQueue = async () => {
  const ok = await idbSetMeta(QUEUE_META_KEY, memoryQueue);
  if (!ok) {
    debugLog("queue persistence skipped");
  }
};

const ensureQueueLoaded = async () => {
  if (queueLoadedFromIdb) return;
  const queue = await idbGetMeta<CacheQueueItem[]>(QUEUE_META_KEY);
  if (Array.isArray(queue)) {
    memoryQueue = sanitizeQueue(queue);
  } else {
    memoryQueue = [];
  }
  queueLoadedFromIdb = true;
};

const upsertQueueHead = (record: SceneCacheRecord<Lesson>) => {
  memoryQueue = sanitizeQueue(
    [
      {
        key: record.key,
        type: "scene",
        slug: record.slug,
        lastAccessedAt: record.lastAccessedAt,
        cachedAt: record.cachedAt,
      },
      ...memoryQueue.filter((item) => item.key !== record.key),
    ],
  );
};

const removeQueueItem = (key: string) => {
  memoryQueue = memoryQueue.filter((item) => item.key !== key);
};

const removeRecordByKey = async (key: string) => {
  memorySceneRecords.delete(key);
  removeQueueItem(key);
  await Promise.all([idbDeleteSceneRecord(key), persistQueue()]);
};

const isRecordSchemaValid = (record: SceneCacheRecord<Lesson>) =>
  record.schemaVersion === SCHEMA_VERSION &&
  typeof record.slug === "string" &&
  record.key === sceneKey(record.slug);

export async function getSceneCache(slug: string): Promise<{
  found: boolean;
  record: SceneCacheRecord<Lesson> | null;
  isExpired: boolean;
}> {
  await ensureQueueLoaded();
  const normalizedSlug = normalizeSceneSlug(slug);
  const key = sceneKey(normalizedSlug);
  const currentNow = nowMs();

  let record = memorySceneRecords.get(key) ?? null;
  if (!record) {
    record = await idbGetSceneRecord<SceneCacheRecord<Lesson>>(key);
    if (record) {
      memorySceneRecords.set(key, record);
    }
  }

  if (!record) {
    return { found: false, record: null, isExpired: false };
  }

  if (!isRecordSchemaValid(record)) {
    await removeRecordByKey(key);
    return { found: false, record: null, isExpired: false };
  }

  const touchedRecord: SceneCacheRecord<Lesson> = {
    ...record,
    slug: normalizedSlug,
    lastAccessedAt: currentNow,
  };
  memorySceneRecords.set(key, touchedRecord);
  upsertQueueHead(touchedRecord);

  // Async persistence, no blocking on cache read path.
  void Promise.all([idbSetSceneRecord(touchedRecord), persistQueue()]).catch(() => {
    debugLog("touch persistence failed", key);
  });

  return {
    found: true,
    record: touchedRecord,
    isExpired: touchedRecord.expiresAt <= currentNow,
  };
}

export async function touchSceneCache(slug: string): Promise<void> {
  const result = await getSceneCache(slug);
  if (!result.found) return;
}

export async function setSceneCache(
  slug: string,
  data: Lesson,
  meta?: {
    version?: string | null;
    sourceUpdatedAt?: string | null;
  },
): Promise<void> {
  await ensureQueueLoaded();
  const normalizedSlug = normalizeSceneSlug(slug);
  if (!isLessonCacheable(data, normalizedSlug)) {
    debugLog("skip cache write: invalid scene detail payload", normalizedSlug);
    return;
  }
  const key = sceneKey(normalizedSlug);
  const currentNow = nowMs();
  const previous = memorySceneRecords.get(key);
  const record: SceneCacheRecord<Lesson> = {
    schemaVersion: SCHEMA_VERSION,
    key,
    type: "scene",
    slug: normalizedSlug,
    data,
    version: meta?.version ?? previous?.version ?? null,
    sourceUpdatedAt: meta?.sourceUpdatedAt ?? previous?.sourceUpdatedAt ?? null,
    cachedAt: currentNow,
    lastAccessedAt: currentNow,
    expiresAt: currentNow + SCENE_TTL_MS,
  };

  memorySceneRecords.set(key, record);
  upsertQueueHead(record);

  // Write memory first, then persist async for mobile-friendly responsiveness.
  void Promise.all([idbSetSceneRecord(record), persistQueue()]).catch(() => {
    debugLog("set persistence failed", key);
  });

  await evictIfNeeded();
}

export async function removeSceneCache(slug: string): Promise<void> {
  await ensureQueueLoaded();
  await removeRecordByKey(sceneKey(normalizeSceneSlug(slug)));
}

export async function evictIfNeeded(): Promise<void> {
  await ensureQueueLoaded();
  if (memoryQueue.length <= SCENE_MAX_ITEMS) return;
  const overflow = memoryQueue.length - SCENE_MAX_ITEMS;
  const toRemove = memoryQueue.slice(-overflow);
  if (toRemove.length === 0) return;

  for (const item of toRemove) {
    memorySceneRecords.delete(item.key);
    await idbDeleteSceneRecord(item.key);
  }
  memoryQueue = memoryQueue.slice(0, SCENE_MAX_ITEMS);
  await persistQueue();
}

export async function clearExpiredSceneCaches(): Promise<void> {
  await ensureQueueLoaded();
  const currentNow = nowMs();
  const staleKeys: string[] = [];

  for (const item of memoryQueue) {
    const record =
      memorySceneRecords.get(item.key) ??
      (await idbGetSceneRecord<SceneCacheRecord<Lesson>>(item.key));
    if (!record) {
      staleKeys.push(item.key);
      continue;
    }
    if (!isRecordSchemaValid(record)) {
      staleKeys.push(item.key);
      continue;
    }
    memorySceneRecords.set(item.key, record);
    const hardExpired =
      record.expiresAt + EXPIRED_HARD_DELETE_AFTER_MS <= currentNow;
    if (hardExpired) {
      staleKeys.push(item.key);
    }
  }

  if (staleKeys.length === 0) return;

  for (const key of staleKeys) {
    await removeRecordByKey(key);
  }
}

export async function listRecentSceneCacheKeys(limit = 5): Promise<string[]> {
  await ensureQueueLoaded();
  return memoryQueue.slice(0, Math.max(1, limit)).map((item) => item.key);
}
