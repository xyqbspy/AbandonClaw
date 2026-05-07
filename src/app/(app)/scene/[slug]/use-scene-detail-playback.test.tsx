import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
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
const chunkLayerCalls: string[] = [];
const promoteWarmupCalls: Array<{
  lessonSlug: string;
  currentSentenceId: string;
  includeSceneFull?: boolean;
}> = [];

let playbackState = {
  text: null as string | null,
  kind: null as "chunk" | "sentence" | null,
  chunkKey: null as string | null,
  sentenceId: null as string | null,
  mode: null as "normal" | null,
};
let currentLessonSentences: LessonSentence[] = [sentence];

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
    getChunkLayerFromLesson: (_lesson: Lesson, _sentence: LessonSentence, chunkText: string) => {
      chunkLayerCalls.push(chunkText);
      return {
        ...detail,
        text: chunkText,
      };
    },
  },
  "@/lib/shared/lesson-content": {
    getLessonSentences: () => currentLessonSentences,
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
  "@/lib/utils/audio-warmup": {
    getBlockSpeakText: (block: { tts?: string; sentences: LessonSentence[] }) =>
      block.tts?.trim() ||
      block.sentences
        .map((item) => item.tts?.trim() || item.audioText?.trim() || item.text)
        .filter(Boolean)
        .join(" "),
    getSentenceSpeakText: (sentence: LessonSentence) => sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text,
    promoteLessonPlaybackAudioWarmups: (
      lesson: Lesson,
      currentSentenceId: string,
      options?: { includeSceneFull?: boolean },
    ) => {
      promoteWarmupCalls.push({
        lessonSlug: lesson.slug,
        currentSentenceId,
        includeSceneFull: options?.includeSceneFull,
      });
    },
  },
  "@/lib/utils/resource-actions": {
    SCENE_IDLE_WARMUP_BATCH_SIZE: 2,
    cancelSceneIdleAudioWarmup: () => false,
    scheduleChunkAudioWarmup: () => false,
    scheduleLessonAudioWarmup: () => false,
    scheduleSceneIdleAudioWarmup: () => false,
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
  chunkLayerCalls.length = 0;
  promoteWarmupCalls.length = 0;
  currentLessonSentences = [sentence];
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

test("useSceneDetailPlayback 会在再次点按当前 chunk 时停止播放", async () => {
  const useSceneDetailPlayback = getUseSceneDetailPlayback();

  const { result, rerender } = renderHook(() =>
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

  await waitFor(() => {
    assert.equal(result.current.variantChunkDetail?.text, "call it a day");
  });

  playbackState = {
    text: "call it a day",
    kind: "chunk",
    chunkKey: "call-it-a-day",
    sentenceId: null,
    mode: "normal",
  };
  rerender();

  await act(async () => {
    result.current.handlePronounce("call it a day");
  });

  assert.equal(playChunkCalls.length, 0);
  assert.ok(stopCalls.length >= 1);
});

test("useSceneDetailPlayback 会在有本轮相关短语时默认选中第一个 chunk", async () => {
  const useSceneDetailPlayback = getUseSceneDetailPlayback();
  const variantSetWithMultipleChunks: VariantSet = {
    ...variantSet,
    reusedChunks: ["burn out", "call it a day"],
  };

  const { result } = renderHook(() =>
    useSceneDetailPlayback({
      sceneSlug: "scene-1",
      viewMode: "variants",
      baseLesson: lesson,
      activeVariantLesson: null,
      latestVariantSet: variantSetWithMultipleChunks,
    }),
  );

  act(() => {
    result.current.handleOpenVariantChunk("call it a day");
  });

  await waitFor(() => {
    assert.equal(result.current.variantChunkDetail?.text, "burn out");
    assert.deepEqual(result.current.variantChunkRelatedChunks, ["burn out", "call it a day"]);
  });

  assert.deepEqual(chunkLayerCalls, ["burn out"]);
});

test("useSceneDetailPlayback 会在连续播放句子时触发播放驱动提权", () => {
  const useSceneDetailPlayback = getUseSceneDetailPlayback();
  const nextSentence: LessonSentence = {
    ...sentence,
    id: "sentence-2",
    text: "Let's keep going.",
  };
  currentLessonSentences = [sentence, nextSentence];

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
    result.current.handleSentencePlaybackWarmup({
      lesson,
      sentence,
    });
    result.current.handleSentencePlaybackWarmup({
      lesson,
      sentence: nextSentence,
    });
  });

  assert.deepEqual(promoteWarmupCalls, [
    {
      lessonSlug: "scene-1",
      currentSentenceId: "sentence-1",
      includeSceneFull: false,
    },
    {
      lessonSlug: "scene-1",
      currentSentenceId: "sentence-2",
      includeSceneFull: true,
    },
  ]);
});
