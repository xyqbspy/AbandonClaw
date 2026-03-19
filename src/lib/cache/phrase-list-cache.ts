import {
  idbDeleteSceneRecord,
  idbGetSceneRecord,
  idbSetSceneRecord,
} from "@/lib/cache/indexeddb";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

export type PhraseListCacheRecord = {
  schemaVersion: "phrase-list-cache-v5";
  key: string;
  type: "phrase_list";
  query: string;
  status: "saved" | "archived";
  reviewStatus: "saved" | "reviewing" | "mastered" | "archived" | "all";
  learningItemType: "expression" | "sentence" | "all";
  expressionFamilyId: string;
  page: number;
  limit: number;
  data: {
    rows: UserPhraseItemResponse[];
    total: number;
    page: number;
    limit: number;
  };
  cachedAt: number;
  lastAccessedAt: number;
  expiresAt: number;
};

const CACHE_SCHEMA_VERSION: PhraseListCacheRecord["schemaVersion"] = "phrase-list-cache-v5";
const PHRASE_LIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const memoryPhraseListRecords = new Map<string, PhraseListCacheRecord>();

const nowMs = () => Date.now();

const normalizeQuery = (query: string) => query.trim().toLowerCase();

const cacheKey = (params: {
  query: string;
  status: "saved" | "archived";
  reviewStatus: "saved" | "reviewing" | "mastered" | "archived" | "all";
  learningItemType: "expression" | "sentence" | "all";
  expressionFamilyId: string;
  page: number;
  limit: number;
}) =>
  `phrase-list:v5:${params.status}:r=${params.reviewStatus}:t=${params.learningItemType}:f=${encodeURIComponent(params.expressionFamilyId)}:q=${encodeURIComponent(normalizeQuery(params.query))}:p=${params.page}:l=${params.limit}`;

const isPhraseListItemValid = (item: UserPhraseItemResponse) =>
  typeof item?.userPhraseId === "string" &&
  item.userPhraseId.trim().length > 0 &&
  typeof item?.phraseId === "string" &&
  item.phraseId.trim().length > 0 &&
  typeof item?.text === "string" &&
  item.text.trim().length > 0 &&
  typeof item?.normalizedText === "string" &&
  item.normalizedText.trim().length > 0 &&
  (item.learningItemType === "expression" || item.learningItemType === "sentence");

const isPhraseListCacheValid = (record: PhraseListCacheRecord, expectedKey: string) =>
  record.schemaVersion === CACHE_SCHEMA_VERSION &&
  record.key === expectedKey &&
  record.type === "phrase_list" &&
  ["saved", "reviewing", "mastered", "archived", "all"].includes(record.reviewStatus) &&
  ["expression", "sentence", "all"].includes(record.learningItemType) &&
  typeof record.expressionFamilyId === "string" &&
  Array.isArray(record.data?.rows) &&
  record.data.rows.every(isPhraseListItemValid) &&
  Number.isFinite(record.data.total) &&
  Number.isFinite(record.data.page) &&
  Number.isFinite(record.data.limit);

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[phrase-list-cache]", ...args);
};

export async function getPhraseListCache(params: {
  query: string;
  status?: "saved" | "archived";
  reviewStatus?: "saved" | "reviewing" | "mastered" | "archived" | "all";
  learningItemType?: "expression" | "sentence" | "all";
  expressionFamilyId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  found: boolean;
  record: PhraseListCacheRecord | null;
  isExpired: boolean;
}> {
  const normalizedParams = {
    query: params.query ?? "",
    status: params.status ?? "saved",
    reviewStatus: params.reviewStatus ?? "all",
    learningItemType: params.learningItemType ?? "all",
    expressionFamilyId: params.expressionFamilyId?.trim() ?? "",
    page: params.page ?? 1,
    limit: params.limit ?? 100,
  };
  const key = cacheKey(normalizedParams);
  const currentNow = nowMs();
  let record = memoryPhraseListRecords.get(key) ?? null;
  if (!record) {
    record = await idbGetSceneRecord<PhraseListCacheRecord>(key);
    if (record) memoryPhraseListRecords.set(key, record);
  }

  if (!record) return { found: false, record: null, isExpired: false };
  if (!isPhraseListCacheValid(record, key)) {
    memoryPhraseListRecords.delete(key);
    await idbDeleteSceneRecord(key);
    return { found: false, record: null, isExpired: false };
  }

  const touched: PhraseListCacheRecord = {
    ...record,
    lastAccessedAt: currentNow,
  };
  memoryPhraseListRecords.set(key, touched);
  void idbSetSceneRecord(touched).catch(() => {
    debugLog("touch persist failed", key);
  });
  return {
    found: true,
    record: touched,
    isExpired: touched.expiresAt <= currentNow,
  };
}

export async function setPhraseListCache(
  params: {
    query: string;
    status?: "saved" | "archived";
    reviewStatus?: "saved" | "reviewing" | "mastered" | "archived" | "all";
  learningItemType?: "expression" | "sentence" | "all";
  expressionFamilyId?: string;
  page?: number;
  limit?: number;
  },
  payload: {
    rows: UserPhraseItemResponse[];
    total: number;
    page: number;
    limit: number;
  },
): Promise<void> {
  if (!Array.isArray(payload.rows) || !payload.rows.every(isPhraseListItemValid)) {
    debugLog("skip invalid phrase list cache payload");
    return;
  }
  const normalizedParams = {
    query: params.query ?? "",
    status: params.status ?? "saved",
    reviewStatus: params.reviewStatus ?? "all",
    learningItemType: params.learningItemType ?? "all",
    expressionFamilyId: params.expressionFamilyId?.trim() ?? "",
    page: params.page ?? 1,
    limit: params.limit ?? 100,
  };
  const key = cacheKey(normalizedParams);
  const currentNow = nowMs();
  const next: PhraseListCacheRecord = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    key,
    type: "phrase_list",
    query: normalizeQuery(normalizedParams.query),
    status: normalizedParams.status,
    reviewStatus: normalizedParams.reviewStatus,
    learningItemType: normalizedParams.learningItemType,
    expressionFamilyId: normalizedParams.expressionFamilyId,
    page: normalizedParams.page,
    limit: normalizedParams.limit,
    data: payload,
    cachedAt: currentNow,
    lastAccessedAt: currentNow,
    expiresAt: currentNow + PHRASE_LIST_TTL_MS,
  };
  memoryPhraseListRecords.set(key, next);
  void idbSetSceneRecord(next).catch(() => {
    debugLog("set persist failed", key);
  });
}
