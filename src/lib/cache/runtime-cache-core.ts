import {
  idbDeleteSceneRecord,
  idbGetAllSceneRecordKeys,
  idbGetSceneRecord,
  idbSetSceneRecord,
} from "@/lib/cache/indexeddb";

export type RuntimeCacheEnvelope<TSchemaVersion extends string, TType extends string, TData> = {
  schemaVersion: TSchemaVersion;
  key: string;
  type: TType;
  data: TData;
  cachedAt: number;
  lastAccessedAt: number;
  expiresAt: number;
};

type RuntimeCacheReadableRecord = {
  key: string;
  expiresAt: number;
  lastAccessedAt: number;
};

const nowMs = () => Date.now();

export async function readRuntimeCacheRecord<TRecord extends RuntimeCacheReadableRecord>(
  key: string,
  memory: Map<string, TRecord>,
  isValid: (record: TRecord, expectedKey: string) => boolean,
) {
  const currentNow = nowMs();
  let record = memory.get(key) ?? null;
  if (!record) {
    record = await idbGetSceneRecord<TRecord>(key);
    if (record) {
      memory.set(key, record);
    }
  }

  if (!record) {
    return { found: false, record: null, isExpired: false };
  }
  if (!isValid(record, key)) {
    memory.delete(key);
    await idbDeleteSceneRecord(key);
    return { found: false, record: null, isExpired: false };
  }

  const touched = {
    ...record,
    lastAccessedAt: currentNow,
  };
  memory.set(key, touched);
  void idbSetSceneRecord(touched).catch(() => {
    // Ignore persistence failures.
  });
  return {
    found: true,
    record: touched,
    isExpired: touched.expiresAt <= currentNow,
  };
}

export function readRuntimeCacheRecordSync<TRecord extends { key: string; expiresAt: number }>(
  key: string,
  memory: Map<string, TRecord>,
  isValid: (record: TRecord, expectedKey: string) => boolean,
  onInvalid?: (key: string) => void,
) {
  const record = memory.get(key) ?? null;
  if (!record) {
    return { found: false, record: null, isExpired: false };
  }
  if (!isValid(record, key)) {
    memory.delete(key);
    onInvalid?.(key);
    return { found: false, record: null, isExpired: false };
  }
  return {
    found: true,
    record,
    isExpired: record.expiresAt <= nowMs(),
  };
}

export async function writeRuntimeCacheRecord<TRecord extends { key: string }>(
  record: TRecord,
  memory: Map<string, TRecord>,
) {
  memory.set(record.key, record);
  void idbSetSceneRecord(record).catch(() => {
    // Ignore persistence failures.
  });
}

export async function clearRuntimeCacheByPrefixes(
  memoryMaps: Array<Map<string, unknown>>,
  prefixes: string[],
) {
  const keys = [
    ...memoryMaps.flatMap((memory) => Array.from(memory.keys())),
    ...(await idbGetAllSceneRecordKeys()).filter((key) =>
      prefixes.some((prefix) => key.startsWith(prefix)),
    ),
  ];
  const uniqueKeys = Array.from(new Set(keys));
  memoryMaps.forEach((memory) => memory.clear());
  await Promise.all(uniqueKeys.map((key) => idbDeleteSceneRecord(key)));
}

export function cleanupRuntimeCacheRecord(key: string) {
  void idbDeleteSceneRecord(key).catch(() => {
    // Ignore cleanup failures.
  });
}
