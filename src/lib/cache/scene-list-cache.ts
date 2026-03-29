import {
  idbDeleteSceneRecord,
  idbGetSceneRecord,
  idbSetSceneRecord,
} from "@/lib/cache/indexeddb";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

export type SceneListCacheRecord = {
  schemaVersion: "scene-list-cache-v1";
  key: "scene-list:default";
  type: "scene_list";
  data: SceneListItemResponse[];
  cachedAt: number;
  lastAccessedAt: number;
  expiresAt: number;
};

const CACHE_KEY: SceneListCacheRecord["key"] = "scene-list:default";
const CACHE_SCHEMA_VERSION: SceneListCacheRecord["schemaVersion"] = "scene-list-cache-v1";
const SCENE_LIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let memorySceneListRecord: SceneListCacheRecord | null = null;

const nowMs = () => Date.now();

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[scene-list-cache]", ...args);
};

const isSceneListItemValid = (item: SceneListItemResponse) =>
  typeof item?.id === "string" &&
  item.id.trim().length > 0 &&
  typeof item?.slug === "string" &&
  item.slug.trim().length > 0 &&
  typeof item?.title === "string" &&
  item.title.trim().length > 0 &&
  Array.isArray(item?.variantLinks);

const isSceneListCacheValid = (record: SceneListCacheRecord) =>
  record.schemaVersion === CACHE_SCHEMA_VERSION &&
  record.key === CACHE_KEY &&
  record.type === "scene_list" &&
  Array.isArray(record.data) &&
  record.data.every(isSceneListItemValid);

export async function getSceneListCache(): Promise<{
  found: boolean;
  record: SceneListCacheRecord | null;
  isExpired: boolean;
}> {
  const currentNow = nowMs();
  let record = memorySceneListRecord;
  if (!record) {
    record = await idbGetSceneRecord<SceneListCacheRecord>(CACHE_KEY);
    if (record) {
      memorySceneListRecord = record;
    }
  }

  if (!record) return { found: false, record: null, isExpired: false };
  if (!isSceneListCacheValid(record)) {
    memorySceneListRecord = null;
    await idbDeleteSceneRecord(CACHE_KEY);
    return { found: false, record: null, isExpired: false };
  }

  const touched = {
    ...record,
    lastAccessedAt: currentNow,
  };
  memorySceneListRecord = touched;
  void idbSetSceneRecord(touched).catch(() => {
    debugLog("touch persist failed");
  });
  return {
    found: true,
    record: touched,
    isExpired: touched.expiresAt <= currentNow,
  };
}

export function getSceneListCacheSnapshotSync(): {
  found: boolean;
  record: SceneListCacheRecord | null;
  isExpired: boolean;
} {
  const record = memorySceneListRecord;
  if (!record) {
    return { found: false, record: null, isExpired: false };
  }
  if (!isSceneListCacheValid(record)) {
    memorySceneListRecord = null;
    void idbDeleteSceneRecord(CACHE_KEY).catch(() => {
      debugLog("sync cleanup failed");
    });
    return { found: false, record: null, isExpired: false };
  }
  return {
    found: true,
    record,
    isExpired: record.expiresAt <= nowMs(),
  };
}

export async function setSceneListCache(rows: SceneListItemResponse[]): Promise<void> {
  if (!Array.isArray(rows) || !rows.every(isSceneListItemValid)) {
    debugLog("skip invalid scene list cache payload");
    return;
  }
  const currentNow = nowMs();
  const next: SceneListCacheRecord = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    key: CACHE_KEY,
    type: "scene_list",
    data: rows,
    cachedAt: currentNow,
    lastAccessedAt: currentNow,
    expiresAt: currentNow + SCENE_LIST_TTL_MS,
  };
  memorySceneListRecord = next;
  void idbSetSceneRecord(next).catch(() => {
    debugLog("set persist failed");
  });
}

export async function clearSceneListCache(): Promise<void> {
  memorySceneListRecord = null;
  await idbDeleteSceneRecord(CACHE_KEY);
}
