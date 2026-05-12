import {
  buildChunkAudioKey,
  buildSceneFullAudioKey,
  buildSentenceAudioKey,
  mergeSceneFullSegments,
} from "@/lib/shared/tts";
import {
  inferSceneFullFailureReason,
  normalizeSceneFullFailureReason,
  type SceneFullFailureReason,
} from "@/lib/shared/tts-failure";
import {
  recordClientEvent,
  recordClientFailureSummary,
} from "@/lib/utils/client-events";
import {
  __resetTtsWarmupRegistryForTests,
  getWarmupInfo,
} from "@/lib/utils/tts-warmup-registry";
import {
  getUserVoiceSpeedRate,
  readUserVoiceSpeedPreference,
} from "@/lib/utils/user-settings";

type SentenceTtsPayload = {
  kind: "sentence";
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
};

type SceneFullSegment = {
  text: string;
  speaker?: string;
};

type SceneFullTtsPayload = {
  kind: "scene_full";
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: SceneFullSegment[];
};

type ChunkTtsPayload = {
  kind: "chunk";
  chunkKey?: string;
  text: string;
};

export type TtsRequestPayload = SentenceTtsPayload | ChunkTtsPayload | SceneFullTtsPayload;

interface TtsResponse {
  url?: string;
  cached?: boolean;
  source?: "storage-hit" | "fresh-upload" | "inline-fallback";
  error?: string;
  code?: string;
  details?: Record<string, unknown> | null;
}

type RegenerateTtsResponse = {
  regeneratedCount: number;
  error?: string;
};

type TtsUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

type TtsCacheLimits = {
  urlEntries: number;
  preloadedUrls: number;
  persistentObjectUrls: number;
  browserEntries: number;
  browserBytes: number;
};

type TtsAudioReadiness = "cache" | "pending" | "miss";
type SentenceAudioUnit = "sentence" | "block";
type SceneFullPlaybackReadiness =
  | "ready"
  | "cold"
  | "pending"
  | "failed_recently"
  | "cooling_down";

export type TtsPlaybackState = {
  kind: "sentence" | "chunk" | "scene" | null;
  status?: "idle" | "loading" | "playing";
  audioUnit?: SentenceAudioUnit;
  sentenceId?: string;
  chunkKey?: string;
  sceneSlug?: string;
  mode?: "normal" | "slow";
  isLooping?: boolean;
  text?: string;
  requestId?: number;
};

export type BrowserTtsCacheEntry = {
  cacheKey: string;
  kind: "sentence" | "block" | "chunk" | "scene" | "unknown";
  size: number;
  contentType: string | null;
  cachedAt: number | null;
};

let currentAudio: HTMLAudioElement | null = null;
let playbackAudio: HTMLAudioElement | null = null;
let playbackGeneration = 0;
let playbackRequestSeq = 0;
let playbackState: TtsPlaybackState = {
  kind: null,
  status: "idle",
  isLooping: false,
};
const playbackListeners = new Set<(state: TtsPlaybackState) => void>();
const ttsUrlCache = new Map<string, TtsUrlCacheEntry>();
const pendingTtsUrlRequests = new Map<string, Promise<string>>();
const preloadedAudioUrls = new Set<string>();
const persistentAudioObjectUrls = new Map<string, string>();
const ttsUrlCacheTtlMs = 45 * 60 * 1000;
const browserTtsCacheName = "tts-audio-v2";
const defaultSceneFullFailureCooldownMs = 45_000;
const defaultTtsCacheLimits: TtsCacheLimits = {
  urlEntries: 180,
  preloadedUrls: 180,
  persistentObjectUrls: 120,
  browserEntries: 120,
  browserBytes: 24 * 1024 * 1024,
};
let ttsCacheLimits: TtsCacheLimits = { ...defaultTtsCacheLimits };
let sceneFullFailureCooldownMs = defaultSceneFullFailureCooldownMs;
const sceneFullFailureCooldowns = new Map<
  string,
  {
    failureReason: SceneFullFailureReason;
    failedAt: number;
    expiresAt: number;
  }
>();

class TtsClientError extends Error {
  failureReason: SceneFullFailureReason;
  details: Record<string, unknown>;

  constructor(message: string, failureReason: SceneFullFailureReason, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "TtsClientError";
    this.failureReason = failureReason;
    this.details = details;
  }
}

const emitPlaybackState = () => {
  for (const listener of playbackListeners) {
    listener(playbackState);
  }
};

const setPlaybackState = (next: TtsPlaybackState) => {
  playbackState = next;
  emitPlaybackState();
};

export const getTtsPlaybackState = () => playbackState;

export const subscribeTtsPlaybackState = (listener: (state: TtsPlaybackState) => void) => {
  playbackListeners.add(listener);
  return () => {
    playbackListeners.delete(listener);
  };
};

export const buildSentenceTtsCacheKey = (params: {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
}) => {
  const mode = params.mode ?? "normal";
  const sentenceAudioKey = buildSentenceAudioKey({
    sentenceId: params.sentenceId,
    text: params.text,
    speaker: params.speaker,
    mode,
  });
  return `sentence:${params.sceneSlug}:${sentenceAudioKey}`;
};

export const buildChunkTtsCacheKey = (params: { chunkText: string; chunkKey?: string }) => {
  const key = params.chunkKey ?? buildChunkAudioKey(params.chunkText);
  return `chunk:${key}`;
};

const resolveSentenceAudioUnit = (sentenceId: string): SentenceAudioUnit =>
  sentenceId.startsWith("block-") ? "block" : "sentence";

export const buildSceneFullTtsCacheKey = (params: {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
}) => {
  const sceneType = params.sceneType ?? "monologue";
  const sceneFullKey = buildSceneFullAudioKey(
    mergeSceneFullSegments(params.segments, sceneType),
    sceneType,
  );
  return `scene:${params.sceneSlug}:${sceneFullKey}`;
};

export const setTtsLooping = (isLooping: boolean) => {
  setPlaybackState({
    ...playbackState,
    isLooping,
  });
};

const nextPlaybackRequestId = () => {
  playbackRequestSeq += 1;
  return playbackRequestSeq;
};

const clearPlaybackStateIfCurrent = (requestId: number) => {
  if (playbackState.requestId !== requestId) return;
  setPlaybackState({
    kind: null,
    status: "idle",
    isLooping: false,
    text: undefined,
    requestId: undefined,
  });
};

const extractError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as TtsResponse;
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // ignore
  }
  return fallback;
};

const extractTtsClientError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as TtsResponse;
    const details = body.details && typeof body.details === "object" ? body.details : {};
    const detailReason = normalizeSceneFullFailureReason(details.failureReason);
    const failureReason =
      detailReason === "unknown"
        ? inferSceneFullFailureReason(body.error ?? body.code ?? fallback)
        : detailReason;
    return new TtsClientError(
      typeof body.error === "string" && body.error.trim() ? body.error : fallback,
      failureReason,
      {
        ...details,
        code: body.code,
      },
    );
  } catch {
    return new TtsClientError(fallback, "unknown");
  }
};

const touchMapEntry = <K, V>(map: Map<K, V>, key: K, value: V) => {
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, value);
};

const touchSetEntry = <T>(set: Set<T>, value: T) => {
  if (set.has(value)) {
    set.delete(value);
  }
  set.add(value);
};

const pruneOldestMapEntries = <K, V>(
  map: Map<K, V>,
  maxEntries: number,
  options?: {
    protectedKeys?: K[];
    onDelete?: (key: K, value: V) => void;
  },
) => {
  if (maxEntries < 1) return;
  const protectedKeys = new Set(options?.protectedKeys ?? []);
  for (const [key, value] of map) {
    if (map.size <= maxEntries) break;
    if (protectedKeys.has(key)) continue;
    map.delete(key);
    options?.onDelete?.(key, value);
  }
};

const pruneOldestSetEntries = <T>(
  set: Set<T>,
  maxEntries: number,
  options?: { protectedValues?: T[] },
) => {
  if (maxEntries < 1) return;
  const protectedValues = new Set(options?.protectedValues ?? []);
  for (const value of set) {
    if (set.size <= maxEntries) break;
    if (protectedValues.has(value)) continue;
    set.delete(value);
  }
};

const revokeAudioObjectUrl = (objectUrl: string) => {
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(objectUrl);
  }
};

const getCachedTtsUrl = (cacheKey: string) => {
  const entry = ttsUrlCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    ttsUrlCache.delete(cacheKey);
    return null;
  }
  touchMapEntry(ttsUrlCache, cacheKey, entry);
  return entry.url;
};

const hasPersistentAudioCache = async (cacheKey: string) => {
  if (persistentAudioObjectUrls.has(cacheKey)) return true;
  if (!canUseBrowserAudioCache()) return false;
  try {
    const cache = await getBrowserAudioCache();
    if (!cache) return false;
    return Boolean(await cache.match(buildBrowserAudioCacheRequest(cacheKey)));
  } catch {
    return false;
  }
};

const getTtsAudioReadiness = async (cacheKey: string): Promise<TtsAudioReadiness> => {
  if (getCachedTtsUrl(cacheKey)) return "cache";
  if (await hasPersistentAudioCache(cacheKey)) return "cache";
  if (pendingTtsUrlRequests.has(cacheKey)) return "pending";
  return "miss";
};

const getSceneFullCooldown = (sceneFullKey: string, now = Date.now()) => {
  const cooldown = sceneFullFailureCooldowns.get(sceneFullKey);
  if (!cooldown) return null;
  if (cooldown.expiresAt <= now) {
    sceneFullFailureCooldowns.delete(sceneFullKey);
    return null;
  }
  return {
    ...cooldown,
    remainingMs: cooldown.expiresAt - now,
  };
};

export const getSceneFullAudioCooldown = (params: {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
}) => getSceneFullCooldown(buildSceneFullTtsCacheKey(params));

const markSceneFullFailureCooldown = (
  sceneFullKey: string,
  failureReason: SceneFullFailureReason,
  now = Date.now(),
) => {
  sceneFullFailureCooldowns.set(sceneFullKey, {
    failureReason,
    failedAt: now,
    expiresAt: now + sceneFullFailureCooldownMs,
  });
};

const clearSceneFullFailureCooldown = (sceneFullKey: string) => {
  sceneFullFailureCooldowns.delete(sceneFullKey);
};

const resolveSceneFullPlaybackReadiness = async (
  sceneFullKey: string,
): Promise<SceneFullPlaybackReadiness> => {
  if (getSceneFullCooldown(sceneFullKey)) return "cooling_down";
  const readiness = await getTtsAudioReadiness(sceneFullKey);
  if (readiness === "cache") return "ready";
  if (readiness === "pending") return "pending";
  return "cold";
};

const cacheTtsUrl = (cacheKey: string, url: string) => {
  const entry = {
    url,
    expiresAt: Date.now() + ttsUrlCacheTtlMs,
  };
  touchMapEntry(ttsUrlCache, cacheKey, entry);
  pruneOldestMapEntries(ttsUrlCache, ttsCacheLimits.urlEntries, {
    protectedKeys: [cacheKey],
  });
  return url;
};

const canUseBrowserAudioCache = () =>
  typeof window !== "undefined" && typeof caches !== "undefined" && typeof URL !== "undefined";

const buildBrowserAudioCacheRequest = (cacheKey: string) =>
  new Request(`https://local.tts.cache/${encodeURIComponent(cacheKey)}`);

const getBrowserAudioCache = async () => {
  if (!canUseBrowserAudioCache()) return null;
  return caches.open(browserTtsCacheName);
};

const resolveBrowserTtsCacheKind = (cacheKey: string): BrowserTtsCacheEntry["kind"] => {
  if (/^sentence:[^:]+:sentence-block-/.test(cacheKey)) return "block";
  if (cacheKey.startsWith("sentence:")) return "sentence";
  if (cacheKey.startsWith("chunk:")) return "chunk";
  if (cacheKey.startsWith("scene:")) return "scene";
  return "unknown";
};

const rememberPersistentAudioObjectUrl = (cacheKey: string, objectUrl: string) => {
  const existingObjectUrl = persistentAudioObjectUrls.get(cacheKey);
  if (existingObjectUrl && existingObjectUrl !== objectUrl) {
    revokeAudioObjectUrl(existingObjectUrl);
  }
  touchMapEntry(persistentAudioObjectUrls, cacheKey, objectUrl);
  pruneOldestMapEntries(persistentAudioObjectUrls, ttsCacheLimits.persistentObjectUrls, {
    protectedKeys: [cacheKey],
    onDelete: (_evictedCacheKey, evictedObjectUrl) => {
      revokeAudioObjectUrl(evictedObjectUrl);
    },
  });
};

const revokePersistentAudioObjectUrl = (cacheKey: string) => {
  const objectUrl = persistentAudioObjectUrls.get(cacheKey);
  if (!objectUrl) return;
  revokeAudioObjectUrl(objectUrl);
  persistentAudioObjectUrls.delete(cacheKey);
};

const clearTtsCachesByKeys = (cacheKeys: string[]) => {
  for (const cacheKey of cacheKeys) {
    revokePersistentAudioObjectUrl(cacheKey);
    ttsUrlCache.delete(cacheKey);
    pendingTtsUrlRequests.delete(cacheKey);
  }
};

const readPersistentAudioUrl = async (cacheKey: string) => {
  const inMemoryUrl = persistentAudioObjectUrls.get(cacheKey);
  if (inMemoryUrl) {
    rememberPersistentAudioObjectUrl(cacheKey, inMemoryUrl);
    return inMemoryUrl;
  }
  if (!canUseBrowserAudioCache()) return null;

  const cache = await getBrowserAudioCache();
  if (!cache) return null;
  const response = await cache.match(buildBrowserAudioCacheRequest(cacheKey));
  if (!response) return null;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  rememberPersistentAudioObjectUrl(cacheKey, objectUrl);
  return objectUrl;
};

const persistAudioToBrowserCache = async (cacheKey: string, sourceUrl: string) => {
  if (!canUseBrowserAudioCache()) return null;

  const cache = await getBrowserAudioCache();
  if (!cache) return null;
  const cacheRequest = buildBrowserAudioCacheRequest(cacheKey);
  const existing = await cache.match(cacheRequest);
  if (existing) {
    const existingUrl = persistentAudioObjectUrls.get(cacheKey);
    if (existingUrl) return existingUrl;
    const blob = await existing.blob();
    const objectUrl = URL.createObjectURL(blob);
    rememberPersistentAudioObjectUrl(cacheKey, objectUrl);
    return objectUrl;
  }

  const sourceResponse = await fetch(sourceUrl);
  if (!sourceResponse.ok) {
    throw new Error("Failed to persist tts audio.");
  }
  const blob = await sourceResponse.blob();
  await cache.put(
    cacheRequest,
    new Response(blob, {
      headers: {
        "Content-Type": blob.type || "audio/mpeg",
        "X-TTS-Cached-At": String(Date.now()),
      },
    }),
  );
  const objectUrl = URL.createObjectURL(blob);
  rememberPersistentAudioObjectUrl(cacheKey, objectUrl);
  return objectUrl;
};

export const listBrowserTtsCacheEntries = async (): Promise<BrowserTtsCacheEntry[]> => {
  const cache = await getBrowserAudioCache();
  if (!cache || typeof cache.keys !== "function") return [];

  const requests = await cache.keys();
  const entries = await Promise.all(
    requests.map(async (request) => {
      const response = await cache.match(request);
      if (!response) return null;

      const blob = await response.blob();
      const encodedKey = request.url.replace("https://local.tts.cache/", "");
      const cacheKey = decodeURIComponent(encodedKey);

      return {
        cacheKey,
        kind: resolveBrowserTtsCacheKind(cacheKey),
        size: blob.size,
        contentType: response.headers.get("Content-Type"),
        cachedAt: Number(response.headers.get("X-TTS-Cached-At") || "") || null,
      } satisfies BrowserTtsCacheEntry;
    }),
  );

  return entries
    .filter((entry): entry is BrowserTtsCacheEntry => Boolean(entry))
    .sort((a, b) => b.size - a.size || a.cacheKey.localeCompare(b.cacheKey));
};

const pruneBrowserTtsCacheIfNeeded = async (protectedCacheKeys: string[]) => {
  const cache = await getBrowserAudioCache();
  if (!cache) return;

  const entries = await listBrowserTtsCacheEntries();
  let entryCount = entries.length;
  let totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (
    entryCount <= ttsCacheLimits.browserEntries &&
    totalBytes <= ttsCacheLimits.browserBytes
  ) {
    return;
  }

  const protectedKeys = new Set(protectedCacheKeys);
  const toDelete: string[] = [];
  const oldestFirst = [...entries].sort(
    (a, b) => (a.cachedAt ?? 0) - (b.cachedAt ?? 0) || a.cacheKey.localeCompare(b.cacheKey),
  );

  for (const entry of oldestFirst) {
    if (
      entryCount <= ttsCacheLimits.browserEntries &&
      totalBytes <= ttsCacheLimits.browserBytes
    ) {
      break;
    }
    if (protectedKeys.has(entry.cacheKey)) continue;
    toDelete.push(entry.cacheKey);
    entryCount -= 1;
    totalBytes -= entry.size;
  }

  if (toDelete.length > 0) {
    await clearBrowserTtsCacheEntries(toDelete);
  }
};

export const getBrowserTtsCacheSummary = async () => {
  const entries = await listBrowserTtsCacheEntries();
  return {
    entryCount: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.size, 0),
  };
};

export const clearBrowserTtsCacheEntries = async (cacheKeys: string[]) => {
  if (cacheKeys.length === 0) {
    return { removedCount: 0, removedBytes: 0 };
  }

  const cache = await getBrowserAudioCache();
  if (!cache) {
    clearTtsCachesByKeys(cacheKeys);
    return { removedCount: 0, removedBytes: 0 };
  }

  let removedCount = 0;
  let removedBytes = 0;

  for (const cacheKey of cacheKeys) {
    const request = buildBrowserAudioCacheRequest(cacheKey);
    const existing = await cache.match(request);
    if (existing) {
      removedBytes += (await existing.blob()).size;
      const deleted = await cache.delete(request);
      if (deleted) {
        removedCount += 1;
      }
    }
  }

  clearTtsCachesByKeys(cacheKeys);

  return {
    removedCount,
    removedBytes,
  };
};

export const regenerateChunkAudioBatch = async (items: Array<{ chunkText: string; chunkKey?: string }>) => {
  const normalizedItems = Array.from(
    new Map(
      items
        .map((item) => {
          const chunkText = item.chunkText.trim();
          if (!chunkText) return null;
          const chunkKey = item.chunkKey ?? buildChunkAudioKey(chunkText);
          return [chunkKey, { chunkText, chunkKey }] as const;
        })
        .filter((item): item is readonly [string, { chunkText: string; chunkKey: string }] => Boolean(item)),
    ).values(),
  );

  if (normalizedItems.length === 0) {
    return { regeneratedCount: 0 };
  }

  stopTtsPlayback();
  await clearBrowserTtsCacheEntries(normalizedItems.map((item) => `chunk:${item.chunkKey}`));

  const response = await fetch("/api/tts/regenerate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: normalizedItems.map((item) => ({
        text: item.chunkText,
        chunkKey: item.chunkKey,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to regenerate chunk audio."));
  }
  const data = (await response.json()) as RegenerateTtsResponse;
  for (const item of normalizedItems) {
    void prefetchChunkAudio({
      chunkText: item.chunkText,
      chunkKey: item.chunkKey,
    });
  }
  return data;
};

export const clearAllBrowserTtsCache = async () => {
  const entries = await listBrowserTtsCacheEntries();
  const result = await clearBrowserTtsCacheEntries(entries.map((entry) => entry.cacheKey));
  return {
    ...result,
    previousEntryCount: entries.length,
  };
};

const preloadAudioUrl = (url: string) => {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (preloadedAudioUrls.has(url)) {
    touchSetEntry(preloadedAudioUrls, url);
    return;
  }
  touchSetEntry(preloadedAudioUrls, url);
  pruneOldestSetEntries(preloadedAudioUrls, ttsCacheLimits.preloadedUrls, {
    protectedValues: [url],
  });
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  audio.load();
};

const ensurePlaybackAudio = () => {
  if (typeof Audio === "undefined") {
    throw new Error("audio playback unavailable");
  }
  if (!playbackAudio) {
    playbackAudio = new Audio();
    playbackAudio.preload = "auto";
  }
  return playbackAudio;
};

const getPreferredAudioPlaybackRate = () =>
  getUserVoiceSpeedRate(readUserVoiceSpeedPreference());

const getPreferredSpeechRate = (mode: "normal" | "slow" = "normal") => {
  const preferredRate = getPreferredAudioPlaybackRate();
  return mode === "slow" ? 0.8 * preferredRate : preferredRate;
};

const requestTtsUrl = async (
  cacheKey: string,
  payload: TtsRequestPayload,
  fallbackError: string,
) => {
  const persistentUrl = await readPersistentAudioUrl(cacheKey);
  if (persistentUrl) {
    cacheTtsUrl(cacheKey, persistentUrl);
    preloadAudioUrl(persistentUrl);
    return persistentUrl;
  }

  const cachedUrl = getCachedTtsUrl(cacheKey);
  if (cachedUrl) {
    preloadAudioUrl(cachedUrl);
    return cachedUrl;
  }

  const pending = pendingTtsUrlRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const task = (async () => {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await extractTtsClientError(response, fallbackError);
    }
    const data = (await response.json()) as TtsResponse;
    if (!data.url) {
      throw new Error("Invalid tts audio response.");
    }
    const url = cacheTtsUrl(cacheKey, data.url);
    preloadAudioUrl(url);
    void persistAudioToBrowserCache(cacheKey, data.url)
      .then(async (persistentUrl) => {
        if (!persistentUrl) return;
        cacheTtsUrl(cacheKey, persistentUrl);
        preloadAudioUrl(persistentUrl);
        await pruneBrowserTtsCacheIfNeeded([cacheKey]);
      })
      .catch((error) => {
        console.warn("[tts-cache] browser cache persistence/prune skipped", {
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        });
        // Non-blocking persistence.
      });
    return url;
  })().finally(() => {
    pendingTtsUrlRequests.delete(cacheKey);
  });

  pendingTtsUrlRequests.set(cacheKey, task);
  return task;
};

const speakByBrowser = async (text: string, mode: "normal" | "slow" = "normal") => {
  if (typeof window === "undefined") {
    throw new Error("window is unavailable");
  }
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    throw new Error("speechSynthesis is unavailable");
  }
  await new Promise<void>((resolve, reject) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = getPreferredSpeechRate(mode);
    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("speechSynthesis playback failed"));
    window.speechSynthesis.cancel();
    utter.text = text;
    window.speechSynthesis.speak(utter);
  });
};

const fallbackSpeakSafe = async (text: string, mode: "normal" | "slow") => {
  try {
    await speakByBrowser(text, mode);
    return true;
  } catch {
    return false;
  }
};

export const stopTtsPlayback = () => {
  playbackGeneration += 1;
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.loop = false;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  setPlaybackState({
    kind: null,
    status: "idle",
    isLooping: false,
    text: undefined,
    requestId: undefined,
  });
};

const playAudioUrl = async (url: string) => {
  const generation = playbackGeneration + 1;
  playbackGeneration = generation;
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.loop = false;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  const audio = ensurePlaybackAudio();
  audio.loop = false;
  audio.playbackRate = getPreferredAudioPlaybackRate();
  if (audio.src !== url) {
    audio.src = url;
  }
  audio.currentTime = 0;
  audio.load();
  currentAudio = audio;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      reject(new Error("audio playback failed"));
    };
    audio
      .play()
      .then(() => {
        // started
      })
      .catch((error) => {
        if (currentAudio === audio) currentAudio = null;
        reject(error);
      });
  });
  if (generation !== playbackGeneration) return;
};

export async function ensureSentenceAudio(params: {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
}) {
  const mode = params.mode ?? "normal";
  return requestTtsUrl(
    buildSentenceTtsCacheKey(params),
    {
      kind: "sentence",
      sceneSlug: params.sceneSlug,
      sentenceId: params.sentenceId,
      text: params.text,
      speaker: params.speaker,
      mode,
    } satisfies SentenceTtsPayload,
    "Failed to generate sentence audio.",
  );
}

export async function ensureChunkAudio(params: {
  chunkText: string;
  chunkKey?: string;
}) {
  const key = params.chunkKey ?? buildChunkAudioKey(params.chunkText);
  return requestTtsUrl(
    buildChunkTtsCacheKey({ chunkText: params.chunkText, chunkKey: key }),
    {
      kind: "chunk",
      chunkKey: key,
      text: params.chunkText,
    } satisfies ChunkTtsPayload,
    "Failed to generate chunk audio.",
  );
}

export async function ensureSceneFullAudio(params: {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
}) {
  const sceneType = params.sceneType ?? "monologue";
  return requestTtsUrl(
    buildSceneFullTtsCacheKey(params),
    {
      kind: "scene_full",
      sceneSlug: params.sceneSlug,
      sceneType,
      segments: params.segments,
    } satisfies SceneFullTtsPayload,
    "Failed to generate full scene audio.",
  );
}

export const prefetchSentenceAudio = async (params: {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
}) => {
  try {
    await ensureSentenceAudio(params);
  } catch {
    // Non-blocking.
  }
};

export const prefetchChunkAudio = async (params: {
  chunkText: string;
  chunkKey?: string;
}) => {
  try {
    await ensureChunkAudio(params);
  } catch {
    // Non-blocking.
  }
};

export const prefetchSceneFullAudio = async (params: {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
}) => {
  try {
    await ensureSceneFullAudio(params);
  } catch {
    // Non-blocking.
  }
};

const recordSentenceAudioPlayEvent = (
  params: {
    sceneSlug: string;
    sentenceId: string;
    mode?: "normal" | "slow";
  },
  readiness: TtsAudioReadiness,
  cacheKey: string,
) => {
  const audioUnit = resolveSentenceAudioUnit(params.sentenceId);
  const warmupInfo = getWarmupInfo(cacheKey);
  recordClientEvent(
    readiness === "cache" ? "sentence_audio_play_hit_cache" : "sentence_audio_play_miss_cache",
    {
      sceneSlug: params.sceneSlug,
      audioUnit,
      sentenceId: params.sentenceId,
      mode: params.mode ?? "normal",
      readiness,
      wasWarmed: warmupInfo.wasWarmed,
      ...(warmupInfo.source ? { warmupSource: warmupInfo.source } : {}),
    },
  );
};

const recordChunkAudioPlayEvent = (
  params: {
    chunkText: string;
    chunkKey?: string;
  },
  readiness: TtsAudioReadiness,
  cacheKey: string,
) => {
  const warmupInfo = getWarmupInfo(cacheKey);
  recordClientEvent(
    readiness === "cache" ? "chunk_audio_play_hit_cache" : "chunk_audio_play_miss_cache",
    {
      audioUnit: "chunk",
      chunkKey: params.chunkKey ?? buildChunkAudioKey(params.chunkText),
      readiness,
      wasWarmed: warmupInfo.wasWarmed,
      ...(warmupInfo.source ? { warmupSource: warmupInfo.source } : {}),
    },
  );
};

const recordSceneFullPlayEvent = (
  params: {
    sceneSlug: string;
    sceneType?: "dialogue" | "monologue";
    segments: Array<{ text: string; speaker?: string }>;
  },
  readiness: SceneFullPlaybackReadiness,
  sceneFullKey: string,
) => {
  const warmupInfo = getWarmupInfo(sceneFullKey);
  recordClientEvent(
    readiness === "ready" ? "scene_full_play_ready" : "scene_full_play_wait_fetch",
    {
      sceneSlug: params.sceneSlug,
      audioUnit: "scene_full",
      sceneType: params.sceneType ?? "monologue",
      segmentCount: params.segments.length,
      sceneFullKey,
      readiness,
      wasWarmed: warmupInfo.wasWarmed,
      ...(warmupInfo.source ? { warmupSource: warmupInfo.source } : {}),
    },
  );
};

const recordSceneFullCoolingDownEvent = (
  params: {
    sceneSlug: string;
    sceneType?: "dialogue" | "monologue";
    segments: Array<{ text: string; speaker?: string }>;
  },
  sceneFullKey: string,
  cooldown: NonNullable<ReturnType<typeof getSceneFullCooldown>>,
) => {
  const warmupInfo = getWarmupInfo(sceneFullKey);
  recordClientEvent("scene_full_play_cooling_down", {
    sceneSlug: params.sceneSlug,
    audioUnit: "scene_full",
    sceneType: params.sceneType ?? "monologue",
    segmentCount: params.segments.length,
    sceneFullKey,
    readiness: "cooling_down",
    failureReason: "cooling_down",
    previousFailureReason: cooldown.failureReason,
    cooldownMs: cooldown.remainingMs,
    wasWarmed: warmupInfo.wasWarmed,
    ...(warmupInfo.source ? { warmupSource: warmupInfo.source } : {}),
  });
};

const toControlledSceneFullPlaybackError = (
  failureReason: SceneFullFailureReason,
  details: Record<string, unknown> = {},
) =>
  new TtsClientError(
    "完整场景音频暂时不可用，你可以先逐段跟读或稍后重试。",
    failureReason,
    details,
  );

export const getSceneFullFailureReasonFromError = (error: unknown): SceneFullFailureReason => {
  if (error instanceof TtsClientError) return error.failureReason;
  return inferSceneFullFailureReason(error);
};

export async function playSentenceAudio(params: {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
}) {
  const requestId = nextPlaybackRequestId();
  const audioUnit = resolveSentenceAudioUnit(params.sentenceId);
  const cacheKey = buildSentenceTtsCacheKey(params);
  const readiness = await getTtsAudioReadiness(cacheKey);
  recordSentenceAudioPlayEvent(params, readiness, cacheKey);
  setPlaybackState({
    kind: "sentence",
    status: "loading",
    audioUnit,
    sentenceId: params.sentenceId,
    mode: params.mode ?? "normal",
    isLooping: playbackState.isLooping ?? false,
    text: params.text,
    requestId,
  });
  try {
    const url = await ensureSentenceAudio(params);
    if (playbackState.requestId !== requestId) {
      return { ok: true as const, url, stopped: true as const };
    }
    setPlaybackState({
      kind: "sentence",
      status: "playing",
      audioUnit,
      sentenceId: params.sentenceId,
      mode: params.mode ?? "normal",
      isLooping: false,
      text: params.text,
      requestId,
    });
    await playAudioUrl(url);
    return { ok: true as const, url };
  } catch {
    const spoken = await fallbackSpeakSafe(params.text, params.mode ?? "normal");
    if (spoken) {
      return { ok: true as const, url: null };
    }
    throw new Error("语音播放失败，请稍后重试。");
  } finally {
    clearPlaybackStateIfCurrent(requestId);
  }
}

export async function playChunkAudio(params: { chunkText: string; chunkKey?: string }) {
  const chunkKey = params.chunkKey ?? buildChunkAudioKey(params.chunkText);
  const cacheKey = buildChunkTtsCacheKey({ chunkText: params.chunkText, chunkKey });
  const readiness = await getTtsAudioReadiness(cacheKey);
  recordChunkAudioPlayEvent({ ...params, chunkKey }, readiness, cacheKey);
  const requestId = nextPlaybackRequestId();
  setPlaybackState({
    kind: "chunk",
    status: "loading",
    chunkKey,
    mode: "normal",
    isLooping: playbackState.isLooping ?? false,
    text: params.chunkText,
    requestId,
  });
  try {
    const url = await ensureChunkAudio({ ...params, chunkKey });
    if (playbackState.requestId !== requestId) {
      return { ok: true as const, url, stopped: true as const };
    }
    setPlaybackState({
      kind: "chunk",
      status: "playing",
      chunkKey,
      mode: "normal",
      isLooping: false,
      text: params.chunkText,
      requestId,
    });
    await playAudioUrl(url);
    return { ok: true as const, url };
  } catch {
    const spoken = await fallbackSpeakSafe(params.chunkText, "normal");
    if (spoken) {
      return { ok: true as const, url: null };
    }
    throw new Error("语音播放失败，请稍后重试。");
  } finally {
    clearPlaybackStateIfCurrent(requestId);
  }
}

export async function playSceneLoopAudio(params: {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
}) {
  const sceneFullKey = buildSceneFullTtsCacheKey(params);
  const activeSceneLoop =
    playbackState.kind === "scene" &&
    playbackState.sceneSlug === params.sceneSlug &&
    Boolean(playbackState.isLooping);
  if (activeSceneLoop) {
    stopTtsPlayback();
    return { ok: true as const, url: null, stopped: true as const };
  }

  const existingCooldown = getSceneFullCooldown(sceneFullKey);
  if (existingCooldown) {
    recordSceneFullCoolingDownEvent(params, sceneFullKey, existingCooldown);
    const warmupInfo = getWarmupInfo(sceneFullKey);
    recordClientFailureSummary("scene_full_play_fallback", {
      sceneSlug: params.sceneSlug,
      audioUnit: "scene_full",
      sceneType: params.sceneType ?? "monologue",
      segmentCount: params.segments.length,
      sceneFullKey,
      readiness: "cooling_down",
      failureReason: "cooling_down",
      previousFailureReason: existingCooldown.failureReason,
      cooldownMs: existingCooldown.remainingMs,
      message: "Scene full playback is cooling down after a recent failure.",
      wasWarmed: warmupInfo.wasWarmed,
      ...(warmupInfo.source ? { warmupSource: warmupInfo.source } : {}),
    });
    throw toControlledSceneFullPlaybackError("cooling_down", {
      sceneFullKey,
      readiness: "cooling_down",
      cooldownMs: existingCooldown.remainingMs,
      previousFailureReason: existingCooldown.failureReason,
    });
  }

  stopTtsPlayback();
  const requestId = nextPlaybackRequestId();
  setPlaybackState({
    kind: "scene",
    status: "loading",
    sceneSlug: params.sceneSlug,
    isLooping: true,
    text: params.sceneSlug,
    requestId,
  });
  const generation = playbackGeneration;

  try {
    const readiness = await resolveSceneFullPlaybackReadiness(sceneFullKey);
    if (readiness === "cooling_down") {
      const cooldown = getSceneFullCooldown(sceneFullKey);
      if (cooldown) {
        recordSceneFullCoolingDownEvent(params, sceneFullKey, cooldown);
        throw toControlledSceneFullPlaybackError("cooling_down", {
          sceneFullKey,
          readiness,
          cooldownMs: cooldown.remainingMs,
          previousFailureReason: cooldown.failureReason,
        });
      }
    }
    recordSceneFullPlayEvent(params, readiness, sceneFullKey);
    const url = await ensureSceneFullAudio(params);
    clearSceneFullFailureCooldown(sceneFullKey);
    if (
      playbackGeneration !== generation ||
      playbackState.kind !== "scene" ||
      playbackState.sceneSlug !== params.sceneSlug ||
      !playbackState.isLooping
    ) {
      return { ok: true as const, url: null, stopped: true as const };
    }
    setPlaybackState({
      kind: "scene",
      status: "playing",
      sceneSlug: params.sceneSlug,
      isLooping: true,
      text: params.sceneSlug,
      requestId,
    });
    const audio = ensurePlaybackAudio();
    if (audio.src !== url) {
      audio.src = url;
    }
    audio.currentTime = 0;
    audio.load();
    audio.loop = true;
    audio.playbackRate = getPreferredAudioPlaybackRate();
    currentAudio = audio;
    audio.onerror = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
      setPlaybackState({
        kind: null,
        status: "idle",
        isLooping: false,
        text: undefined,
        requestId: undefined,
      });
    };
    await audio.play();
    clearSceneFullFailureCooldown(sceneFullKey);
    return { ok: true as const, url, stopped: false as const };
  } catch (error) {
    const failureReason = getSceneFullFailureReasonFromError(error);
    if (failureReason !== "cooling_down") {
      markSceneFullFailureCooldown(sceneFullKey, failureReason);
    }
    const cooldown = getSceneFullCooldown(sceneFullKey);
    const warmupInfo = getWarmupInfo(sceneFullKey);
    recordClientFailureSummary("scene_full_play_fallback", {
      sceneSlug: params.sceneSlug,
      audioUnit: "scene_full",
      sceneType: params.sceneType ?? "monologue",
      segmentCount: params.segments.length,
      sceneFullKey,
      readiness: failureReason === "cooling_down" ? "cooling_down" : "failed_recently",
      failureReason,
      cooldownMs: cooldown?.remainingMs ?? 0,
      message: error instanceof Error ? error.message : "Scene full playback failed.",
      wasWarmed: warmupInfo.wasWarmed,
      ...(warmupInfo.source ? { warmupSource: warmupInfo.source } : {}),
    });
    setPlaybackState({
      kind: null,
      status: "idle",
      isLooping: false,
      text: undefined,
      requestId: undefined,
    });
    throw toControlledSceneFullPlaybackError(failureReason, {
      sceneFullKey,
      readiness: failureReason === "cooling_down" ? "cooling_down" : "failed_recently",
      cooldownMs: cooldown?.remainingMs ?? 0,
    });
  }
}

export async function playSceneFullAudioOnce(params: {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
}) {
  const sceneFullKey = buildSceneFullTtsCacheKey(params);
  const existingCooldown = getSceneFullCooldown(sceneFullKey);
  if (existingCooldown) {
    recordSceneFullCoolingDownEvent(params, sceneFullKey, existingCooldown);
    throw toControlledSceneFullPlaybackError("cooling_down", {
      sceneFullKey,
      readiness: "cooling_down",
      cooldownMs: existingCooldown.remainingMs,
      previousFailureReason: existingCooldown.failureReason,
    });
  }

  stopTtsPlayback();
  const requestId = nextPlaybackRequestId();
  setPlaybackState({
    kind: "scene",
    status: "loading",
    sceneSlug: params.sceneSlug,
    isLooping: false,
    text: params.sceneSlug,
    requestId,
  });
  const generation = playbackGeneration;

  try {
    const readiness = await resolveSceneFullPlaybackReadiness(sceneFullKey);
    if (readiness === "cooling_down") {
      const cooldown = getSceneFullCooldown(sceneFullKey);
      if (cooldown) {
        recordSceneFullCoolingDownEvent(params, sceneFullKey, cooldown);
        throw toControlledSceneFullPlaybackError("cooling_down", {
          sceneFullKey,
          readiness,
          cooldownMs: cooldown.remainingMs,
          previousFailureReason: cooldown.failureReason,
        });
      }
    }
    recordSceneFullPlayEvent(params, readiness, sceneFullKey);
    const url = await ensureSceneFullAudio(params);
    clearSceneFullFailureCooldown(sceneFullKey);
    if (
      playbackGeneration !== generation ||
      playbackState.kind !== "scene" ||
      playbackState.sceneSlug !== params.sceneSlug ||
      playbackState.isLooping
    ) {
      return { ok: true as const, url: null, stopped: true as const };
    }
    setPlaybackState({
      kind: "scene",
      status: "playing",
      sceneSlug: params.sceneSlug,
      isLooping: false,
      text: params.sceneSlug,
      requestId,
    });
    await playAudioUrl(url);
    clearSceneFullFailureCooldown(sceneFullKey);
    return { ok: true as const, url, stopped: false as const };
  } catch (error) {
    const failureReason = getSceneFullFailureReasonFromError(error);
    if (failureReason !== "cooling_down") {
      markSceneFullFailureCooldown(sceneFullKey, failureReason);
    }
    const cooldown = getSceneFullCooldown(sceneFullKey);
    const warmupInfo = getWarmupInfo(sceneFullKey);
    recordClientFailureSummary("scene_full_play_fallback", {
      sceneSlug: params.sceneSlug,
      audioUnit: "scene_full",
      sceneType: params.sceneType ?? "monologue",
      segmentCount: params.segments.length,
      sceneFullKey,
      readiness: cooldown ? "cooling_down" : "failed_recently",
      failureReason,
      cooldownMs: cooldown?.remainingMs,
      message: error instanceof Error ? error.message : "Scene full playback failed.",
      wasWarmed: warmupInfo.wasWarmed,
      ...(warmupInfo.source ? { warmupSource: warmupInfo.source } : {}),
    });
    throw toControlledSceneFullPlaybackError(failureReason, {
      sceneFullKey,
      readiness: cooldown ? "cooling_down" : "failed_recently",
      cooldownMs: cooldown?.remainingMs,
    });
  } finally {
    clearPlaybackStateIfCurrent(requestId);
  }
}

// Backward-compatible aliases currently used in reader code.
export const ensureSentenceTtsFromApi = ensureSentenceAudio;
export const ensureChunkTtsFromApi = ensureChunkAudio;

export const __resetTtsTestState = async (options?: { preservePersistentCache?: boolean }) => {
  stopTtsPlayback();
  ttsCacheLimits = { ...defaultTtsCacheLimits };
  ttsUrlCache.clear();
  pendingTtsUrlRequests.clear();
  sceneFullFailureCooldowns.clear();
  sceneFullFailureCooldownMs = defaultSceneFullFailureCooldownMs;
  __resetTtsWarmupRegistryForTests();
  preloadedAudioUrls.clear();
  for (const cacheKey of persistentAudioObjectUrls.keys()) {
    revokePersistentAudioObjectUrl(cacheKey);
  }
  playbackAudio = null;
  if (!options?.preservePersistentCache && typeof caches !== "undefined") {
    await caches.delete(browserTtsCacheName);
  }
};

export const __setTtsCacheLimitsForTests = (overrides: Partial<TtsCacheLimits>) => {
  ttsCacheLimits = {
    ...ttsCacheLimits,
    ...overrides,
  };
};

export const __setSceneFullFailureCooldownMsForTests = (cooldownMs: number) => {
  sceneFullFailureCooldownMs = Math.max(0, cooldownMs);
};
