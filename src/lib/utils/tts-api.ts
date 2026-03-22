import {
  buildChunkAudioKey,
  buildSceneFullAudioKey,
  buildSentenceAudioKey,
  mergeSceneFullSegments,
} from "@/lib/shared/tts";

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
  error?: string;
}

type TtsUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

export type TtsPlaybackState = {
  kind: "sentence" | "chunk" | "scene" | null;
  status?: "idle" | "loading" | "playing";
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
  kind: "sentence" | "chunk" | "scene" | "unknown";
  size: number;
  contentType: string | null;
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

const getCachedTtsUrl = (cacheKey: string) => {
  const entry = ttsUrlCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    ttsUrlCache.delete(cacheKey);
    return null;
  }
  return entry.url;
};

const cacheTtsUrl = (cacheKey: string, url: string) => {
  ttsUrlCache.set(cacheKey, {
    url,
    expiresAt: Date.now() + ttsUrlCacheTtlMs,
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
  if (cacheKey.startsWith("sentence:")) return "sentence";
  if (cacheKey.startsWith("chunk:")) return "chunk";
  if (cacheKey.startsWith("scene:")) return "scene";
  return "unknown";
};

const revokePersistentAudioObjectUrl = (cacheKey: string) => {
  const objectUrl = persistentAudioObjectUrls.get(cacheKey);
  if (!objectUrl) return;
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(objectUrl);
  }
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
    return inMemoryUrl;
  }
  if (!canUseBrowserAudioCache()) return null;

  const cache = await getBrowserAudioCache();
  if (!cache) return null;
  const response = await cache.match(buildBrowserAudioCacheRequest(cacheKey));
  if (!response) return null;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  persistentAudioObjectUrls.set(cacheKey, objectUrl);
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
    persistentAudioObjectUrls.set(cacheKey, objectUrl);
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
      },
    }),
  );
  const objectUrl = URL.createObjectURL(blob);
  persistentAudioObjectUrls.set(cacheKey, objectUrl);
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
      } satisfies BrowserTtsCacheEntry;
    }),
  );

  return entries
    .filter((entry): entry is BrowserTtsCacheEntry => Boolean(entry))
    .sort((a, b) => b.size - a.size || a.cacheKey.localeCompare(b.cacheKey));
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
  if (preloadedAudioUrls.has(url)) return;
  preloadedAudioUrls.add(url);
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
      throw new Error(await extractError(response, fallbackError));
    }
    const data = (await response.json()) as TtsResponse;
    if (!data.url) {
      throw new Error("Invalid tts audio response.");
    }
    const url = cacheTtsUrl(cacheKey, data.url);
    preloadAudioUrl(url);
    void persistAudioToBrowserCache(cacheKey, data.url)
      .then((persistentUrl) => {
        if (!persistentUrl) return;
        cacheTtsUrl(cacheKey, persistentUrl);
        preloadAudioUrl(persistentUrl);
      })
      .catch(() => {
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
    utter.rate = mode === "slow" ? 0.8 : 1;
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
  const sentenceAudioKey = buildSentenceAudioKey({
    sentenceId: params.sentenceId,
    text: params.text,
    speaker: params.speaker,
    mode,
  });
  return requestTtsUrl(
    `sentence:${params.sceneSlug}:${sentenceAudioKey}`,
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
    `chunk:${key}`,
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
  const sceneFullKey = buildSceneFullAudioKey(
    mergeSceneFullSegments(params.segments, sceneType),
    sceneType,
  );
  return requestTtsUrl(
    `scene:${params.sceneSlug}:${sceneFullKey}`,
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

export async function playSentenceAudio(params: {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
}) {
  const requestId = nextPlaybackRequestId();
  setPlaybackState({
    kind: "sentence",
    status: "loading",
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
  const activeSceneLoop =
    playbackState.kind === "scene" &&
    playbackState.sceneSlug === params.sceneSlug &&
    Boolean(playbackState.isLooping);
  if (activeSceneLoop) {
    stopTtsPlayback();
    return { ok: true as const, url: null, stopped: true as const };
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
    const url = await ensureSceneFullAudio(params);
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
    return { ok: true as const, url, stopped: false as const };
  } catch (error) {
    setPlaybackState({
      kind: null,
      status: "idle",
      isLooping: false,
      text: undefined,
      requestId: undefined,
    });
    throw error;
  }
}

// Backward-compatible aliases currently used in reader code.
export const ensureSentenceTtsFromApi = ensureSentenceAudio;
export const ensureChunkTtsFromApi = ensureChunkAudio;

export const __resetTtsTestState = async (options?: { preservePersistentCache?: boolean }) => {
  stopTtsPlayback();
  ttsUrlCache.clear();
  pendingTtsUrlRequests.clear();
  preloadedAudioUrls.clear();
  for (const cacheKey of persistentAudioObjectUrls.keys()) {
    revokePersistentAudioObjectUrl(cacheKey);
  }
  playbackAudio = null;
  if (!options?.preservePersistentCache && typeof caches !== "undefined") {
    await caches.delete(browserTtsCacheName);
  }
};
