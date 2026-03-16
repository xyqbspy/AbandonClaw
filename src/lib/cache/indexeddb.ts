const DB_NAME = "abandon-en-cache-v1";
const DB_VERSION = 1;
const STORE_SCENE_RECORDS = "scene_records";
const STORE_META = "meta";

type MetaRecord = {
  key: string;
  value: unknown;
};

let openDbPromise: Promise<IDBDatabase | null> | null = null;
let indexedDbDisabled = false;

const canUseIndexedDb = () =>
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "development") return;
  // eslint-disable-next-line no-console
  console.debug("[scene-cache][idb]", ...args);
};

const openDb = async (): Promise<IDBDatabase | null> => {
  if (indexedDbDisabled) return null;
  if (!canUseIndexedDb()) return null;
  if (openDbPromise) return openDbPromise;

  openDbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_SCENE_RECORDS)) {
          db.createObjectStore(STORE_SCENE_RECORDS, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        debugLog("open failed", request.error?.message ?? "unknown");
        indexedDbDisabled = true;
        resolve(null);
      };
      request.onblocked = () => {
        debugLog("open blocked");
        indexedDbDisabled = true;
        resolve(null);
      };
    } catch (error) {
      debugLog("open exception", error);
      indexedDbDisabled = true;
      resolve(null);
    }
  });

  return openDbPromise;
};

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
) => {
  const db = await openDb();
  if (!db) return null;

  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = await run(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
    return result;
  } catch (error) {
    debugLog("transaction failed", storeName, error);
    return null;
  }
};

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export async function idbGetSceneRecord<T>(key: string): Promise<T | null> {
  const result = await withStore(STORE_SCENE_RECORDS, "readonly", async (store) => {
    const req = store.get(key);
    return requestToPromise(req);
  });
  return (result as T | undefined) ?? null;
}

export async function idbSetSceneRecord<T extends { key: string }>(value: T): Promise<boolean> {
  const result = await withStore(STORE_SCENE_RECORDS, "readwrite", async (store) => {
    await requestToPromise(store.put(value));
    return true;
  });
  return Boolean(result);
}

export async function idbDeleteSceneRecord(key: string): Promise<boolean> {
  const result = await withStore(STORE_SCENE_RECORDS, "readwrite", async (store) => {
    await requestToPromise(store.delete(key));
    return true;
  });
  return Boolean(result);
}

export async function idbGetMeta<T>(key: string): Promise<T | null> {
  const result = await withStore(STORE_META, "readonly", async (store) => {
    const req = store.get(key);
    return requestToPromise(req);
  });
  const record = (result as MetaRecord | undefined) ?? null;
  if (!record) return null;
  return (record.value as T) ?? null;
}

export async function idbSetMeta<T>(key: string, value: T): Promise<boolean> {
  const result = await withStore(STORE_META, "readwrite", async (store) => {
    await requestToPromise(
      store.put({
        key,
        value,
      } as MetaRecord),
    );
    return true;
  });
  return Boolean(result);
}
