import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { recordClientEvent, recordClientFailureSummary } from "./client-events";

const originalInfo = console.info;
const originalWarn = console.warn;

const infoCalls: unknown[][] = [];
const warnCalls: unknown[][] = [];

afterEach(() => {
  console.info = originalInfo;
  console.warn = originalWarn;
  infoCalls.length = 0;
  warnCalls.length = 0;
});

test("recordClientEvent 会输出结构化业务事件", () => {
  console.info = ((...args: unknown[]) => {
    infoCalls.push(args);
  }) as typeof console.info;

  recordClientEvent("review_submitted", {
    dueReviewCount: 2,
    reviewedTodayCount: 3,
  });

  assert.equal(infoCalls.length, 1);
  assert.equal(infoCalls[0]?.[0], "[client-event]");
  assert.equal((infoCalls[0]?.[1] as { name?: string }).name, "review_submitted");
});

test("recordClientFailureSummary 会输出结构化失败摘要", () => {
  console.warn = ((...args: unknown[]) => {
    warnCalls.push(args);
  }) as typeof console.warn;

  recordClientFailureSummary("tts_scene_loop_failed", {
    sceneSlug: "demo-scene",
  });

  assert.equal(warnCalls.length, 1);
  assert.equal(warnCalls[0]?.[0], "[client-failure]");
  assert.equal((warnCalls[0]?.[1] as { name?: string }).name, "tts_scene_loop_failed");
});
