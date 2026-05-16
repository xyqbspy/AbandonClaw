"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lesson } from "@/lib/types";
import { SceneGeneratedState } from "@/lib/types/learning-flow";
import { SceneLearningProgressResponse } from "@/lib/utils/learning-api";
import { cancelScheduledIdleAction, scheduleIdleAction } from "@/lib/utils/resource-actions";

const PRACTICE_PREWARM_FAILURE_LIMIT = 3;
const PRACTICE_PREWARM_FAILURE_WINDOW_MS = 60_000;

type SceneCurrentStep = NonNullable<
  NonNullable<SceneLearningProgressResponse["session"]>["currentStep"]
> | null;

export function useSceneGenerationPrewarm({
  baseLesson,
  currentStep,
  generatedState,
  practiceLoading,
  variantsLoading,
  handlePracticeToolClick,
  handleGeneratePractice,
  handleRegeneratePractice,
  prewarmPractice,
  prewarmVariants,
}: {
  baseLesson: Lesson | null;
  currentStep: SceneCurrentStep;
  generatedState: SceneGeneratedState;
  practiceLoading: boolean;
  variantsLoading: boolean;
  handlePracticeToolClick: () => void;
  handleGeneratePractice: (lesson: Lesson) => Promise<unknown>;
  handleRegeneratePractice: () => Promise<unknown>;
  prewarmPractice: (lesson: Lesson) => Promise<unknown>;
  prewarmVariants: () => Promise<unknown>;
}) {
  const practicePrewarmFailureRef = useRef<{ count: number; firstFailureAt: number | null }>({
    count: 0,
    firstFailureAt: null,
  });
  const [practicePrewarmBlocked, setPracticePrewarmBlocked] = useState(false);
  const [practiceRetryError, setPracticeRetryError] = useState<string | null>(null);

  const resetPracticePrewarmFailures = useCallback(() => {
    practicePrewarmFailureRef.current = {
      count: 0,
      firstFailureAt: null,
    };
    setPracticePrewarmBlocked(false);
    setPracticeRetryError(null);
  }, []);

  const registerPracticePrewarmFailure = useCallback(() => {
    const now = Date.now();
    const current = practicePrewarmFailureRef.current;
    const withinWindow =
      current.firstFailureAt !== null &&
      now - current.firstFailureAt <= PRACTICE_PREWARM_FAILURE_WINDOW_MS;
    const nextCount = withinWindow ? current.count + 1 : 1;
    practicePrewarmFailureRef.current = {
      count: nextCount,
      firstFailureAt: withinWindow ? current.firstFailureAt : now,
    };

    if (nextCount >= PRACTICE_PREWARM_FAILURE_LIMIT) {
      setPracticePrewarmBlocked(true);
      setPracticeRetryError("练习题生成多次失败，请稍后手动重试。");
    }
  }, []);

  const handlePracticeToolAction = useCallback(() => {
    resetPracticePrewarmFailures();
    handlePracticeToolClick();
  }, [handlePracticeToolClick, resetPracticePrewarmFailures]);

  const handleGeneratePracticeManually = useCallback(
    (lesson: Lesson) => {
      resetPracticePrewarmFailures();
      return handleGeneratePractice(lesson);
    },
    [handleGeneratePractice, resetPracticePrewarmFailures],
  );

  const handleRegeneratePracticeManually = useCallback(() => {
    resetPracticePrewarmFailures();
    return handleRegeneratePractice();
  }, [handleRegeneratePractice, resetPracticePrewarmFailures]);

  useEffect(() => {
    const scheduleKey = baseLesson
      ? `scene-practice-prewarm:${baseLesson.id}:${currentStep ?? "none"}`
      : "";
    if (
      !baseLesson ||
      (currentStep !== "practice_sentence" && currentStep !== "scene_practice") ||
      generatedState.practiceStatus !== "idle" ||
      practiceLoading ||
      practicePrewarmBlocked
    ) {
      if (scheduleKey) {
        cancelScheduledIdleAction(scheduleKey);
      }
      return;
    }
    scheduleIdleAction(scheduleKey, () => {
      void prewarmPractice(baseLesson).then((result) => {
        if (result) {
          resetPracticePrewarmFailures();
          return;
        }
        registerPracticePrewarmFailure();
      });
    });
    return () => {
      cancelScheduledIdleAction(scheduleKey);
    };
  }, [
    baseLesson,
    currentStep,
    generatedState.practiceStatus,
    practicePrewarmBlocked,
    practiceLoading,
    prewarmPractice,
    registerPracticePrewarmFailure,
    resetPracticePrewarmFailures,
  ]);

  useEffect(() => {
    const scheduleKey = baseLesson
      ? `scene-variant-prewarm:${baseLesson.id}:${currentStep ?? "none"}`
      : "";
    if (
      !baseLesson ||
      (currentStep !== "scene_practice" && currentStep !== "done") ||
      generatedState.variantStatus !== "idle" ||
      variantsLoading
    ) {
      if (scheduleKey) {
        cancelScheduledIdleAction(scheduleKey);
      }
      return;
    }
    scheduleIdleAction(scheduleKey, () => {
      void prewarmVariants();
    });
    return () => {
      cancelScheduledIdleAction(scheduleKey);
    };
  }, [
    baseLesson,
    currentStep,
    generatedState.variantStatus,
    prewarmVariants,
    variantsLoading,
  ]);

  return {
    practiceRetryError,
    resetPracticePrewarmFailures,
    handlePracticeToolAction,
    handleGeneratePracticeManually,
    handleRegeneratePracticeManually,
  };
}

