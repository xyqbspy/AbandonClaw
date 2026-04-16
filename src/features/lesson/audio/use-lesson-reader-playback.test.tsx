import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { toast } from "sonner";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const eventCalls: Array<{ name: string; payload: Record<string, unknown> }> = [];
const failureCalls: Array<{ name: string; payload: Record<string, unknown> }> = [];
const sentenceCalls: Array<{ sentenceId: string; text: string }> = [];
const sceneLoopCalls: Array<{ sceneSlug: string }> = [];
const sentencePlaybackWarmupCalls: Array<{ lessonSlug: string; sentenceId: string }> = [];
const toastErrorCalls: Array<{
  message?: string;
  actionLabel?: string;
  onAction?: (() => void) | null;
}> = [];

let shouldSceneLoopFail = false;

const mockedModules = {
  "@/hooks/use-tts-playback-controller": {
    useTtsPlaybackController: () => ({
      playbackState: { kind: null, status: "idle" },
      speakingText: null,
      loadingText: null,
      stop: () => undefined,
      isSceneLooping: () => false,
      isSceneLoopLoading: () => false,
      isSentenceActive: () => false,
      isSentenceLoading: () => false,
      isChunkLoading: () => false,
      toggleSentencePlayback: async ({ sentenceId, text }: { sentenceId: string; text: string }) => {
        sentenceCalls.push({ sentenceId, text });
      },
      toggleChunkPlayback: async () => undefined,
      toggleRepeatingChunkLoop: async () => undefined,
      toggleSceneLoopPlayback: async ({
        sceneSlug,
        onError,
      }: {
        sceneSlug: string;
        onError?: (error: unknown) => void;
      }) => {
        sceneLoopCalls.push({ sceneSlug });
        if (shouldSceneLoopFail) {
          onError?.(new Error("完整场景音频暂不可用"));
        }
      },
    }),
  },
  "@/lib/shared/tts": {
    buildChunkAudioKey: (text: string) => text,
  },
  "@/lib/utils/audio-warmup": {
    getSentenceSpeakText: (sentence: { text: string }) => sentence.text,
  },
  "@/lib/utils/resource-actions": {
    scheduleLessonAudioWarmup: () => undefined,
  },
  "@/lib/utils/client-events": {
    recordClientEvent: (name: string, payload: Record<string, unknown>) => {
      eventCalls.push({ name, payload });
    },
    recordClientFailureSummary: (name: string, payload: Record<string, unknown>) => {
      failureCalls.push({ name, payload });
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

const originalToastError = toast.error;

let useLessonReaderPlaybackModule:
  | typeof import("./use-lesson-reader-playback").useLessonReaderPlayback
  | null = null;

function getUseLessonReaderPlayback() {
  if (!useLessonReaderPlaybackModule) {
    const modulePath = localRequire.resolve("./use-lesson-reader-playback");
    delete localRequire.cache[modulePath];
    const imported =
      localRequire("./use-lesson-reader-playback") as typeof import("./use-lesson-reader-playback");
    useLessonReaderPlaybackModule = imported.useLessonReaderPlayback;
  }
  return useLessonReaderPlaybackModule;
}

afterEach(() => {
  cleanup();
  shouldSceneLoopFail = false;
  eventCalls.length = 0;
  failureCalls.length = 0;
  sentenceCalls.length = 0;
  sceneLoopCalls.length = 0;
  sentencePlaybackWarmupCalls.length = 0;
  toastErrorCalls.length = 0;
  toast.error = originalToastError;
  useLessonReaderPlaybackModule = null;
});

test("useLessonReaderPlayback 在 scene full 失败时会提供逐句跟读 CTA", async () => {
  shouldSceneLoopFail = true;
  toast.error = ((message?: string, options?: { action?: { label: React.ReactNode; onClick: () => void } }) => {
    toastErrorCalls.push({
      message: String(message),
      actionLabel: typeof options?.action?.label === "string" ? options.action.label : undefined,
      onAction: options?.action ? () => options.action?.onClick() : null,
    });
    return "";
  }) as typeof toast.error;

  const useLessonReaderPlayback = getUseLessonReaderPlayback();
  const { result } = renderHook(() =>
    useLessonReaderPlayback({
      lesson: {
        id: "lesson-1",
        slug: "coffee-chat",
        title: "Coffee Chat",
        subtitle: "At the cafe",
        difficulty: "Intermediate",
        estimatedMinutes: 3,
        completionRate: 0,
        tags: [],
        sceneType: "dialogue",
        sourceType: "builtin",
        sections: [],
        explanations: [],
      },
      blockOrder: [
        {
          id: "block-1",
          speaker: "A",
          sentences: [
            { id: "sentence-1", text: "Let's call it a day.", translation: null, chunks: [] },
          ],
        },
      ] as never,
      sentenceOrder: [
        { id: "sentence-1", text: "Let's call it a day.", translation: null, chunks: [] },
      ] as never,
      firstSentence: { id: "sentence-1", text: "Let's call it a day.", translation: null, chunks: [] } as never,
      activeSentenceId: "sentence-1",
    }),
  );

  await act(async () => {
    result.current.toggleSceneLoopPlayback();
  });

  assert.equal(failureCalls.at(-1)?.name, "tts_scene_loop_failed");
  assert.equal(toastErrorCalls.at(-1)?.actionLabel, "改为逐句跟读");

  toastErrorCalls.at(-1)?.onAction?.();

  assert.deepEqual(sentenceCalls, [
    {
      sentenceId: "sentence-1",
      text: "Let's call it a day.",
    },
  ]);
  assert.equal(eventCalls.at(-1)?.name, "tts_scene_loop_fallback_clicked");
});

test("useLessonReaderPlayback 播放句子时会触发可选预热提权回调", async () => {
  const useLessonReaderPlayback = getUseLessonReaderPlayback();
  const lesson = {
    id: "lesson-1",
    slug: "coffee-chat",
    title: "Coffee Chat",
    difficulty: "Intermediate",
    estimatedMinutes: 3,
    completionRate: 0,
    tags: [],
    sceneType: "dialogue",
    sections: [],
    explanations: [],
  } as never;
  const sentence = {
    id: "sentence-1",
    text: "Let's call it a day.",
    translation: null,
    chunks: [],
  } as never;
  const { result } = renderHook(() =>
    useLessonReaderPlayback({
      lesson,
      blockOrder: [],
      sentenceOrder: [sentence],
      firstSentence: sentence,
      activeSentenceId: "sentence-1",
      onSentencePlayback: ({ lesson, sentence }) => {
        sentencePlaybackWarmupCalls.push({
          lessonSlug: lesson.slug,
          sentenceId: sentence.id,
        });
      },
    }),
  );

  await act(async () => {
    result.current.handlePronounce("Let's call it a day.");
  });

  assert.deepEqual(sentencePlaybackWarmupCalls, [
    {
      lessonSlug: "coffee-chat",
      sentenceId: "sentence-1",
    },
  ]);
  assert.deepEqual(sentenceCalls.at(-1), {
    sentenceId: "sentence-1",
    text: "Let's call it a day.",
  });
});
