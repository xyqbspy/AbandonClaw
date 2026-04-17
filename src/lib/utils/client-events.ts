"use client";

export type ClientEventName =
  | "today_continue_clicked"
  | "today_review_opened"
  | "review_submitted"
  | "scene_learning_completed"
  | "sentence_audio_play_hit_cache"
  | "sentence_audio_play_miss_cache"
  | "chunk_audio_play_hit_cache"
  | "chunk_audio_play_miss_cache"
  | "scene_full_play_ready"
  | "scene_full_play_wait_fetch"
  | "scene_full_play_cooling_down"
  | "tts_scene_loop_fallback_clicked";

export type ClientFailureName = "tts_scene_loop_failed" | "scene_full_play_fallback";

type ClientEventPayload = Record<string, unknown>;
export type ClientEventRecord = {
  id: string;
  kind: "event" | "failure";
  name: ClientEventName | ClientFailureName;
  at: string;
  payload: ClientEventPayload;
};

type WarmupSource = "initial" | "idle" | "playback";

type RateSummary = {
  total: number;
  hitRate: number | null;
};

export type TtsWarmupEffectivenessSummary = {
  block: {
    warmTotal: number;
    coldTotal: number;
    warmHitRate: number | null;
    coldHitRate: number | null;
    warmupGain: number | null;
  };
  sceneFull: {
    warmTotal: number;
    coldTotal: number;
    warmReadyRate: number | null;
    coldReadyRate: number | null;
    readyGain: number | null;
    warmFallbackRate: number | null;
    coldFallbackRate: number | null;
  };
  sources: Record<WarmupSource, RateSummary>;
};

const CLIENT_EVENT_STORAGE_KEY = "app:client-events";
const CLIENT_EVENT_UPDATE_EVENT = "app:client-events-updated";
const MAX_CLIENT_EVENT_RECORDS = 120;

const hasStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const buildPayload = (name: string, payload: ClientEventPayload) => ({
  name,
  at: new Date().toISOString(),
  ...payload,
});

const readStoredRecords = (): ClientEventRecord[] => {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(CLIENT_EVENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientEventRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStoredRecords = (records: ClientEventRecord[]) => {
  if (!hasStorage()) return;
  window.localStorage.setItem(CLIENT_EVENT_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(CLIENT_EVENT_UPDATE_EVENT));
};

const appendRecord = (
  kind: ClientEventRecord["kind"],
  name: ClientEventRecord["name"],
  payload: ClientEventPayload,
) => {
  const nextRecord: ClientEventRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    name,
    at: new Date().toISOString(),
    payload,
  };
  const records = readStoredRecords();
  writeStoredRecords([nextRecord, ...records].slice(0, MAX_CLIENT_EVENT_RECORDS));
};

export const listClientEventRecords = () => readStoredRecords();

export const clearClientEventRecords = () => {
  if (!hasStorage()) return;
  window.localStorage.removeItem(CLIENT_EVENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CLIENT_EVENT_UPDATE_EVENT));
};

export const subscribeClientEventRecords = (listener: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  const handleUpdate = () => listener();
  window.addEventListener(CLIENT_EVENT_UPDATE_EVENT, handleUpdate);
  return () => {
    window.removeEventListener(CLIENT_EVENT_UPDATE_EVENT, handleUpdate);
  };
};

export const recordClientEvent = (
  name: ClientEventName,
  payload: ClientEventPayload = {},
) => {
  appendRecord("event", name, payload);
  console.info("[client-event]", buildPayload(name, payload));
};

export const recordClientFailureSummary = (
  name: ClientFailureName,
  payload: ClientEventPayload = {},
) => {
  appendRecord("failure", name, payload);
  console.warn("[client-failure]", buildPayload(name, payload));
};

const emptySourceSummary = (): Record<WarmupSource, { total: number; hits: number }> => ({
  initial: { total: 0, hits: 0 },
  idle: { total: 0, hits: 0 },
  playback: { total: 0, hits: 0 },
});

const toRate = (count: number, total: number) => (total > 0 ? count / total : null);

const toGain = (warmRate: number | null, coldRate: number | null) =>
  warmRate == null || coldRate == null ? null : warmRate - coldRate;

const isWarmupSource = (value: unknown): value is WarmupSource =>
  value === "initial" || value === "idle" || value === "playback";

export const buildTtsWarmupEffectivenessSummary = (
  records: ClientEventRecord[],
): TtsWarmupEffectivenessSummary => {
  const block = {
    warmTotal: 0,
    warmHits: 0,
    coldTotal: 0,
    coldHits: 0,
  };
  const sceneFull = {
    warmTotal: 0,
    warmReady: 0,
    warmFallback: 0,
    coldTotal: 0,
    coldReady: 0,
    coldFallback: 0,
  };
  const sources = emptySourceSummary();

  for (const record of records) {
    const payload = record.payload;
    const warmed = payload.wasWarmed === true;
    const source = payload.warmupSource;

    if (
      (record.name === "sentence_audio_play_hit_cache" ||
        record.name === "sentence_audio_play_miss_cache") &&
      payload.audioUnit === "block"
    ) {
      const hit = record.name === "sentence_audio_play_hit_cache";
      if (warmed) {
        block.warmTotal += 1;
        if (hit) block.warmHits += 1;
        if (isWarmupSource(source)) {
          sources[source].total += 1;
          if (hit) sources[source].hits += 1;
        }
      } else {
        block.coldTotal += 1;
        if (hit) block.coldHits += 1;
      }
      continue;
    }

    if (
      record.name === "scene_full_play_ready" ||
      record.name === "scene_full_play_wait_fetch" ||
      record.name === "scene_full_play_cooling_down" ||
      record.name === "scene_full_play_fallback"
    ) {
      const ready = record.name === "scene_full_play_ready";
      const fallback = record.name === "scene_full_play_fallback";
      if (warmed) {
        sceneFull.warmTotal += 1;
        if (ready) sceneFull.warmReady += 1;
        if (fallback) sceneFull.warmFallback += 1;
        if (isWarmupSource(source)) {
          sources[source].total += 1;
          if (ready) sources[source].hits += 1;
        }
      } else {
        sceneFull.coldTotal += 1;
        if (ready) sceneFull.coldReady += 1;
        if (fallback) sceneFull.coldFallback += 1;
      }
    }
  }

  const blockWarmHitRate = toRate(block.warmHits, block.warmTotal);
  const blockColdHitRate = toRate(block.coldHits, block.coldTotal);
  const sceneFullWarmReadyRate = toRate(sceneFull.warmReady, sceneFull.warmTotal);
  const sceneFullColdReadyRate = toRate(sceneFull.coldReady, sceneFull.coldTotal);

  return {
    block: {
      warmTotal: block.warmTotal,
      coldTotal: block.coldTotal,
      warmHitRate: blockWarmHitRate,
      coldHitRate: blockColdHitRate,
      warmupGain: toGain(blockWarmHitRate, blockColdHitRate),
    },
    sceneFull: {
      warmTotal: sceneFull.warmTotal,
      coldTotal: sceneFull.coldTotal,
      warmReadyRate: sceneFullWarmReadyRate,
      coldReadyRate: sceneFullColdReadyRate,
      readyGain: toGain(sceneFullWarmReadyRate, sceneFullColdReadyRate),
      warmFallbackRate: toRate(sceneFull.warmFallback, sceneFull.warmTotal),
      coldFallbackRate: toRate(sceneFull.coldFallback, sceneFull.coldTotal),
    },
    sources: {
      initial: {
        total: sources.initial.total,
        hitRate: toRate(sources.initial.hits, sources.initial.total),
      },
      idle: {
        total: sources.idle.total,
        hitRate: toRate(sources.idle.hits, sources.idle.total),
      },
      playback: {
        total: sources.playback.total,
        hitRate: toRate(sources.playback.hits, sources.playback.total),
      },
    },
  };
};
