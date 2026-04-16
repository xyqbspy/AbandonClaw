import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { __resetTtsTestState, playSceneLoopAudio, stopTtsPlayback } from "./tts-api";

const originalFetch = globalThis.fetch;
const originalAudio = globalThis.Audio;

beforeEach(async () => {
  await __resetTtsTestState();
});

afterEach(async () => {
  await __resetTtsTestState();
  stopTtsPlayback();
  globalThis.fetch = originalFetch;
  globalThis.Audio = originalAudio;
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
