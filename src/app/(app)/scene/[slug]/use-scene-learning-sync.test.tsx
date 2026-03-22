import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, renderHook } from "@testing-library/react";

import { useSceneLearningSync } from "./use-scene-learning-sync";

afterEach(() => {
  cleanup();
});

type HookProps = {
  viewMode: "scene" | "variant-study";
  activeVariantId: string | null;
};

const lesson = {
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
} as const;

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

  const deps = {
    startSceneLearningFromApi: async (slug: string) => {
      startCalls.push(slug);
    },
    pauseSceneLearningFromApi: async (slug: string) => {
      pauseCalls.push(slug);
    },
    updateSceneLearningProgressFromApi: async (slug: string, payload: any) => {
      updateCalls.push({ slug, payload });
    },
    shouldFlushSceneLearningDelta: ({
      hasBaseLesson,
      learningStarted,
      studySecondsDelta,
      withPause,
    }: {
      hasBaseLesson: boolean;
      learningStarted: boolean;
      studySecondsDelta: number;
      withPause: boolean;
    }) => Boolean(hasBaseLesson && learningStarted && (studySecondsDelta > 0 || withPause)),
    buildSceneLearningUpdatePayload: ({
      viewMode,
      activeVariantId,
      withPause,
    }: {
      viewMode: string;
      activeVariantId?: string | null;
      withPause?: boolean;
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
      return timeoutId as never;
    },
    clearTimeoutFn: (handle: number) => {
      timeouts.delete(handle);
    },
    setIntervalFn: (callback: () => void) => {
      intervalId += 1;
      intervals.set(intervalId, callback);
      return intervalId as never;
    },
    clearIntervalFn: (handle: number) => {
      intervals.delete(handle);
    },
  };

  const { rerender, unmount } = renderHook(
    ({ viewMode, activeVariantId }: HookProps) =>
      useSceneLearningSync({
        baseLesson: lesson as never,
        viewMode,
        activeVariantId,
        deps: deps as never,
      }),
    {
      initialProps: {
        viewMode: "scene" as const,
        activeVariantId: null as string | null,
      } as HookProps,
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
    viewMode: "variant-study" as const,
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
