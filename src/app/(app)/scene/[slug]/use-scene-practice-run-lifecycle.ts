"use client";

import { Dispatch, SetStateAction, useCallback } from "react";
import { Lesson } from "@/lib/types";
import {
  PracticeAssessmentLevel,
  PracticeMode,
  PracticeSet,
} from "@/lib/types/learning-flow";
import {
  completeScenePracticeRunFromApi,
  markScenePracticeModeCompleteFromApi,
  recordScenePracticeAttemptFromApi,
  saveScenePracticeSetFromApi,
  SceneLearningProgressResponse,
  ScenePracticeSnapshotResponse,
  startScenePracticeRunFromApi,
} from "@/lib/utils/learning-api";
import { setScenePracticeSnapshotCache } from "@/lib/cache/scene-runtime-cache";
import { notifySceneMilestone } from "./scene-detail-notify";

const PRACTICE_RUN_START_DEDUP_MS = 30_000;

const practiceRunStartDedup = new Map<
  string,
  {
    completedAt: number | null;
    promise: Promise<unknown> | null;
  }
>();

export const resetScenePracticeRunStartDedupForTests = () => {
  practiceRunStartDedup.clear();
};

export type PracticeRunStartPayload = {
  practiceSetId: string;
  mode: PracticeMode;
  sourceType: "original" | "variant";
  sourceVariantId?: string | null;
};

export type PracticeAttemptPayload = PracticeRunStartPayload & {
  exerciseId: string;
  sentenceId?: string | null;
  userAnswer: string;
  assessmentLevel: PracticeAssessmentLevel;
  isCorrect: boolean;
  metadata?: Record<string, unknown>;
};

export type PracticeModeCompletePayload = {
  practiceSetId: string;
  mode: PracticeMode;
  nextMode?: PracticeMode;
};

export function useScenePracticeRunLifecycle({
  baseLesson,
  latestPracticeSet,
  practicedSentenceCount,
  scenePracticeCompleted,
  setPracticeSnapshot,
  handleLearningStateChange,
  handleMarkPracticeComplete,
}: {
  baseLesson: Lesson | null;
  latestPracticeSet: PracticeSet | null;
  practicedSentenceCount: number;
  scenePracticeCompleted: boolean;
  setPracticeSnapshot: Dispatch<SetStateAction<ScenePracticeSnapshotResponse | null>>;
  handleLearningStateChange: (nextState: SceneLearningProgressResponse) => void;
  handleMarkPracticeComplete: () => void;
}) {
  const handlePracticeRunStart = useCallback(
    (payload: PracticeRunStartPayload) => {
      if (!baseLesson) return;
      const runKey = [
        baseLesson.slug,
        payload.practiceSetId,
        payload.mode,
        payload.sourceType,
        payload.sourceVariantId ?? "",
      ].join(":");
      const currentDedup = practiceRunStartDedup.get(runKey);
      const now = Date.now();
      if (currentDedup?.promise) return;
      if (
        currentDedup?.completedAt &&
        now - currentDedup.completedAt < PRACTICE_RUN_START_DEDUP_MS
      ) {
        return;
      }

      const matchingPracticeSet =
        latestPracticeSet?.id === payload.practiceSetId ? latestPracticeSet : null;
      const runPromise = (matchingPracticeSet
        ? saveScenePracticeSetFromApi(baseLesson.slug, {
            practiceSet: matchingPracticeSet,
            replaceExisting: false,
          }).then(() => undefined)
        : Promise.resolve()
      )
        .then(() => startScenePracticeRunFromApi(baseLesson.slug, payload))
        .then((result) => {
          if (
            practicedSentenceCount < 1 &&
            (result.learningState?.session?.practicedSentenceCount ?? 0) >= 1
          ) {
            notifySceneMilestone("practice_sentence", baseLesson.title);
          }
          if (result.learningState) {
            handleLearningStateChange(result.learningState);
          }
          setPracticeSnapshot((current) => {
            const next = {
              run: result.run,
              latestAttempt: current?.latestAttempt ?? null,
              summary: current?.summary ?? {
                completedModeCount: result.run.completedModes.length,
                totalAttemptCount: 0,
                correctAttemptCount: 0,
                latestAssessmentLevel: null,
              },
            };
            void setScenePracticeSnapshotCache(baseLesson.slug, payload.practiceSetId, next).catch(() => {
              // Ignore cache failures.
            });
            return next;
          });
        })
        .then(() => {
          practiceRunStartDedup.set(runKey, {
            completedAt: Date.now(),
            promise: null,
          });
        })
        .catch(() => {
          practiceRunStartDedup.delete(runKey);
          // Non-blocking.
        });

      practiceRunStartDedup.set(runKey, {
        completedAt: null,
        promise: runPromise,
      });
    },
    [
      baseLesson,
      handleLearningStateChange,
      latestPracticeSet,
      practicedSentenceCount,
      setPracticeSnapshot,
    ],
  );

  const handlePracticeComplete = useCallback(() => {
    if (!baseLesson) return;
    const shouldNotifyMilestone = !scenePracticeCompleted;
    if (!latestPracticeSet) {
      if (shouldNotifyMilestone) {
        notifySceneMilestone("scene_practice", baseLesson.title);
      }
      handleMarkPracticeComplete();
      return;
    }
    void completeScenePracticeRunFromApi(baseLesson.slug, {
      practiceSetId: latestPracticeSet.id,
    })
      .then((result) => {
        setPracticeSnapshot((current) => {
          const next =
            current
              ? {
                  ...current,
                  run: result.run,
                }
              : {
                  run: result.run,
                  latestAttempt: null,
                  summary: {
                    completedModeCount: result.run.completedModes.length,
                    totalAttemptCount: 0,
                    correctAttemptCount: 0,
                    latestAssessmentLevel: null,
                  },
                };
          void setScenePracticeSnapshotCache(baseLesson.slug, latestPracticeSet.id, next).catch(() => {
            // Ignore cache failures.
          });
          return next;
        });
      })
      .catch(() => {
        // Non-blocking.
      });
    if (shouldNotifyMilestone) {
      notifySceneMilestone("scene_practice", baseLesson.title);
    }
    handleMarkPracticeComplete();
  }, [
    baseLesson,
    handleMarkPracticeComplete,
    latestPracticeSet,
    scenePracticeCompleted,
    setPracticeSnapshot,
  ]);

  const handlePracticeAttempt = useCallback(
    (payload: PracticeAttemptPayload) => {
      if (!baseLesson || !payload.practiceSetId) return;
      void recordScenePracticeAttemptFromApi(baseLesson.slug, payload)
        .then((result) => {
          if (result.learningState) {
            handleLearningStateChange(result.learningState);
          }
          setPracticeSnapshot((current) => {
            const next = {
              run: result.run,
              latestAttempt: result.attempt,
              summary: {
                completedModeCount: current?.summary.completedModeCount ?? result.run.completedModes.length,
                totalAttemptCount: (current?.summary.totalAttemptCount ?? 0) + 1,
                correctAttemptCount:
                  (current?.summary.correctAttemptCount ?? 0) + (result.attempt.isCorrect ? 1 : 0),
                latestAssessmentLevel: result.attempt.assessmentLevel,
              },
            };
            void setScenePracticeSnapshotCache(baseLesson.slug, payload.practiceSetId, next).catch(() => {
              // Ignore cache failures.
            });
            return next;
          });
        })
        .catch(() => {
          // Non-blocking.
        });
    },
    [baseLesson, handleLearningStateChange, setPracticeSnapshot],
  );

  const handlePracticeModeComplete = useCallback(
    (payload: PracticeModeCompletePayload) => {
      if (!baseLesson) return;
      void markScenePracticeModeCompleteFromApi(baseLesson.slug, payload)
        .then((result) => {
          setPracticeSnapshot((current) => {
            const next = {
              run: result.run,
              latestAttempt: current?.latestAttempt ?? null,
              summary: {
                completedModeCount: result.run.completedModes.length,
                totalAttemptCount: current?.summary.totalAttemptCount ?? 0,
                correctAttemptCount: current?.summary.correctAttemptCount ?? 0,
                latestAssessmentLevel: current?.summary.latestAssessmentLevel ?? null,
              },
            };
            void setScenePracticeSnapshotCache(baseLesson.slug, payload.practiceSetId, next).catch(() => {
              // Ignore cache failures.
            });
            return next;
          });
        })
        .catch(() => {
          // Non-blocking.
        });
    },
    [baseLesson, setPracticeSnapshot],
  );

  return {
    handlePracticeRunStart,
    handlePracticeComplete,
    handlePracticeAttempt,
    handlePracticeModeComplete,
  };
}

