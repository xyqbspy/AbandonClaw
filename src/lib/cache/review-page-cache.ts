import {
  idbDeleteSceneRecord,
  idbGetAllSceneRecordKeys,
  idbGetSceneRecord,
  idbSetSceneRecord,
} from "@/lib/cache/indexeddb";
import { DueReviewItemResponse, ReviewSummaryResponse } from "@/lib/utils/review-api";

export type ReviewPageCacheRecord = {
  schemaVersion: "review-page-cache-v1";
  key: string;
  type: "review_page";
  limit: number;
  data: {
    rows: DueReviewItemResponse[];
    total: number;
    summary: ReviewSummaryResponse;
  };
  cachedAt: number;
  lastAccessedAt: number;
  expiresAt: number;
};

const CACHE_SCHEMA_VERSION: ReviewPageCacheRecord["schemaVersion"] = "review-page-cache-v1";
// 24 小时：SWR 模式下命中即立即可见，背后仍会刷新覆盖；目标是「一天内回到 review 页面不出现 loading 闪烁」。
// 写入操作会主动 invalidate（见 cache-actions），因此过期时长可以放长。
const REVIEW_PAGE_TTL_MS = 24 * 60 * 60 * 1000;
const nowMs = () => Date.now();
const CACHE_KEY_PREFIX = "review-page:v1:";

const memoryRecords = new Map<string, ReviewPageCacheRecord>();

const cacheKey = (limit: number) => `review-page:v1:limit=${limit}`;

const isDueItemValid = (item: DueReviewItemResponse) =>
  typeof item?.userPhraseId === "string" &&
  item.userPhraseId.trim().length > 0 &&
  typeof item?.phraseId === "string" &&
  item.phraseId.trim().length > 0 &&
  typeof item?.text === "string";

const isSummaryValid = (summary: ReviewSummaryResponse) =>
  typeof summary?.dueReviewCount === "number" &&
  typeof summary?.reviewedTodayCount === "number" &&
  (summary.reviewAccuracy == null || typeof summary.reviewAccuracy === "number") &&
  typeof summary?.masteredPhraseCount === "number" &&
  typeof summary?.confidentOutputCountToday === "number" &&
  typeof summary?.fullOutputCountToday === "number" &&
  typeof summary?.variantRewriteCountToday === "number" &&
  typeof summary?.targetCoverageCountToday === "number" &&
  typeof summary?.targetCoverageMissCountToday === "number";

const isValidRecord = (record: ReviewPageCacheRecord, key: string) =>
  record.schemaVersion === CACHE_SCHEMA_VERSION &&
  record.key === key &&
  record.type === "review_page" &&
  Number.isFinite(record.limit) &&
  Array.isArray(record.data?.rows) &&
  record.data.rows.every(isDueItemValid) &&
  Number.isFinite(record.data.total) &&
  isSummaryValid(record.data.summary);

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[review-page-cache]", ...args);
};

export async function getReviewPageCache(limit = 20): Promise<{
  found: boolean;
  record: ReviewPageCacheRecord | null;
  isExpired: boolean;
}> {
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const key = cacheKey(normalizedLimit);
  const currentNow = nowMs();
  let record = memoryRecords.get(key) ?? null;
  if (!record) {
    record = await idbGetSceneRecord<ReviewPageCacheRecord>(key);
    if (record) memoryRecords.set(key, record);
  }

  if (!record) return { found: false, record: null, isExpired: false };
  if (!isValidRecord(record, key)) {
    memoryRecords.delete(key);
    await idbDeleteSceneRecord(key);
    return { found: false, record: null, isExpired: false };
  }

  const touched: ReviewPageCacheRecord = {
    ...record,
    lastAccessedAt: currentNow,
  };
  memoryRecords.set(key, touched);
  void idbSetSceneRecord(touched).catch(() => {
    debugLog("touch persist failed", key);
  });
  return {
    found: true,
    record: touched,
    isExpired: touched.expiresAt <= currentNow,
  };
}

export async function setReviewPageCache(
  payload: {
    rows: DueReviewItemResponse[];
    total: number;
    summary: ReviewSummaryResponse;
  },
  limit = 20,
): Promise<void> {
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  if (!Array.isArray(payload.rows) || !payload.rows.every(isDueItemValid)) {
    debugLog("skip invalid due rows payload");
    return;
  }
  if (!isSummaryValid(payload.summary)) {
    debugLog("skip invalid summary payload");
    return;
  }

  const key = cacheKey(normalizedLimit);
  const currentNow = nowMs();
  const next: ReviewPageCacheRecord = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    key,
    type: "review_page",
    limit: normalizedLimit,
    data: payload,
    cachedAt: currentNow,
    lastAccessedAt: currentNow,
    expiresAt: currentNow + REVIEW_PAGE_TTL_MS,
  };
  memoryRecords.set(key, next);
  void idbSetSceneRecord(next).catch(() => {
    debugLog("set persist failed", key);
  });
}

export async function clearReviewPageCache(limit = 20): Promise<void> {
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const key = cacheKey(normalizedLimit);
  memoryRecords.delete(key);
  await idbDeleteSceneRecord(key);
}

export async function clearAllReviewPageCache(): Promise<void> {
  const keys = [
    ...memoryRecords.keys(),
    ...(await idbGetAllSceneRecordKeys()).filter((key) => key.startsWith(CACHE_KEY_PREFIX)),
  ];
  const uniqueKeys = Array.from(new Set(keys));
  memoryRecords.clear();
  await Promise.all(uniqueKeys.map((key) => idbDeleteSceneRecord(key)));
}
