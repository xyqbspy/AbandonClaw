import { useCallback, useEffect, useRef } from "react";

import { Lesson } from "@/lib/types";
import {
  pauseSceneLearningFromApi,
  SceneLearningProgressResponse,
  startSceneLearningFromApi,
  updateSceneLearningProgressFromApi,
} from "@/lib/utils/learning-api";

import {
  buildSceneLearningUpdatePayload,
  shouldFlushSceneLearningDelta,
} from "./scene-detail-learning-logic";
import { SceneViewMode } from "./scene-detail-page-logic";

type TimeoutHandle = number | ReturnType<typeof globalThis.setTimeout>;
type IntervalHandle = number | ReturnType<typeof globalThis.setInterval>;

type UseSceneLearningSyncDeps = {
  startSceneLearningFromApi: typeof startSceneLearningFromApi;
  pauseSceneLearningFromApi: typeof pauseSceneLearningFromApi;
  updateSceneLearningProgressFromApi: typeof updateSceneLearningProgressFromApi;
  shouldFlushSceneLearningDelta: typeof shouldFlushSceneLearningDelta;
  buildSceneLearningUpdatePayload: typeof buildSceneLearningUpdatePayload;
  now: () => number;
  setTimeoutFn: (callback: () => void, delay: number) => TimeoutHandle;
  clearTimeoutFn: (handle: TimeoutHandle) => void;
  setIntervalFn: (callback: () => void, delay: number) => IntervalHandle;
  clearIntervalFn: (handle: IntervalHandle) => void;
  startCooldownMs: number;
  progressFlushCooldownMs: number;
};

const sceneLearningStartHistory = new Map<string, number>();
const sceneLearningProgressFlushHistory = new Map<string, number>();

const defaultDeps: UseSceneLearningSyncDeps = {
  startSceneLearningFromApi,
  pauseSceneLearningFromApi,
  updateSceneLearningProgressFromApi,
  shouldFlushSceneLearningDelta,
  buildSceneLearningUpdatePayload,
  now: () => Date.now(),
  setTimeoutFn: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeoutFn: (handle) => window.clearTimeout(handle),
  setIntervalFn: (callback, delay) => window.setInterval(callback, delay),
  clearIntervalFn: (handle) => window.clearInterval(handle),
  startCooldownMs: 30_000,
  progressFlushCooldownMs: 30_000,
};

export const resetSceneLearningStartThrottleForTests = () => {
  sceneLearningStartHistory.clear();
  sceneLearningProgressFlushHistory.clear();
};

export const useSceneLearningSync = ({
  baseLesson,
  viewMode,
  activeVariantId,
  initialLearningState,
  hasFreshInitialLearningState = false,
  onLearningStateChange,
  deps = defaultDeps,
}: {
  baseLesson: Lesson | null;
  viewMode: SceneViewMode;
  activeVariantId?: string | null;
  initialLearningState?: SceneLearningProgressResponse | null;
  hasFreshInitialLearningState?: boolean;
  onLearningStateChange?: (state: SceneLearningProgressResponse) => void;
  deps?: UseSceneLearningSyncDeps;
}) => {
  const learningStartedRef = useRef(false);
  const lastProgressSyncMsRef = useRef<number>(deps.now());
  const learningPingTimerRef = useRef<IntervalHandle | null>(null);
  const currentViewModeRef = useRef<SceneViewMode>(viewMode);

  const computeElapsedSecondsSinceLastSync = useCallback(() => {
    const now = deps.now();
    const elapsed = Math.max(
      0,
      Math.floor((now - lastProgressSyncMsRef.current) / 1000),
    );
    lastProgressSyncMsRef.current = now;
    return elapsed;
  }, [deps]);

  const flushLearningDelta = useCallback(
    (payload: {
      progressPercent: number;
      lastVariantIndex?: number;
      withPause?: boolean;
    }) => {
      const now = deps.now();
      const studySecondsDelta = computeElapsedSecondsSinceLastSync();
      if (
        !deps.shouldFlushSceneLearningDelta({
          hasBaseLesson: Boolean(baseLesson),
          learningStarted: learningStartedRef.current,
          studySecondsDelta,
          withPause: Boolean(payload.withPause),
        })
      ) {
        return Promise.resolve();
      }

      if (!baseLesson) return Promise.resolve();

      const recentFlushAt = sceneLearningProgressFlushHistory.get(baseLesson.slug) ?? 0;
      const withinCooldown =
        recentFlushAt > 0 && now - recentFlushAt < deps.progressFlushCooldownMs;

      if (!payload.withPause && withinCooldown) {
        return Promise.resolve();
      }

      if (payload.withPause && studySecondsDelta <= 0 && withinCooldown) {
        return deps.pauseSceneLearningFromApi(baseLesson.slug).then((pauseResult) => {
          if (pauseResult && onLearningStateChange) {
            onLearningStateChange(pauseResult);
          }
          return pauseResult;
        });
      }

      sceneLearningProgressFlushHistory.set(baseLesson.slug, now);

      return deps
        .updateSceneLearningProgressFromApi(baseLesson.slug, {
          progressPercent: payload.progressPercent,
          lastVariantIndex: payload.lastVariantIndex,
          studySecondsDelta,
        })
        .then((result) => {
          if (result && onLearningStateChange) {
            onLearningStateChange(result);
          }
          if (payload.withPause) {
            return deps.pauseSceneLearningFromApi(baseLesson.slug).then((pauseResult) => {
              if (pauseResult && onLearningStateChange) {
                onLearningStateChange(pauseResult);
              }
              return pauseResult;
            });
          }
          return undefined;
        })
        .catch(() => {
          // Non-blocking.
        });
    },
    [baseLesson, computeElapsedSecondsSinceLastSync, deps, onLearningStateChange],
  );

  useEffect(() => {
    if (!baseLesson || learningStartedRef.current) return;
    if (hasFreshInitialLearningState && initialLearningState) {
      learningStartedRef.current = true;
      lastProgressSyncMsRef.current = deps.now();
      sceneLearningStartHistory.set(baseLesson.slug, deps.now());
      return;
    }
    const now = deps.now();
    const recentStartAt = sceneLearningStartHistory.get(baseLesson.slug) ?? 0;
    if (recentStartAt > 0 && now - recentStartAt < deps.startCooldownMs) {
      learningStartedRef.current = true;
      lastProgressSyncMsRef.current = now;
      return;
    }
    learningStartedRef.current = true;
    lastProgressSyncMsRef.current = now;
    sceneLearningStartHistory.set(baseLesson.slug, now);
    void deps.startSceneLearningFromApi(baseLesson.slug)
      .then((result) => {
        if (result && onLearningStateChange) {
          onLearningStateChange(result);
        }
      })
      .catch(() => {
        // Non-blocking: scene reading should still work if progress API fails temporarily.
      });
  }, [baseLesson, deps, hasFreshInitialLearningState, initialLearningState, onLearningStateChange]);

  useEffect(() => {
    currentViewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    if (!baseLesson) return;
    const timer = deps.setTimeoutFn(() => {
      void flushLearningDelta(
        deps.buildSceneLearningUpdatePayload({
          viewMode,
          activeVariantId,
        }),
      );
    }, 1200);
    return () => {
      deps.clearTimeoutFn(timer);
    };
  }, [activeVariantId, baseLesson, deps, flushLearningDelta, viewMode]);

  useEffect(() => {
    if (!baseLesson) return;
    if (learningPingTimerRef.current) {
      deps.clearIntervalFn(learningPingTimerRef.current);
    }
    learningPingTimerRef.current = deps.setIntervalFn(() => {
      void flushLearningDelta(
        deps.buildSceneLearningUpdatePayload({
          viewMode,
        }),
      );
    }, 60000);

    return () => {
      if (learningPingTimerRef.current) {
        deps.clearIntervalFn(learningPingTimerRef.current);
        learningPingTimerRef.current = null;
      }
    };
  }, [baseLesson, deps, flushLearningDelta, viewMode]);

  useEffect(() => {
    if (!baseLesson) {
      learningStartedRef.current = false;
      return;
    }
    return () => {
      void flushLearningDelta(
        deps.buildSceneLearningUpdatePayload({
          viewMode: currentViewModeRef.current,
          withPause: true,
        }),
      );
      learningStartedRef.current = false;
    };
  }, [baseLesson, deps, flushLearningDelta]);
};
