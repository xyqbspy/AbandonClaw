import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { cleanup, renderHook } from "@testing-library/react";

import { Lesson } from "@/lib/types";

import {
  resetSceneLearningStartThrottleForTests,
  useSceneLearningSync,
} from "./use-scene-learning-sync";

afterEach(() => {
  cleanup();
  resetSceneLearningStartThrottleForTests();
});

type HookProps = {
  viewMode: "scene" | "variant-study";
  activeVariantId: string | null;
};

type LearningSyncDeps = NonNullable<Parameters<typeof useSceneLearningSync>[0]["deps"]>;

const buildLearningProgressResponse = () => ({
  progress: {
    id: "progress-1",
    sceneId: "scene-1",
    status: "in_progress" as const,
    progressPercent: 0,
    masteryStage: "listening" as const,
    masteryPercent: 20,
    focusedExpressionCount: 0,
    practicedSentenceCount: 0,
    scenePracticeCount: 0,
    variantUnlockedAt: null,
    lastSentenceIndex: null,
    lastVariantIndex: null,
    startedAt: null,
    lastViewedAt: null,
    completedAt: null,
    lastPracticedAt: null,
    totalStudySeconds: 0,
    todayStudySeconds: 0,
    savedPhraseCount: 0,
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
  session: {
    id: "session-1",
    sceneId: "scene-1",
    currentStep: "listen" as const,
    selectedBlockId: null,
    fullPlayCount: 0,
    openedExpressionCount: 0,
    practicedSentenceCount: 0,
    scenePracticeCompleted: false,
    isDone: false,
    startedAt: "2026-03-22T00:00:00.000Z",
    endedAt: null,
    lastActiveAt: "2026-03-22T00:00:00.000Z",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
});

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

test("useSceneLearningSync 会启动学习、同步进度，并在卸载时带 pause flush", async () => {
  let now = 1_000;
  const timeouts = new Map<number, () => void>();
  const intervals = new Map<number, () => void>();
  const updateCalls: Array<{
    slug: string;
    payload: {
      progressPercent: number;
      lastVariantIndex?: number;
      studySecondsDelta: number;
    };
  }> = [];
  const startCalls: string[] = [];
  const pauseCalls: string[] = [];
  let timeoutId = 0;
  let intervalId = 0;

  const deps: LearningSyncDeps = {
    startSceneLearningFromApi: async (slug: string) => {
      startCalls.push(slug);
      return buildLearningProgressResponse();
    },
    pauseSceneLearningFromApi: async (slug: string) => {
      pauseCalls.push(slug);
      return buildLearningProgressResponse();
    },
    updateSceneLearningProgressFromApi: async (slug: string, payload) => {
      updateCalls.push({
        slug,
        payload: {
          progressPercent: payload.progressPercent ?? 0,
          lastVariantIndex: payload.lastVariantIndex,
          studySecondsDelta: payload.studySecondsDelta ?? 0,
        },
      });
      return buildLearningProgressResponse();
    },
    shouldFlushSceneLearningDelta: ({
      hasBaseLesson,
      learningStarted,
      studySecondsDelta,
      withPause,
    }) => Boolean(hasBaseLesson && learningStarted && (studySecondsDelta > 0 || withPause)),
    buildSceneLearningUpdatePayload: ({
      viewMode,
      activeVariantId,
      withPause,
    }) => ({
      progressPercent: viewMode === "variant-study" ? 65 : 20,
      lastVariantIndex:
        viewMode === "variant-study" && activeVariantId
          ? Number(activeVariantId.split("-").at(-1))
          : undefined,
      withPause: Boolean(withPause),
    }),
    now: () => now,
    setTimeoutFn: (callback: () => void) => {
      timeoutId += 1;
      timeouts.set(timeoutId, callback);
      return timeoutId;
    },
    clearTimeoutFn: (handle) => {
      timeouts.delete(handle as number);
    },
    setIntervalFn: (callback: () => void) => {
      intervalId += 1;
      intervals.set(intervalId, callback);
      return intervalId;
    },
    clearIntervalFn: (handle) => {
      intervals.delete(handle as number);
    },
    startCooldownMs: 30_000,
  };

  const { rerender, unmount } = renderHook(
    ({ viewMode, activeVariantId }: HookProps) =>
      useSceneLearningSync({
        baseLesson: lesson,
        viewMode,
        activeVariantId,
        deps,
      }),
    {
      initialProps: {
        viewMode: "scene",
        activeVariantId: null,
      },
    },
  );

  assert.deepEqual(startCalls, ["scene-1"]);
  now = 3_200;
  Array.from(timeouts.values()).forEach((callback) => callback());
  assert.deepEqual(updateCalls[0], {
    slug: "scene-1",
    payload: {
      progressPercent: 20,
      lastVariantIndex: undefined,
      studySecondsDelta: 2,
    },
  });

  rerender({
    viewMode: "variant-study",
    activeVariantId: "variant-2",
  });
  now = 5_500;
  Array.from(timeouts.values()).forEach((callback) => callback());

  assert.deepEqual(updateCalls[1], {
    slug: "scene-1",
    payload: {
      progressPercent: 65,
      lastVariantIndex: 2,
      studySecondsDelta: 2,
    },
  });

  const intervalCallback = Array.from(intervals.values())[0];
  now = 66_000;
  intervalCallback?.();
  assert.equal(updateCalls[2]?.payload.progressPercent, 65);

  now = 66_000;
  unmount();
  await Promise.resolve();

  assert.equal(updateCalls[3]?.payload.progressPercent, 65);
  assert.equal(updateCalls[3]?.payload.studySecondsDelta, 0);
  assert.deepEqual(pauseCalls, ["scene-1"]);
});

test("useSceneLearningSync 在冷却窗口内重复进入时不会重复 start", async () => {
  let now = 5_000;
  const startCalls: string[] = [];

  const deps: LearningSyncDeps = {
    startSceneLearningFromApi: async (slug: string) => {
      startCalls.push(slug);
      return buildLearningProgressResponse();
    },
    pauseSceneLearningFromApi: async () => buildLearningProgressResponse(),
    updateSceneLearningProgressFromApi: async () => buildLearningProgressResponse(),
    shouldFlushSceneLearningDelta: () => false,
    buildSceneLearningUpdatePayload: () => ({
      progressPercent: 20,
      lastVariantIndex: undefined,
      withPause: false,
    }),
    now: () => now,
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => undefined,
    setIntervalFn: () => 1,
    clearIntervalFn: () => undefined,
    startCooldownMs: 30_000,
  };

  const first = renderHook(() =>
    useSceneLearningSync({
      baseLesson: lesson,
      viewMode: "scene",
      activeVariantId: null,
      deps,
    }),
  );

  assert.deepEqual(startCalls, ["scene-1"]);
  first.unmount();
  await Promise.resolve();

  now = 8_000;
  const second = renderHook(() =>
    useSceneLearningSync({
      baseLesson: lesson,
      viewMode: "scene",
      activeVariantId: null,
      deps,
    }),
  );

  assert.deepEqual(startCalls, ["scene-1"]);
  second.unmount();
});

test("useSceneLearningSync 超过冷却窗口后会重新 start", async () => {
  let now = 10_000;
  const startCalls: string[] = [];

  const deps: LearningSyncDeps = {
    startSceneLearningFromApi: async (slug: string) => {
      startCalls.push(slug);
      return buildLearningProgressResponse();
    },
    pauseSceneLearningFromApi: async () => buildLearningProgressResponse(),
    updateSceneLearningProgressFromApi: async () => buildLearningProgressResponse(),
    shouldFlushSceneLearningDelta: () => false,
    buildSceneLearningUpdatePayload: () => ({
      progressPercent: 20,
      lastVariantIndex: undefined,
      withPause: false,
    }),
    now: () => now,
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => undefined,
    setIntervalFn: () => 1,
    clearIntervalFn: () => undefined,
    startCooldownMs: 10_000,
  };

  const first = renderHook(() =>
    useSceneLearningSync({
      baseLesson: lesson,
      viewMode: "scene",
      activeVariantId: null,
      deps,
    }),
  );

  assert.deepEqual(startCalls, ["scene-1"]);
  first.unmount();
  await Promise.resolve();

  now = 20_500;
  const second = renderHook(() =>
    useSceneLearningSync({
      baseLesson: lesson,
      viewMode: "scene",
      activeVariantId: null,
      deps,
    }),
  );

  assert.deepEqual(startCalls, ["scene-1", "scene-1"]);
  second.unmount();
});

test("useSceneLearningSync 在有新鲜学习态缓存时不会立刻重复 start", () => {
  const startCalls: string[] = [];

  const deps: LearningSyncDeps = {
    startSceneLearningFromApi: async (slug: string) => {
      startCalls.push(slug);
      return buildLearningProgressResponse();
    },
    pauseSceneLearningFromApi: async () => buildLearningProgressResponse(),
    updateSceneLearningProgressFromApi: async () => buildLearningProgressResponse(),
    shouldFlushSceneLearningDelta: () => false,
    buildSceneLearningUpdatePayload: () => ({
      progressPercent: 20,
      lastVariantIndex: undefined,
      withPause: false,
    }),
    now: () => 10_000,
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => undefined,
    setIntervalFn: () => 1,
    clearIntervalFn: () => undefined,
    startCooldownMs: 30_000,
  };

  const hook = renderHook(() =>
    useSceneLearningSync({
      baseLesson: lesson,
      viewMode: "scene",
      activeVariantId: null,
      initialLearningState: buildLearningProgressResponse(),
      hasFreshInitialLearningState: true,
      deps,
    }),
  );

  assert.deepEqual(startCalls, []);
  hook.unmount();
});
