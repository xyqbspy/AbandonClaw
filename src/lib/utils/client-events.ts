"use client";

export type ClientEventName =
  | "today_continue_clicked"
  | "today_review_opened"
  | "review_submitted"
  | "scene_learning_completed"
  | "sentence_audio_play_hit_cache"
  | "sentence_audio_play_miss_cache"
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
