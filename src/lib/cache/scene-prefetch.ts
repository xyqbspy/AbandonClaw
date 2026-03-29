import { getSceneCache, normalizeSceneSlug, setSceneCache } from "@/lib/cache/scene-cache";
import { scheduleLessonAudioWarmup } from "@/lib/utils/resource-actions";
import { getSceneDetailBySlugFromApi } from "@/lib/utils/scenes-api";

const SCENE_PREFETCH_MAX = 2;
const RECENT_PREFETCH_WINDOW_MS = 10 * 60 * 1000;

type PrefetchOptions = {
  currentSlug?: string;
};

type PrefetchDebugState = {
  pendingKeys: string[];
  inFlightKey: string | null;
  recentPrefetchedKeys: string[];
};

type IdleHandle = number;

const pendingQueue: string[] = [];
const inFlightPrefetchSet = new Set<string>();
const inFlightPrefetchPromiseMap = new Map<string, Promise<boolean>>();
const recentPrefetchedAt = new Map<string, number>();
let idleHandle: IdleHandle | null = null;
let inFlightKey: string | null = null;

type IdleDeadlineLike = {
  timeRemaining: () => number;
  didTimeout: boolean;
};

type RequestIdleCallbackFn = (
  callback: (deadline: IdleDeadlineLike) => void,
  opts?: { timeout?: number },
) => number;

type CancelIdleCallbackFn = (handle: number) => void;

const getRequestIdleCallback = () =>
  (window as typeof window & { requestIdleCallback?: RequestIdleCallbackFn })
    .requestIdleCallback;

const getCancelIdleCallback = () =>
  (window as typeof window & { cancelIdleCallback?: CancelIdleCallbackFn })
    .cancelIdleCallback;

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[scene-prefetch]", ...args);
};

const isClient = () => typeof window !== "undefined";

const isWeakNetwork = () => {
  if (!isClient()) return false;
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  };
  const connection = nav.connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
};

const isPageVisible = () => !isClient() || document.visibilityState === "visible";

const isPrefetchEnvironmentAllowed = () => isClient() && isPageVisible() && !isWeakNetwork();

const isSlugValid = (slug: string) => /^[a-z0-9][a-z0-9-]{0,127}$/.test(slug);

const pruneRecentPrefetched = () => {
  const now = Date.now();
  for (const [slug, ts] of recentPrefetchedAt.entries()) {
    if (now - ts > RECENT_PREFETCH_WINDOW_MS) {
      recentPrefetchedAt.delete(slug);
    }
  }
};

const enqueueCandidates = (candidates: string[]) => {
  for (const slug of candidates) {
    if (pendingQueue.includes(slug)) continue;
    pendingQueue.push(slug);
  }
};

const scheduleIdleRun = (options: PrefetchOptions) => {
  if (!isClient()) return;
  if (idleHandle !== null) return;

  const run = () => {
    idleHandle = null;
    void flushPrefetchQueue(options);
  };

  const requestIdle = getRequestIdleCallback();
  if (requestIdle) {
    idleHandle = requestIdle(
      () => {
        run();
      },
      { timeout: 1500 },
    );
    return;
  }

  idleHandle = window.setTimeout(run, 600);
};

const clearIdleRun = () => {
  if (!isClient() || idleHandle === null) return;
  const cancelIdle = getCancelIdleCallback();
  if (cancelIdle) {
    cancelIdle(idleHandle);
  } else {
    window.clearTimeout(idleHandle);
  }
  idleHandle = null;
};

export async function shouldPrefetchScene(slug: string, options?: PrefetchOptions) {
  const normalized = normalizeSceneSlug(slug);
  const currentSlug = normalizeSceneSlug(options?.currentSlug ?? "");

  if (!isSlugValid(normalized)) return false;
  if (!isPrefetchEnvironmentAllowed()) return false;
  if (normalized === currentSlug) return false;
  if (inFlightPrefetchSet.has(normalized)) return false;

  pruneRecentPrefetched();
  const recentTs = recentPrefetchedAt.get(normalized);
  if (recentTs && Date.now() - recentTs <= RECENT_PREFETCH_WINDOW_MS) return false;

  try {
    const cache = await getSceneCache(normalized);
    if (cache.found && !cache.isExpired) return false;
  } catch {
    // Cache read failures should not block prefetch.
  }

  return true;
}

export async function prefetchSceneDetail(slug: string, options?: PrefetchOptions) {
  const normalized = normalizeSceneSlug(slug);
  const existingPromise = inFlightPrefetchPromiseMap.get(normalized);
  if (existingPromise) {
    return existingPromise;
  }
  const task = (async () => {
    const allowed = await shouldPrefetchScene(normalized, options);
    if (!allowed) return false;
    inFlightPrefetchSet.add(normalized);
    inFlightKey = normalized;
    try {
      const scene = await getSceneDetailBySlugFromApi(normalized);
      await setSceneCache(normalized, scene);
      scheduleLessonAudioWarmup(scene, {
        sentenceLimit: 1,
        chunkLimit: 2,
        key: `scene-prefetch-audio:${normalized}`,
      });
      recentPrefetchedAt.set(normalized, Date.now());
      debugLog("prefetched", normalized);
      return true;
    } catch (error) {
      debugLog("prefetch failed", normalized, error);
      return false;
    } finally {
      inFlightPrefetchSet.delete(normalized);
      inFlightPrefetchPromiseMap.delete(normalized);
      inFlightKey = null;
    }
  })();

  inFlightPrefetchPromiseMap.set(normalized, task);
  return task;
}

const flushPrefetchQueue = async (options: PrefetchOptions) => {
  if (!isPrefetchEnvironmentAllowed()) return;
  let completed = 0;

  while (pendingQueue.length > 0 && completed < SCENE_PREFETCH_MAX) {
    if (!isPrefetchEnvironmentAllowed()) break;
    const next = pendingQueue.shift();
    if (!next) break;
    const ok = await prefetchSceneDetail(next, options);
    if (ok) completed += 1;
  }
};

export function scheduleScenePrefetch(candidates: string[], options?: PrefetchOptions) {
  if (!isClient()) return;
  if (!isPrefetchEnvironmentAllowed()) return;

  const normalizedUnique = Array.from(
    new Set(
      candidates
        .map((slug) => normalizeSceneSlug(slug))
        .filter(Boolean)
        .filter((slug) => isSlugValid(slug)),
    ),
  );
  if (normalizedUnique.length === 0) return;

  enqueueCandidates(normalizedUnique);
  scheduleIdleRun(options ?? {});
}

export function getPrefetchDebugState(): PrefetchDebugState {
  pruneRecentPrefetched();
  return {
    pendingKeys: [...pendingQueue],
    inFlightKey,
    recentPrefetchedKeys: [...recentPrefetchedAt.keys()],
  };
}

export function resetScenePrefetchSchedulerForTests() {
  clearIdleRun();
  pendingQueue.length = 0;
  inFlightPrefetchSet.clear();
  inFlightPrefetchPromiseMap.clear();
  recentPrefetchedAt.clear();
  inFlightKey = null;
}
