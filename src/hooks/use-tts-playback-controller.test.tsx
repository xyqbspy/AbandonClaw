import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const playChunkCalls: Array<{ chunkText: string; chunkKey: string }> = [];
const playSentenceCalls: Array<{ sceneSlug: string; sentenceId: string; text: string; mode?: string }> = [];
const playSceneCalls: Array<{ sceneSlug: string }> = [];
const loopCalls: boolean[] = [];
const stopCalls: string[] = [];
const errorCalls: string[] = [];

let chunkShouldThrow = false;
let sentenceShouldThrow = false;
let playbackState = {
  kind: null as "chunk" | "sentence" | "scene" | null,
  status: "idle" as "idle" | "loading" | "playing",
  chunkKey: undefined as string | undefined,
  sentenceId: undefined as string | undefined,
  sceneSlug: undefined as string | undefined,
  mode: undefined as "normal" | "slow" | undefined,
  isLooping: false,
  text: undefined as string | undefined,
};

const mockedModules = {
  "@/hooks/use-tts-playback-state": {
    useTtsPlaybackState: () => playbackState,
  },
  "@/lib/shared/tts": {
    buildChunkAudioKey: (text: string) => text.trim().toLowerCase().replace(/\s+/g, "-"),
  },
  "@/lib/utils/tts-api": {
    playChunkAudio: async ({ chunkText, chunkKey }: { chunkText: string; chunkKey: string }) => {
      playChunkCalls.push({ chunkText, chunkKey });
      if (chunkShouldThrow) {
        throw new Error("chunk failed");
      }
    },
    playSentenceAudio: async (payload: {
      sceneSlug: string;
      sentenceId: string;
      text: string;
      mode?: "normal" | "slow";
    }) => {
      playSentenceCalls.push(payload);
      if (sentenceShouldThrow) {
        throw new Error("sentence failed");
      }
    },
    playSceneLoopAudio: async ({ sceneSlug }: { sceneSlug: string }) => {
      playSceneCalls.push({ sceneSlug });
    },
    setTtsLooping: (next: boolean) => {
      loopCalls.push(next);
    },
    stopTtsPlayback: () => {
      stopCalls.push("stop");
    },
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let useTtsPlaybackControllerModule:
  | typeof import("./use-tts-playback-controller").useTtsPlaybackController
  | null = null;

function getUseTtsPlaybackController() {
  if (!useTtsPlaybackControllerModule) {
    const modulePath = localRequire.resolve("./use-tts-playback-controller");
    delete localRequire.cache[modulePath];
    const imported =
      localRequire("./use-tts-playback-controller") as typeof import("./use-tts-playback-controller");
    useTtsPlaybackControllerModule = imported.useTtsPlaybackController;
  }
  return useTtsPlaybackControllerModule;
}

afterEach(() => {
  cleanup();
  playChunkCalls.length = 0;
  playSentenceCalls.length = 0;
  playSceneCalls.length = 0;
  loopCalls.length = 0;
  stopCalls.length = 0;
  errorCalls.length = 0;
  chunkShouldThrow = false;
  sentenceShouldThrow = false;
  playbackState = {
    kind: null,
    status: "idle",
    chunkKey: undefined,
    sentenceId: undefined,
    sceneSlug: undefined,
    mode: undefined,
    isLooping: false,
    text: undefined,
  };
  useTtsPlaybackControllerModule = null;
});

test("useTtsPlaybackController 会在再次点按同一 chunk 时直接停止", async () => {
  playbackState = {
    kind: "chunk",
    status: "playing",
    chunkKey: "call-it-a-day",
    sentenceId: undefined,
    sceneSlug: undefined,
    mode: "normal",
    isLooping: false,
    text: "call it a day",
  };

  const useTtsPlaybackController = getUseTtsPlaybackController();
  const { result } = renderHook(() => useTtsPlaybackController());

  await act(async () => {
    await result.current.toggleChunkPlayback({
      chunkText: "call it a day",
      chunkKey: "call-it-a-day",
    });
  });

  assert.equal(playChunkCalls.length, 0);
  assert.deepEqual(stopCalls, ["stop"]);
  assert.deepEqual(loopCalls, [false]);
});

test("useTtsPlaybackController 会在循环 chunk 停止后清理 loop 状态", async () => {
  const useTtsPlaybackController = getUseTtsPlaybackController();
  const { result } = renderHook(() => useTtsPlaybackController());

  const loopPromise = act(async () => {
    const playback = result.current.toggleRepeatingChunkLoop({
      chunkText: "loop this",
      chunkKey: "loop-this",
      intervalMs: 0,
      onError: (error) => {
        errorCalls.push(error instanceof Error ? error.message : String(error));
      },
    });

    await Promise.resolve();
    result.current.stop();
    await playback;
  });

  await loopPromise;

  assert.ok(playChunkCalls.length >= 1);
  assert.deepEqual(loopCalls.slice(0, 2), [true, false]);
});

test("useTtsPlaybackController 会把句子播放错误交给页面兜底处理", async () => {
  sentenceShouldThrow = true;

  const useTtsPlaybackController = getUseTtsPlaybackController();
  const { result } = renderHook(() => useTtsPlaybackController());

  await act(async () => {
    await result.current.toggleSentencePlayback({
      sceneSlug: "scene-1",
      sentenceId: "sentence-1",
      text: "I should call it a day.",
      onError: (error) => {
        errorCalls.push(error instanceof Error ? error.message : String(error));
      },
    });
  });

  assert.deepEqual(playSentenceCalls, [
    {
      sceneSlug: "scene-1",
      sentenceId: "sentence-1",
      text: "I should call it a day.",
      mode: "normal",
      speaker: undefined,
    },
  ]);
  assert.deepEqual(errorCalls, ["sentence failed"]);
});
