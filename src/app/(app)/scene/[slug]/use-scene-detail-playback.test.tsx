import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import type { Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import type { VariantSet } from "@/lib/types/learning-flow";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const sentence: LessonSentence = {
  id: "sentence-1",
  speaker: "A",
  text: "I should call it a day.",
  translation: "我该收工了。",
  tts: "I should call it a day.",
  chunks: ["call it a day"],
  chunkDetails: [],
};

const detail: SelectionChunkLayer = {
  text: "call it a day",
  translation: "收工",
  grammarLabel: "Chunk",
  meaningInSentence: "这里表示今天到此为止",
  usageNote: "日常表达",
  examples: [],
};

const lesson: Lesson = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sections: [],
  explanations: [],
};

const variantSet: VariantSet = {
  id: "variant-set-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Scene 1",
  reusedChunks: ["call it a day"],
  variants: [
    {
      id: "variant-1",
      lesson: {
        ...lesson,
        id: "variant-lesson-1",
        slug: "scene-1-v1",
        title: "Variant 1",
        sourceType: "variant",
      },
      status: "unviewed",
    },
  ],
  status: "generated",
  createdAt: "2026-03-22T00:00:00.000Z",
};

const playChunkCalls: Array<{ chunkText: string; chunkKey: string }> = [];
const playSentenceCalls: Array<{ sceneSlug: string; sentenceId: string; text: string }> = [];
const stopCalls: string[] = [];
const loopCalls: boolean[] = [];
const prefetchSentenceCalls: Array<{ sceneSlug: string; sentenceId: string; text: string }> = [];
const prefetchChunkCalls: Array<{ chunkText: string; chunkKey: string }> = [];

let playbackState = {
  text: null as string | null,
  kind: null as "chunk" | "sentence" | null,
  chunkKey: null as string | null,
  sentenceId: null as string | null,
  mode: null as "normal" | null,
};

const mockedModules = {
  "sonner": {
    toast: {
      error: () => undefined,
    },
  },
  "@/hooks/use-tts-playback-state": {
    useTtsPlaybackState: () => playbackState,
  },
  "@/lib/data/mock-lessons": {
    getChunkLayerFromLesson: () => detail,
  },
  "@/lib/shared/lesson-content": {
    getLessonSentences: () => [sentence],
  },
  "@/lib/shared/tts": {
    buildChunkAudioKey: (text: string) => text.trim().toLowerCase().replace(/\s+/g, "-"),
  },
  "@/lib/utils/tts-api": {
    playChunkAudio: async ({ chunkText, chunkKey }: { chunkText: string; chunkKey: string }) => {
      playChunkCalls.push({ chunkText, chunkKey });
    },
    playSentenceAudio: async (payload: { sceneSlug: string; sentenceId: string; text: string }) => {
      playSentenceCalls.push(payload);
    },
    prefetchChunkAudio: async (payload: { chunkText: string; chunkKey: string }) => {
      prefetchChunkCalls.push(payload);
    },
    prefetchSentenceAudio: async (payload: { sceneSlug: string; sentenceId: string; text: string }) => {
      prefetchSentenceCalls.push(payload);
    },
    setTtsLooping: (next: boolean) => {
      loopCalls.push(next);
    },
    stopTtsPlayback: () => {
      stopCalls.push("stop");
    },
  },
  "./scene-detail-logic": {
    findChunkContext: () => ({
      lesson,
      sentence,
    }),
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let useSceneDetailPlaybackModule:
  | typeof import("./use-scene-detail-playback").useSceneDetailPlayback
  | null = null;

function getUseSceneDetailPlayback() {
  if (!useSceneDetailPlaybackModule) {
    const modulePath = localRequire.resolve("./use-scene-detail-playback");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./use-scene-detail-playback") as typeof import("./use-scene-detail-playback");
    useSceneDetailPlaybackModule = imported.useSceneDetailPlayback;
  }
  return useSceneDetailPlaybackModule;
}

afterEach(() => {
  cleanup();
  playChunkCalls.length = 0;
  playSentenceCalls.length = 0;
  stopCalls.length = 0;
  loopCalls.length = 0;
  prefetchSentenceCalls.length = 0;
  prefetchChunkCalls.length = 0;
  playbackState = {
    text: null,
    kind: null,
    chunkKey: null,
    sentenceId: null,
    mode: null,
  };
  useSceneDetailPlaybackModule = null;
});

test("useSceneDetailPlayback 会打开 chunk detail 并支持重置", async () => {
  const useSceneDetailPlayback = getUseSceneDetailPlayback();

  const { result } = renderHook(() =>
    useSceneDetailPlayback({
      sceneSlug: "scene-1",
      viewMode: "variants",
      baseLesson: lesson,
      activeVariantLesson: null,
      latestVariantSet: variantSet,
    }),
  );

  act(() => {
    result.current.handleOpenVariantChunk("call it a day");
  });

  await waitFor(() => {
    assert.equal(result.current.variantChunkModalOpen, true);
    assert.equal(result.current.variantChunkDetail?.text, "call it a day");
    assert.equal(result.current.variantChunkSentence?.id, "sentence-1");
    assert.deepEqual(result.current.variantChunkRelatedChunks, ["call it a day"]);
  });

  act(() => {
    result.current.resetChunkDetailState();
  });

  assert.equal(result.current.variantChunkModalOpen, false);
  assert.equal(result.current.variantChunkDetail, null);
  assert.equal(result.current.variantChunkSentence, null);
  assert.deepEqual(result.current.variantChunkRelatedChunks, []);
});

test("useSceneDetailPlayback 会按当前上下文播放 chunk 和 sentence", async () => {
  const useSceneDetailPlayback = getUseSceneDetailPlayback();

  const { result } = renderHook(() =>
    useSceneDetailPlayback({
      sceneSlug: "scene-1",
      viewMode: "scene",
      baseLesson: lesson,
      activeVariantLesson: null,
      latestVariantSet: variantSet,
    }),
  );

  act(() => {
    result.current.handleOpenVariantChunk("call it a day");
  });

  await act(async () => {
    result.current.handlePronounce("call it a day");
  });

  assert.deepEqual(playChunkCalls.at(-1), {
    chunkText: "call it a day",
    chunkKey: "call-it-a-day",
  });

  await act(async () => {
    result.current.handlePronounce("I should call it a day.");
  });

  assert.deepEqual(playSentenceCalls.at(-1), {
    sceneSlug: "scene-1",
    sentenceId: "sentence-1",
    text: "I should call it a day.",
    mode: "normal",
    speaker: "A",
  });

  await act(async () => {
    result.current.handleLoopSentence("loop this");
  });

  assert.deepEqual(playChunkCalls.at(-1), {
    chunkText: "loop this",
    chunkKey: "loop-this",
  });
  assert.deepEqual(loopCalls.slice(-2), [true, false]);
  assert.ok(stopCalls.length >= 2);
});
