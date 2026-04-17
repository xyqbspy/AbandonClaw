import { Lesson } from "@/lib/types";

import {
  enqueueLessonIdleBlockWarmups,
  warmupChunkTextsAudio,
  warmupLessonAudio,
} from "@/lib/utils/audio-warmup";
import { getTtsPlaybackState } from "@/lib/utils/tts-api";

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
const sceneIdleWarmupHandles = new Map<
  string,
  {
    handle: number;
    usesIdleCallback: boolean;
  }
>();
let sceneIdleInteractionListenersAttached = false;
let lastSceneIdleInteractionAt = 0;

export const SCENE_IDLE_WARMUP_BATCH_SIZE = 2;
export const SCENE_IDLE_WARMUP_START_DELAY_MS = 1000;
export const SCENE_IDLE_WARMUP_RETRY_DELAY_MS = 1200;
export const SCENE_IDLE_WARMUP_INTERACTION_QUIET_WINDOW_MS = 700;
export const SCENE_IDLE_WARMUP_MAX_ROUNDS = 4;

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

const isPageHidden = () =>
  typeof document !== "undefined" && document.visibilityState === "hidden";

const ensureSceneIdleInteractionListeners = () => {
  if (!isClient() || sceneIdleInteractionListenersAttached) return;
  sceneIdleInteractionListenersAttached = true;
  const markInteraction = () => {
    lastSceneIdleInteractionAt = Date.now();
  };
  const listenerOptions = { passive: true } as AddEventListenerOptions;
  window.addEventListener("scroll", markInteraction, listenerOptions);
  window.addEventListener("wheel", markInteraction, listenerOptions);
  window.addEventListener("pointerdown", markInteraction, listenerOptions);
  window.addEventListener("touchstart", markInteraction, listenerOptions);
  window.addEventListener("keydown", markInteraction);
};

const hasRecentSceneIdleInteraction = (quietWindowMs: number) =>
  lastSceneIdleInteractionAt > 0 && Date.now() - lastSceneIdleInteractionAt < quietWindowMs;

const hasImmediatePlaybackDemand = () => getTtsPlaybackState().status === "loading";

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

export const buildSceneIdleAudioWarmupKey = (
  lesson: Pick<Lesson, "id" | "slug">,
  options?: { initialSentenceOffset?: number; batchSize?: number },
) => {
  const initialSentenceOffset = options?.initialSentenceOffset ?? SCENE_IDLE_WARMUP_BATCH_SIZE;
  const batchSize = options?.batchSize ?? SCENE_IDLE_WARMUP_BATCH_SIZE;
  return `scene-idle-audio:${lesson.id}:${lesson.slug}:from=${initialSentenceOffset}:b=${batchSize}`;
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

export const scheduleSceneIdleAudioWarmup = (
  lesson: Lesson,
  options?: {
    initialDelayMs?: number;
    initialSentenceOffset?: number;
    batchSize?: number;
    intervalMs?: number;
    interactionQuietWindowMs?: number;
    maxRounds?: number;
    key?: string;
  },
) => {
  if (!isClient() || isWeakNetwork()) return false;

  const initialSentenceOffset = Math.max(
    0,
    options?.initialSentenceOffset ?? SCENE_IDLE_WARMUP_BATCH_SIZE,
  );
  const batchSize = Math.max(1, options?.batchSize ?? SCENE_IDLE_WARMUP_BATCH_SIZE);
  const intervalMs = Math.max(300, options?.intervalMs ?? SCENE_IDLE_WARMUP_RETRY_DELAY_MS);
  const initialDelayMs = Math.max(0, options?.initialDelayMs ?? SCENE_IDLE_WARMUP_START_DELAY_MS);
  const interactionQuietWindowMs = Math.max(
    0,
    options?.interactionQuietWindowMs ?? SCENE_IDLE_WARMUP_INTERACTION_QUIET_WINDOW_MS,
  );
  const maxRounds = Math.max(1, options?.maxRounds ?? SCENE_IDLE_WARMUP_MAX_ROUNDS);
  const key =
    options?.key ??
    buildSceneIdleAudioWarmupKey(lesson, {
      initialSentenceOffset,
      batchSize,
    });

  if (!key.trim() || sceneIdleWarmupHandles.has(key)) return false;

  ensureSceneIdleInteractionListeners();

  let nextIndex = initialSentenceOffset;
  let completedRounds = 0;

  const finish = () => {
    sceneIdleWarmupHandles.delete(key);
  };

  const shouldPauseRound = () =>
    isPageHidden() ||
    isWeakNetwork() ||
    hasImmediatePlaybackDemand() ||
    hasRecentSceneIdleInteraction(interactionQuietWindowMs);

  const scheduleRound = (delayMs: number) => {
    const run = () => {
      if (!sceneIdleWarmupHandles.has(key)) return;

      if (shouldPauseRound()) {
        scheduleRound(intervalMs);
        return;
      }

      const result = enqueueLessonIdleBlockWarmups(lesson, {
        startIndex: nextIndex,
        batchSize,
      });
      nextIndex = result.nextIndex;
      if (result.enqueuedCount > 0) {
        completedRounds += 1;
      }

      if (result.done || completedRounds >= maxRounds) {
        finish();
        return;
      }

      scheduleRound(intervalMs);
    };

    const handle = window.setTimeout(() => {
      if (!sceneIdleWarmupHandles.has(key)) return;
      const requestIdle = getRequestIdleCallback();
      if (requestIdle) {
        const idleHandle = requestIdle(run, { timeout: 1000 });
        sceneIdleWarmupHandles.set(key, { handle: idleHandle, usesIdleCallback: true });
        return;
      }
      run();
    }, delayMs);
    sceneIdleWarmupHandles.set(key, { handle, usesIdleCallback: false });
  };

  const initialHandle = window.setTimeout(() => {
    if (!sceneIdleWarmupHandles.has(key)) return;
    sceneIdleWarmupHandles.delete(key);
    scheduleRound(0);
  }, initialDelayMs);
  sceneIdleWarmupHandles.set(key, { handle: initialHandle, usesIdleCallback: false });
  return key;
};

export const cancelSceneIdleAudioWarmup = (key: string | false | null | undefined) => {
  if (!isClient() || !key) return false;
  const pending = sceneIdleWarmupHandles.get(key);
  if (!pending) return false;

  if (pending.usesIdleCallback) {
    const cancelIdle = getCancelIdleCallback();
    if (cancelIdle) {
      cancelIdle(pending.handle);
    }
  } else {
    window.clearTimeout(pending.handle);
  }

  sceneIdleWarmupHandles.delete(key);
  return true;
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
