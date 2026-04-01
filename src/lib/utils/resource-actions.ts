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
const pendingActionHandles = new Map<
  string,
  {
    handle: number;
    usesIdleCallback: boolean;
  }
>();

const isClient = () => typeof window !== "undefined";

const isWeakNetwork = () => {
  if (!isClient()) return false;
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  };
  const connection = nav.connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
};

const getRequestIdleCallback = () =>
  (window as typeof window & { requestIdleCallback?: RequestIdleCallbackFn })
    .requestIdleCallback;

const getCancelIdleCallback = () =>
  (window as typeof window & { cancelIdleCallback?: CancelIdleCallbackFn })
    .cancelIdleCallback;

const normalizeWarmupChunkText = (text: string) => text.trim().toLowerCase();

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
    pendingActionHandles.delete(key);
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
    const handle = requestIdle(() => {
      run();
    }, { timeout: timeoutMs });
    pendingActionHandles.set(key, { handle, usesIdleCallback: true });
    return true;
  }

  const handle = window.setTimeout(run, fallbackDelayMs);
  pendingActionHandles.set(key, { handle, usesIdleCallback: false });
  return true;
};

export const cancelScheduledIdleAction = (key: string) => {
  if (!isClient()) return false;
  const pending = pendingActionHandles.get(key);
  if (!pending) return false;

  if (pending.usesIdleCallback) {
    const cancelIdle = getCancelIdleCallback();
    if (cancelIdle) {
      cancelIdle(pending.handle);
    }
  } else {
    window.clearTimeout(pending.handle);
  }

  pendingActionHandles.delete(key);
  pendingActionKeys.delete(key);
  return true;
};

export const buildChunkAudioWarmupKey = (chunkTexts: string[], limit: number) =>
  `chunk-audio:${chunkTexts
    .slice(0, limit)
    .map(normalizeWarmupChunkText)
    .filter(Boolean)
    .join("|")}`;

export const buildLessonAudioWarmupKey = (
  lesson: Pick<Lesson, "id" | "slug">,
  options?: { sentenceLimit?: number; chunkLimit?: number; includeSceneFull?: boolean },
) => {
  const sentenceLimit = options?.sentenceLimit ?? 2;
  const chunkLimit = options?.chunkLimit ?? 2;
  const includeSceneFull = options?.includeSceneFull === true;
  return `lesson-audio:${lesson.id}:${lesson.slug}:s=${sentenceLimit}:c=${chunkLimit}:full=${includeSceneFull ? 1 : 0}`;
};

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
  options?: { sentenceLimit?: number; chunkLimit?: number; key?: string; includeSceneFull?: boolean },
) => {
  const sentenceLimit = options?.sentenceLimit ?? 2;
  const chunkLimit = options?.chunkLimit ?? 2;
  const includeSceneFull = options?.includeSceneFull === true && !isWeakNetwork();
  const key =
    options?.key ??
    buildLessonAudioWarmupKey(lesson, {
      sentenceLimit,
      chunkLimit,
      includeSceneFull,
    });

  return scheduleIdleAction(key, () => {
    warmupLessonAudio(lesson, {
      sentenceLimit,
      chunkLimit,
      includeSceneFull,
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
