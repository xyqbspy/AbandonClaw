import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  clearClientEventRecords,
  listClientEventRecords,
} from "./client-events";
import {
  __resetTtsTestState,
  __setSceneFullFailureCooldownMsForTests,
  buildSceneFullTtsCacheKey,
  playSceneLoopAudio,
  stopTtsPlayback,
} from "./tts-api";
import { markAudioWarmed } from "./tts-warmup-registry";

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
  markAudioWarmed(buildSceneFullTtsCacheKey(payload), "idle");

  await playSceneLoopAudio(payload);
  stopTtsPlayback();
  await playSceneLoopAudio(payload);
  stopTtsPlayback();

  assert.equal(requestCount, 1);
  assert.deepEqual(
    listClientEventRecords().map((record) => record.name).reverse(),
    ["scene_full_play_wait_fetch", "scene_full_play_ready"],
  );
  assert.deepEqual(
    listClientEventRecords()
      .map((record) => record.payload.readiness)
      .reverse(),
    ["cold", "ready"],
  );
  assert.deepEqual(
    listClientEventRecords()
      .map((record) => record.payload.wasWarmed)
      .reverse(),
    [true, true],
  );
  assert.deepEqual(
    listClientEventRecords()
      .map((record) => record.payload.warmupSource)
      .reverse(),
    ["idle", "idle"],
  );

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "upstream failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  await __resetTtsTestState();
  markAudioWarmed(buildSceneFullTtsCacheKey(payload), "playback");

  await assert.rejects(() => playSceneLoopAudio(payload), /完整场景音频暂时不可用/);

  assert.equal(listClientEventRecords()[0]?.name, "scene_full_play_fallback");
  assert.equal(listClientEventRecords()[0]?.payload.failureReason, "provider_error");
  assert.equal(listClientEventRecords()[0]?.payload.wasWarmed, true);
  assert.equal(listClientEventRecords()[0]?.payload.warmupSource, "playback");
});

test("playSceneLoopAudio 会对同一个 scene full 失败做短时冷却", async () => {
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
    return new Response(JSON.stringify({ error: "upstream failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const payload = {
    sceneSlug: "demo-scene",
    sceneType: "dialogue" as const,
    segments: [{ text: "Hello there", speaker: "A" }],
  };

  await assert.rejects(() => playSceneLoopAudio(payload), /完整场景音频暂时不可用/);
  await assert.rejects(() => playSceneLoopAudio(payload), /完整场景音频暂时不可用/);

  assert.equal(requestCount, 1);
  assert.equal(listClientEventRecords()[0]?.name, "scene_full_play_fallback");
  assert.equal(listClientEventRecords()[1]?.name, "scene_full_play_cooling_down");
  assert.equal(listClientEventRecords()[1]?.payload.failureReason, "cooling_down");
});

test("playSceneLoopAudio 冷却过期后允许重新尝试，成功后清理冷却", async () => {
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
  __setSceneFullFailureCooldownMsForTests(1);
  globalThis.fetch = (async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return new Response(JSON.stringify({ error: "upstream failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
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

  await assert.rejects(() => playSceneLoopAudio(payload), /完整场景音频暂时不可用/);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await playSceneLoopAudio(payload);
  stopTtsPlayback();
  await playSceneLoopAudio(payload);

  assert.equal(requestCount, 2);
  assert.equal(
    listClientEventRecords().some((record) => record.name === "scene_full_play_ready"),
    true,
  );
});
