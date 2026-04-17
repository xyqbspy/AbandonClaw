import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  clearClientEventRecords,
  listClientEventRecords,
  recordClientEvent,
  recordClientFailureSummary,
} from "./client-events";

const originalInfo = console.info;
const originalWarn = console.warn;
const originalWindow = globalThis.window;

const infoCalls: unknown[][] = [];
const warnCalls: unknown[][] = [];

afterEach(() => {
  console.info = originalInfo;
  console.warn = originalWarn;
  globalThis.window = originalWindow;
  infoCalls.length = 0;
  warnCalls.length = 0;
});

const createLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

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

test("client-events 会把最近记录写入 localStorage 并支持清空", () => {
  const localStorage = createLocalStorageMock();
  globalThis.window = {
    localStorage,
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  recordClientEvent("today_review_opened", { dueReviewCount: 2 });
  recordClientFailureSummary("tts_scene_loop_failed", { sceneSlug: "demo-scene" });

  const records = listClientEventRecords();
  assert.equal(records.length, 2);
  assert.equal(records[0]?.kind, "failure");
  assert.equal(records[1]?.kind, "event");

  clearClientEventRecords();
  assert.deepEqual(listClientEventRecords(), []);
});

test("client-events 支持音频预热与播放观测事件", () => {
  const localStorage = createLocalStorageMock();
  globalThis.window = {
    localStorage,
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  recordClientEvent("sentence_audio_play_hit_cache", {
    sceneSlug: "demo-scene",
    sentenceId: "s-1",
  });
  recordClientEvent("sentence_audio_play_miss_cache", {
    sceneSlug: "demo-scene",
    sentenceId: "s-2",
  });
  recordClientEvent("scene_full_play_ready", {
    sceneSlug: "demo-scene",
  });
  recordClientEvent("scene_full_play_wait_fetch", {
    sceneSlug: "demo-scene",
  });
  recordClientEvent("scene_full_play_cooling_down", {
    sceneSlug: "demo-scene",
  });
  recordClientFailureSummary("scene_full_play_fallback", {
    sceneSlug: "demo-scene",
  });

  assert.deepEqual(
    listClientEventRecords().map((record) => record.name),
    [
      "scene_full_play_fallback",
      "scene_full_play_cooling_down",
      "scene_full_play_wait_fetch",
      "scene_full_play_ready",
      "sentence_audio_play_miss_cache",
      "sentence_audio_play_hit_cache",
    ],
  );
});
