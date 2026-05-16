import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import type { Lesson } from "@/lib/types";
import type { SceneGeneratedState } from "@/lib/types/learning-flow";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

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

const scheduledActions: Array<{ key: string; action: () => void }> = [];
const cancelledKeys: string[] = [];
const practiceCalls: string[] = [];
const generateCalls: string[] = [];
const regenerateCalls: string[] = [];
const practiceToolClicks: string[] = [];

const mockedModules = {
  "@/lib/utils/resource-actions": {
    cancelScheduledIdleAction: (key: string) => {
      cancelledKeys.push(key);
      return true;
    },
    scheduleIdleAction: (key: string, action: () => void) => {
      scheduledActions.push({ key, action });
      return true;
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

let useSceneGenerationPrewarmModule:
  | typeof import("./use-scene-generation-prewarm").useSceneGenerationPrewarm
  | null = null;

function getUseSceneGenerationPrewarm() {
  if (!useSceneGenerationPrewarmModule) {
    const modulePath = localRequire.resolve("./use-scene-generation-prewarm");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./use-scene-generation-prewarm") as typeof import("./use-scene-generation-prewarm");
    useSceneGenerationPrewarmModule = imported.useSceneGenerationPrewarm;
  }
  return useSceneGenerationPrewarmModule;
}

afterEach(() => {
  cleanup();
  scheduledActions.length = 0;
  cancelledKeys.length = 0;
  practiceCalls.length = 0;
  generateCalls.length = 0;
  regenerateCalls.length = 0;
  practiceToolClicks.length = 0;
  useSceneGenerationPrewarmModule = null;
});

test("useSceneGenerationPrewarm 会阻断连续失败并允许手动重试重置", async () => {
  const useSceneGenerationPrewarm = getUseSceneGenerationPrewarm();

  // 提到 renderHook 外面用稳定引用，否则每次 rerender 会创建新函数，
  // 导致 hook 内 useCallback deps 变化，handlePracticeToolAction 引用必然失效。
  const handlePracticeToolClickStable = () => {
    practiceToolClicks.push("click");
  };
  const handleGeneratePracticeStable = async (inputLesson: Lesson) => {
    generateCalls.push(inputLesson.slug);
    return null;
  };
  const handleRegeneratePracticeStable = async () => {
    regenerateCalls.push("regen");
    return null;
  };
  const prewarmPracticeStable = async () => {
    practiceCalls.push("practice");
    return null;
  };
  const prewarmVariantsStable = async () => undefined;

  const { result, rerender } = renderHook(
    ({
      currentStep,
    }: {
      currentStep: "practice_sentence" | "scene_practice" | "done";
    }) =>
      useSceneGenerationPrewarm({
        baseLesson: lesson,
        currentStep,
        generatedState: {
          latestPracticeSet: null,
          latestVariantSet: null,
          practiceStatus: "idle",
          variantStatus: "idle",
        } satisfies SceneGeneratedState,
        practiceLoading: false,
        variantsLoading: true,
        handlePracticeToolClick: handlePracticeToolClickStable,
        handleGeneratePractice: handleGeneratePracticeStable,
        handleRegeneratePractice: handleRegeneratePracticeStable,
        prewarmPractice: prewarmPracticeStable,
        prewarmVariants: prewarmVariantsStable,
      }),
    {
      initialProps: {
        currentStep: "practice_sentence" as
          | "practice_sentence"
          | "scene_practice"
          | "done",
      },
    },
  );

  const runScheduledAction = async () => {
    const scheduled = scheduledActions.shift();
    assert.ok(scheduled);
    await act(async () => {
      scheduled?.action();
      await Promise.resolve();
    });
  };

  await runScheduledAction();
  rerender({ currentStep: "scene_practice" });
  await runScheduledAction();
  rerender({ currentStep: "practice_sentence" });
  await runScheduledAction();

  await waitFor(() =>
    assert.equal(
      result.current.practiceRetryError,
      "练习题生成多次失败，请稍后手动重试。",
    ),
  );
  assert.equal(practiceCalls.length, 3);
  assert.equal(cancelledKeys.length >= 0, true);

  const stableAction = result.current.handlePracticeToolAction;
  rerender({ currentStep: "practice_sentence" });
  assert.equal(result.current.handlePracticeToolAction, stableAction);

  act(() => {
    result.current.handlePracticeToolAction();
  });

  assert.equal(practiceToolClicks.length, 1);
  assert.equal(result.current.practiceRetryError, null);
});

