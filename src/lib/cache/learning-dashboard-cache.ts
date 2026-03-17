import {
  idbDeleteSceneRecord,
  idbGetSceneRecord,
  idbSetSceneRecord,
} from "@/lib/cache/indexeddb";
import { LearningDashboardResponse } from "@/lib/utils/learning-api";

export type LearningDashboardCacheRecord = {
  schemaVersion: "learning-dashboard-cache-v1";
  key: "learning-dashboard:me";
  type: "learning_dashboard";
  data: LearningDashboardResponse;
  cachedAt: number;
  lastAccessedAt: number;
  expiresAt: number;
};

const CACHE_KEY: LearningDashboardCacheRecord["key"] = "learning-dashboard:me";
const CACHE_SCHEMA_VERSION: LearningDashboardCacheRecord["schemaVersion"] =
  "learning-dashboard-cache-v1";
const LEARNING_DASHBOARD_TTL_MS = 5 * 60 * 1000;

let memoryRecord: LearningDashboardCacheRecord | null = null;

const nowMs = () => Date.now();

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[learning-dashboard-cache]", ...args);
};

const isValidRecord = (record: LearningDashboardCacheRecord) =>
  record.schemaVersion === CACHE_SCHEMA_VERSION &&
  record.key === CACHE_KEY &&
  record.type === "learning_dashboard" &&
  typeof record.data?.overview?.streakDays === "number" &&
  typeof record.data?.todayTasks?.reviewTask?.dueReviewCount === "number";

export async function getLearningDashboardCache(): Promise<{
  found: boolean;
  record: LearningDashboardCacheRecord | null;
  isExpired: boolean;
}> {
  const currentNow = nowMs();
  let record = memoryRecord;
  if (!record) {
    record = await idbGetSceneRecord<LearningDashboardCacheRecord>(CACHE_KEY);
    if (record) memoryRecord = record;
  }

  if (!record) return { found: false, record: null, isExpired: false };
  if (!isValidRecord(record)) {
    memoryRecord = null;
    await idbDeleteSceneRecord(CACHE_KEY);
    return { found: false, record: null, isExpired: false };
  }

  const touched: LearningDashboardCacheRecord = {
    ...record,
    lastAccessedAt: currentNow,
  };
  memoryRecord = touched;
  void idbSetSceneRecord(touched).catch(() => {
    debugLog("touch persist failed");
  });

  return {
    found: true,
    record: touched,
    isExpired: touched.expiresAt <= currentNow,
  };
}

export async function setLearningDashboardCache(
  data: LearningDashboardResponse,
): Promise<void> {
  const currentNow = nowMs();
  const next: LearningDashboardCacheRecord = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    key: CACHE_KEY,
    type: "learning_dashboard",
    data,
    cachedAt: currentNow,
    lastAccessedAt: currentNow,
    expiresAt: currentNow + LEARNING_DASHBOARD_TTL_MS,
  };
  memoryRecord = next;
  void idbSetSceneRecord(next).catch(() => {
    debugLog("set persist failed");
  });
}

export async function clearLearningDashboardCache(): Promise<void> {
  memoryRecord = null;
  await idbDeleteSceneRecord(CACHE_KEY);
}
