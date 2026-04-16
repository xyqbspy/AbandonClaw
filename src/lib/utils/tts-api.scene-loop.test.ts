import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  clearClientEventRecords,
  listClientEventRecords,
} from "./client-events";
import { __resetTtsTestState, playSceneLoopAudio, stopTtsPlayback } from "./tts-api";

const originalFetch = globalThis.fetch;
const originalAudio = globalThis.Audio;
const originalWindow = globalThis.window;

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
  };
};

beforeEach(async () => {
  await __resetTtsTestState();
  clearClientEventRecords();
});

afterEach(async () => {
  await __resetTtsTestState();
  stopTtsPlayback();
  globalThis.fetch = originalFetch;
  globalThis.Audio = originalAudio;
  globalThis.window = originalWindow;
  clearClientEventRecords();
});

test("playSceneLoopAudio 在 scene full 失败时返回受控错误文案", async () => {
  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;

    load() {}
    play() {
      return Promise.resolve();
    }
    pause() {}
  }

  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "upstream failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  await assert.rejects(
    () =>
      playSceneLoopAudio({
        sceneSlug: "demo-scene",
        sceneType: "dialogue",
        segments: [{ text: "Hello there", speaker: "A" }],
      }),
    /完整场景音频暂时不可用/,
  );
});

test("playSceneLoopAudio 会记录 ready / wait_fetch / fallback 事件", async () => {
  let requestCount = 0;
  globalThis.window = {
    localStorage: createLocalStorageMock(),
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  class FakeAudio {
    preload = "auto";
    src = "";
    currentTime = 0;
    loop = false;
    onended: null | (() => void) = null;
    onerror: null | (() => void) = null;

    load() {}
    play() {
      return Promise.resolve();
    }
    pause() {}
  }

  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.fetch = (async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ url: "https://cdn.test/scene-full.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const payload = {
    sceneSlug: "demo-scene",
    sceneType: "dialogue" as const,
    segments: [{ text: "Hello there", speaker: "A" }],
  };

  await playSceneLoopAudio(payload);
  stopTtsPlayback();
  await playSceneLoopAudio(payload);
  stopTtsPlayback();

  assert.equal(requestCount, 1);
  assert.deepEqual(
    listClientEventRecords().map((record) => record.name).reverse(),
    ["scene_full_play_wait_fetch", "scene_full_play_ready"],
  );

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "upstream failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  await __resetTtsTestState();

  await assert.rejects(() => playSceneLoopAudio(payload), /完整场景音频暂时不可用/);

  assert.equal(listClientEventRecords()[0]?.name, "scene_full_play_fallback");
});
