import {
  clearRuntimeCacheByPrefixes,
  readRuntimeCacheRecord,
  RuntimeCacheEnvelope,
  writeRuntimeCacheRecord,
} from "@/lib/cache/runtime-cache-core";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import {
  SimilarExpressionCandidateResponse,
  UserPhraseRelationItemResponse,
} from "@/lib/utils/phrases-api";

type PhraseRelationsCacheRecord = RuntimeCacheEnvelope<
  "chunks-relations-cache-v1",
  "phrase_relations",
  {
    userPhraseId: string;
    rows: UserPhraseRelationItemResponse[];
  }
>;

type GeneratedSimilarCacheRecord = RuntimeCacheEnvelope<
  "generated-similar-cache-v1",
  "generated_similar",
  {
    userPhraseId: string;
    candidates: SimilarExpressionCandidateResponse[];
  }
>;

type ChunksExpressionMapCacheRecord = RuntimeCacheEnvelope<
  "chunks-expression-map-cache-v1",
  "chunks_expression_map",
  {
    sourceUserPhraseId: string;
    expressionClusterId: string;
    map: ExpressionMapResponse;
  }
>;

const RELATIONS_SCHEMA_VERSION: PhraseRelationsCacheRecord["schemaVersion"] =
  "chunks-relations-cache-v1";
const GENERATED_SIMILAR_SCHEMA_VERSION: GeneratedSimilarCacheRecord["schemaVersion"] =
  "generated-similar-cache-v1";
const EXPRESSION_MAP_SCHEMA_VERSION: ChunksExpressionMapCacheRecord["schemaVersion"] =
  "chunks-expression-map-cache-v1";

const RELATIONS_PREFIX = "phrase-relations:v1:";
const GENERATED_SIMILAR_PREFIX = "generated-similar:v1:";
const EXPRESSION_MAP_PREFIX = "chunks-expression-map:v1:";

const RELATIONS_TTL_MS = 24 * 60 * 60 * 1000;
const GENERATED_SIMILAR_TTL_MS = 12 * 60 * 60 * 1000;
const EXPRESSION_MAP_TTL_MS = 24 * 60 * 60 * 1000;

const memoryRelationsRecords = new Map<string, PhraseRelationsCacheRecord>();
const memoryGeneratedSimilarRecords = new Map<string, GeneratedSimilarCacheRecord>();
const memoryExpressionMapRecords = new Map<string, ChunksExpressionMapCacheRecord>();

const nowMs = () => Date.now();

const normalizeId = (value: string) => value.trim();
const normalizeClusterId = (value: string | null | undefined) => value?.trim() ?? "";

const relationsKey = (userPhraseId: string) => `${RELATIONS_PREFIX}${normalizeId(userPhraseId)}`;
const generatedSimilarKey = (userPhraseId: string) =>
  `${GENERATED_SIMILAR_PREFIX}${normalizeId(userPhraseId)}`;
const expressionMapKey = (sourceUserPhraseId: string, expressionClusterId?: string | null) =>
  `${EXPRESSION_MAP_PREFIX}${normalizeId(sourceUserPhraseId)}:c=${encodeURIComponent(
    normalizeClusterId(expressionClusterId),
  )}`;

const isPhraseRelationRowValid = (row: UserPhraseRelationItemResponse) =>
  typeof row?.sourceUserPhraseId === "string" &&
  row.sourceUserPhraseId.trim().length > 0 &&
  (row.relationType === "similar" || row.relationType === "contrast") &&
  typeof row.item?.userPhraseId === "string" &&
  row.item.userPhraseId.trim().length > 0 &&
  typeof row.item?.text === "string" &&
  row.item.text.trim().length > 0;

const isRelationsRecordValid = (record: PhraseRelationsCacheRecord, key: string) =>
  record.schemaVersion === RELATIONS_SCHEMA_VERSION &&
  record.key === key &&
  record.type === "phrase_relations" &&
  typeof record.data?.userPhraseId === "string" &&
  Array.isArray(record.data.rows) &&
  record.data.rows.every(isPhraseRelationRowValid);

const isGeneratedSimilarCandidateValid = (item: SimilarExpressionCandidateResponse) =>
  typeof item?.text === "string" &&
  item.text.trim().length > 0 &&
  typeof item?.differenceLabel === "string";

const isGeneratedSimilarRecordValid = (record: GeneratedSimilarCacheRecord, key: string) =>
  record.schemaVersion === GENERATED_SIMILAR_SCHEMA_VERSION &&
  record.key === key &&
  record.type === "generated_similar" &&
  typeof record.data?.userPhraseId === "string" &&
  Array.isArray(record.data.candidates) &&
  record.data.candidates.every(isGeneratedSimilarCandidateValid);

const isExpressionMapRecordValid = (record: ChunksExpressionMapCacheRecord, key: string) =>
  record.schemaVersion === EXPRESSION_MAP_SCHEMA_VERSION &&
  record.key === key &&
  record.type === "chunks_expression_map" &&
  typeof record.data?.sourceUserPhraseId === "string" &&
  typeof record.data?.expressionClusterId === "string" &&
  record.data.map?.version === "v1" &&
  Array.isArray(record.data.map?.clusters);

export async function getPhraseRelationsCache(userPhraseId: string) {
  const key = relationsKey(userPhraseId);
  return readRuntimeCacheRecord(key, memoryRelationsRecords, isRelationsRecordValid);
}

export async function setPhraseRelationsCache(
  userPhraseId: string,
  rows: UserPhraseRelationItemResponse[],
) {
  if (!Array.isArray(rows) || !rows.every(isPhraseRelationRowValid)) return;
  const currentNow = nowMs();
  await writeRuntimeCacheRecord(
    {
      schemaVersion: RELATIONS_SCHEMA_VERSION,
      key: relationsKey(userPhraseId),
      type: "phrase_relations",
      data: {
        userPhraseId: normalizeId(userPhraseId),
        rows,
      },
      cachedAt: currentNow,
      lastAccessedAt: currentNow,
      expiresAt: currentNow + RELATIONS_TTL_MS,
    },
    memoryRelationsRecords,
  );
}

export async function getGeneratedSimilarCache(userPhraseId: string) {
  const key = generatedSimilarKey(userPhraseId);
  return readRuntimeCacheRecord(key, memoryGeneratedSimilarRecords, isGeneratedSimilarRecordValid);
}

export async function setGeneratedSimilarCache(
  userPhraseId: string,
  candidates: SimilarExpressionCandidateResponse[],
) {
  if (!Array.isArray(candidates) || !candidates.every(isGeneratedSimilarCandidateValid)) return;
  const currentNow = nowMs();
  await writeRuntimeCacheRecord(
    {
      schemaVersion: GENERATED_SIMILAR_SCHEMA_VERSION,
      key: generatedSimilarKey(userPhraseId),
      type: "generated_similar",
      data: {
        userPhraseId: normalizeId(userPhraseId),
        candidates,
      },
      cachedAt: currentNow,
      lastAccessedAt: currentNow,
      expiresAt: currentNow + GENERATED_SIMILAR_TTL_MS,
    },
    memoryGeneratedSimilarRecords,
  );
}

export async function getChunksExpressionMapCache(
  sourceUserPhraseId: string,
  expressionClusterId?: string | null,
) {
  const key = expressionMapKey(sourceUserPhraseId, expressionClusterId);
  return readRuntimeCacheRecord(key, memoryExpressionMapRecords, isExpressionMapRecordValid);
}

export async function setChunksExpressionMapCache(args: {
  sourceUserPhraseId: string;
  expressionClusterId?: string | null;
  map: ExpressionMapResponse;
}) {
  if (!args.map || args.map.version !== "v1" || !Array.isArray(args.map.clusters)) return;
  const currentNow = nowMs();
  await writeRuntimeCacheRecord(
    {
      schemaVersion: EXPRESSION_MAP_SCHEMA_VERSION,
      key: expressionMapKey(args.sourceUserPhraseId, args.expressionClusterId),
      type: "chunks_expression_map",
      data: {
        sourceUserPhraseId: normalizeId(args.sourceUserPhraseId),
        expressionClusterId: normalizeClusterId(args.expressionClusterId),
        map: args.map,
      },
      cachedAt: currentNow,
      lastAccessedAt: currentNow,
      expiresAt: currentNow + EXPRESSION_MAP_TTL_MS,
    },
    memoryExpressionMapRecords,
  );
}

export async function clearAllChunksRuntimeCache() {
  await clearRuntimeCacheByPrefixes(
    [
      memoryRelationsRecords as Map<string, unknown>,
      memoryGeneratedSimilarRecords as Map<string, unknown>,
      memoryExpressionMapRecords as Map<string, unknown>,
    ],
    [RELATIONS_PREFIX, GENERATED_SIMILAR_PREFIX, EXPRESSION_MAP_PREFIX],
  );
}
