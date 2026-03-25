import { Lesson } from "@/lib/types";

import { warmupChunkTextsAudio, warmupLessonAudio } from "@/lib/utils/audio-warmup";

type IdleHandle = number;

type IdleDeadlineLike = {
  timeRemaining: () => number;
  didTimeout: boolean;
};

type RequestIdleCallbackFn = (
  callback: (deadline: IdleDeadlineLike) => void,
  opts?: { timeout?: number },
) => number;

type CancelIdleCallbackFn = (handle: number) => void;

const pendingActionKeys = new Set<string>();

const isClient = () => typeof window !== "undefined";

const getRequestIdleCallback = () =>
  (window as typeof window & { requestIdleCallback?: RequestIdleCallbackFn })
    .requestIdleCallback;

const getCancelIdleCallback = () =>
  (window as typeof window & { cancelIdleCallback?: CancelIdleCallbackFn })
    .cancelIdleCallback;

export const scheduleIdleAction = (
  key: string,
  action: () => void,
  options?: { timeoutMs?: number; fallbackDelayMs?: number },
) => {
  if (!isClient()) return false;
  if (!key.trim() || pendingActionKeys.has(key)) return false;

  pendingActionKeys.add(key);
  const timeoutMs = options?.timeoutMs ?? 1200;
  const fallbackDelayMs = options?.fallbackDelayMs ?? 120;

  const finish = () => {
    pendingActionKeys.delete(key);
  };

  const run = () => {
    try {
      action();
    } finally {
      finish();
    }
  };

  const requestIdle = getRequestIdleCallback();
  if (requestIdle) {
    requestIdle(() => {
      run();
    }, { timeout: timeoutMs });
    return true;
  }

  window.setTimeout(run, fallbackDelayMs);
  return true;
};

const buildChunkAudioWarmupKey = (chunkTexts: string[], limit: number) =>
  `chunk-audio:${chunkTexts
    .slice(0, limit)
    .map((text) => text.trim().toLowerCase())
    .filter(Boolean)
    .join("|")}`;

export const scheduleChunkAudioWarmup = (chunkTexts: string[], options?: { limit?: number }) => {
  const limit = options?.limit ?? 2;
  const key = buildChunkAudioWarmupKey(chunkTexts, limit);
  if (key === "chunk-audio:") return false;
  return scheduleIdleAction(key, () => {
    warmupChunkTextsAudio(chunkTexts, limit);
  });
};

export const scheduleLessonAudioWarmup = (
  lesson: Lesson,
  options?: { sentenceLimit?: number; chunkLimit?: number; key?: string },
) => {
  const sentenceLimit = options?.sentenceLimit ?? 2;
  const chunkLimit = options?.chunkLimit ?? 2;
  const key =
    options?.key ??
    `lesson-audio:${lesson.id}:${lesson.slug}:s=${sentenceLimit}:c=${chunkLimit}`;

  return scheduleIdleAction(key, () => {
    warmupLessonAudio(lesson, {
      sentenceLimit,
      chunkLimit,
    });
  });
};

export const cancelIdleAction = (_handle: IdleHandle | null) => {
  if (!isClient() || _handle === null) return;
  const cancelIdle = getCancelIdleCallback();
  if (cancelIdle) {
    cancelIdle(_handle);
    return;
  }
  window.clearTimeout(_handle);
};
