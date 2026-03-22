import { useCallback, useEffect, useRef } from "react";

import { Lesson } from "@/lib/types";
import {
  pauseSceneLearningFromApi,
  startSceneLearningFromApi,
  updateSceneLearningProgressFromApi,
} from "@/lib/utils/learning-api";

import {
  buildSceneLearningUpdatePayload,
  shouldFlushSceneLearningDelta,
} from "./scene-detail-learning-logic";
import { SceneViewMode } from "./scene-detail-page-logic";

type TimeoutHandle = ReturnType<typeof window.setTimeout>;
type IntervalHandle = ReturnType<typeof window.setInterval>;

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
};

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
};

export const useSceneLearningSync = ({
  baseLesson,
  viewMode,
  activeVariantId,
  deps = defaultDeps,
}: {
  baseLesson: Lesson | null;
  viewMode: SceneViewMode;
  activeVariantId?: string | null;
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

      return deps
        .updateSceneLearningProgressFromApi(baseLesson.slug, {
          progressPercent: payload.progressPercent,
          lastVariantIndex: payload.lastVariantIndex,
          studySecondsDelta,
        })
        .then(() => {
          if (payload.withPause) {
            return deps.pauseSceneLearningFromApi(baseLesson.slug);
          }
          return undefined;
        })
        .catch(() => {
          // Non-blocking.
        });
    },
    [baseLesson, computeElapsedSecondsSinceLastSync, deps],
  );

  useEffect(() => {
    if (!baseLesson || learningStartedRef.current) return;
    learningStartedRef.current = true;
    lastProgressSyncMsRef.current = deps.now();
    void deps.startSceneLearningFromApi(baseLesson.slug).catch(() => {
      // Non-blocking: scene reading should still work if progress API fails temporarily.
    });
  }, [baseLesson, deps]);

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
