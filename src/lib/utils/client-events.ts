"use client";

export type ClientEventName =
  | "today_continue_clicked"
  | "today_review_opened"
  | "review_submitted"
  | "scene_learning_completed"
  | "tts_scene_loop_fallback_clicked";

export type ClientFailureName = "tts_scene_loop_failed";

type ClientEventPayload = Record<string, unknown>;

const buildPayload = (name: string, payload: ClientEventPayload) => ({
  name,
  at: new Date().toISOString(),
  ...payload,
});

export const recordClientEvent = (
  name: ClientEventName,
  payload: ClientEventPayload = {},
) => {
  console.info("[client-event]", buildPayload(name, payload));
};

export const recordClientFailureSummary = (
  name: ClientFailureName,
  payload: ClientEventPayload = {},
) => {
  console.warn("[client-failure]", buildPayload(name, payload));
};
