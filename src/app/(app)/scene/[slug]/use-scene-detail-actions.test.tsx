import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import type { Lesson } from "@/lib/types";
import type { PracticeSet, VariantSet } from "@/lib/types/learning-flow";
import type { ExpressionMapResponse } from "@/lib/types/expression-map";

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

const practiceSet: PracticeSet = {
  id: "practice-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Scene 1",
  sourceType: "original",
  exercises: [],
  status: "generated",
  createdAt: "2026-03-22T00:00:00.000Z",
};

const variantSet: VariantSet = {
  id: "variant-set-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Scene 1",
  reusedChunks: ["call it a day"],
  variants: [
    {
      id: "variant-1",
      lesson: {
        ...lesson,
        id: "variant-lesson-1",
        slug: "scene-1-v1",
        title: "Variant 1",
        sourceType: "variant",
      },
      status: "unviewed",
    },
  ],
  status: "generated",
  createdAt: "2026-03-22T00:00:00.000Z",
};

const savedPracticeSets: PracticeSet[] = [];
const savedVariantSets: VariantSet[] = [];
const refreshCalls: string[] = [];
const completeCalls: string[] = [];
const deletedPracticeCalls: Array<{ sceneId: string; practiceSetId: string }> = [];
const deletedVariantItemCalls: Array<{ sceneId: string; variantSetId: string; variantId: string }> = [];
const viewModeCalls: Array<{ viewMode: string; variantId?: string | null }> = [];
const activeVariantCalls: Array<string | null> = [];
const generatedPracticeCalls: Array<{ baseLesson: Lesson; sourceLesson: Lesson }> = [];
const generatedVariantCalls: Array<{ baseLesson: Lesson }> = [];
const repeatPracticeWarmupCalls: Array<{
  baseLesson: Lesson;
  latestVariantSet: VariantSet | null;
  practiceSet: PracticeSet;
}> = [];
const repeatVariantWarmupCalls: Array<{
  baseLesson: Lesson;
  variantSet: VariantSet;
}> = [];
const expressionMapCalls: Array<{
  baseLesson: Lesson | null;
  latestVariantSet: VariantSet | null;
  cachedExpressionMap: ExpressionMapResponse | null;
  cachedVariantSetId: string | null;
}> = [];
let currentExpressionMapResponse:
  | { expressionMap: ExpressionMapResponse; variantSetId: string; reused: boolean }
  | null = null;
let currentConfirmResult = true;

const mockedModules = {
  "@/lib/utils/scene-learning-flow-storage": {
    deleteAllVariantSets: () => undefined,
    deletePracticeSet: (sceneId: string, practiceSetId: string) => {
      deletedPracticeCalls.push({ sceneId, practiceSetId });
    },
    deleteVariantItem: (sceneId: string, variantSetId: string, variantId: string) => {
      deletedVariantItemCalls.push({ sceneId, variantSetId, variantId });
    },
    markPracticeSetCompleted: () => undefined,
    markVariantItemStatus: () => undefined,
    markVariantSetCompleted: () => undefined,
    restartPracticeSet: (practiceSet: PracticeSet) => {
      const next = {
        ...practiceSet,
        id: `${practiceSet.id}-repeat`,
        status: "generated" as const,
        completedAt: undefined,
        sessionState: undefined,
      };
      savedPracticeSets.push(next);
      return next;
    },
    restartVariantSet: (variantSet: VariantSet) => {
      const next = {
        ...variantSet,
        id: `${variantSet.id}-repeat`,
        status: "generated" as const,
        completedAt: undefined,
        variants: variantSet.variants.map((variant) => ({
          ...variant,
          status: "unviewed" as const,
        })),
      };
      savedVariantSets.push(next);
      return next;
    },
    savePracticeSet: (next: PracticeSet) => {
      savedPracticeSets.push(next);
    },
    saveVariantSet: (next: VariantSet) => {
      savedVariantSets.push(next);
    },
  },
  "@/lib/utils/learning-api": {
    completeSceneLearningFromApi: async (slug: string) => {
      completeCalls.push(slug);
    },
    completeSceneVariantRunFromApi: async () => ({ run: null }),
    recordSceneVariantViewFromApi: async () => ({ run: null }),
  },
  "@/lib/utils/scene-resource-actions": {
    warmupRepeatPracticeResources: (payload: {
      baseLesson: Lesson;
      latestVariantSet: VariantSet | null;
      practiceSet: PracticeSet;
    }) => {
      repeatPracticeWarmupCalls.push(payload);
    },
    warmupRepeatVariantResources: (payload: {
      baseLesson: Lesson;
      variantSet: VariantSet;
    }) => {
      repeatVariantWarmupCalls.push(payload);
    },
  },
  "./scene-detail-generation-logic": {
    generateScenePracticeSet: async ({
      baseLesson,
      sourceLesson,
    }: {
      baseLesson: Lesson;
      sourceLesson: Lesson;
    }) => {
      generatedPracticeCalls.push({ baseLesson, sourceLesson });
      return practiceSet;
    },
    generateSceneVariantSet: async ({ baseLesson }: { baseLesson: Lesson }) => {
      generatedVariantCalls.push({ baseLesson });
      return variantSet;
    },
    ensureSceneExpressionMapData: async (args: {
      baseLesson: Lesson | null;
      latestVariantSet: VariantSet | null;
      cachedExpressionMap: ExpressionMapResponse | null;
      cachedVariantSetId: string | null;
    }) => {
      expressionMapCalls.push(args);
      return currentExpressionMapResponse;
    },
  },
} satisfies Record<string, unknown>;

const originalConfirm = window.confirm;
const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let useSceneDetailActionsModule:
  | typeof import("./use-scene-detail-actions").useSceneDetailActions
  | null = null;

function getUseSceneDetailActions() {
  if (!useSceneDetailActionsModule) {
    const modulePath = localRequire.resolve("./use-scene-detail-actions");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./use-scene-detail-actions") as typeof import("./use-scene-detail-actions");
    useSceneDetailActionsModule = imported.useSceneDetailActions;
  }
  return useSceneDetailActionsModule;
}

afterEach(() => {
  cleanup();
  savedPracticeSets.length = 0;
  savedVariantSets.length = 0;
  refreshCalls.length = 0;
  completeCalls.length = 0;
  deletedPracticeCalls.length = 0;
  deletedVariantItemCalls.length = 0;
  viewModeCalls.length = 0;
  activeVariantCalls.length = 0;
  generatedPracticeCalls.length = 0;
  generatedVariantCalls.length = 0;
  repeatPracticeWarmupCalls.length = 0;
  repeatVariantWarmupCalls.length = 0;
  expressionMapCalls.length = 0;
  currentExpressionMapResponse = null;
  currentConfirmResult = true;
  window.confirm = originalConfirm;
  useSceneDetailActionsModule = null;
});

test("useSceneDetailActions 会生成 practice 并切到 practice 视图", async () => {
  const useSceneDetailActions = getUseSceneDetailActions();

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: null,
      latestVariantSet: null,
      activeVariantId: null,
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  act(() => {
    result.current.setShowAnswerMap({ exercise: true });
  });

  await act(async () => {
    await result.current.handleGeneratePractice(lesson);
  });

  assert.equal(generatedPracticeCalls.length, 1);
  assert.equal(savedPracticeSets[0]?.id, "practice-1");
  assert.deepEqual(refreshCalls, ["scene-1"]);
  assert.deepEqual(viewModeCalls.at(-1), { viewMode: "practice", variantId: undefined });
  assert.deepEqual(result.current.showAnswerMap, {});
  assert.equal(result.current.practiceLoading, false);
});

test("useSceneDetailActions 会支持主场景直接完成学习", async () => {
  const useSceneDetailActions = getUseSceneDetailActions();

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: null,
      latestVariantSet: null,
      activeVariantId: null,
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  await act(async () => {
    result.current.handleCompleteBaseScene();
  });

  await waitFor(() => {
    assert.deepEqual(completeCalls, ["scene-1"]);
    assert.equal(result.current.sceneCompleting, false);
  });
});

test("useSceneDetailActions 删除当前激活变体后会清空激活项并回退 variants", () => {
  const useSceneDetailActions = getUseSceneDetailActions();
  window.confirm = () => currentConfirmResult;

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: null,
      latestVariantSet: variantSet,
      activeVariantId: "variant-1",
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  act(() => {
    result.current.handleDeleteVariantItem("variant-1");
  });

  assert.deepEqual(deletedVariantItemCalls, [
    { sceneId: "scene-1", variantSetId: "variant-set-1", variantId: "variant-1" },
  ]);
  assert.deepEqual(activeVariantCalls, [null]);
  assert.deepEqual(viewModeCalls.at(-1), { viewMode: "variants", variantId: undefined });
});

test("useSceneDetailActions 会生成表达地图并切到 expression-map 视图", async () => {
  const useSceneDetailActions = getUseSceneDetailActions();
  currentExpressionMapResponse = {
    expressionMap: {
      version: "v1",
      sourceSceneId: "scene-1",
      clusters: [],
    },
    variantSetId: "variant-set-1",
    reused: false,
  };

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: null,
      latestVariantSet: variantSet,
      activeVariantId: null,
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  await act(async () => {
    await result.current.handleOpenExpressionMap();
  });

  assert.equal(expressionMapCalls.length, 1);
  assert.equal(result.current.expressionMap?.sourceSceneId, "scene-1");
  assert.deepEqual(viewModeCalls.at(-1), { viewMode: "expression-map", variantId: undefined });

  act(() => {
    result.current.resetRouteScopedState();
  });

  await waitFor(() => {
    assert.equal(result.current.expressionMap, null);
    assert.deepEqual(result.current.showAnswerMap, {});
  });
});

test("useSceneDetailActions 会静默预热 variants，且不切换当前视图", async () => {
  const useSceneDetailActions = getUseSceneDetailActions();

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: null,
      latestVariantSet: null,
      activeVariantId: null,
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  await act(async () => {
    await result.current.prewarmVariants();
  });

  assert.equal(generatedVariantCalls.length, 1);
  assert.equal(savedVariantSets[0]?.id, "variant-set-1");
  assert.deepEqual(refreshCalls, ["scene-1"]);
  assert.deepEqual(viewModeCalls, []);
});

test("useSceneDetailActions 会静默预热 practice，且不切换当前视图", async () => {
  const useSceneDetailActions = getUseSceneDetailActions();

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: null,
      latestVariantSet: null,
      activeVariantId: null,
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  await act(async () => {
    await result.current.prewarmPractice(lesson);
  });

  assert.equal(generatedPracticeCalls.length, 1);
  assert.equal(savedPracticeSets[0]?.id, "practice-1");
  assert.deepEqual(refreshCalls, ["scene-1"]);
  assert.deepEqual(viewModeCalls, []);
});

test("useSceneDetailActions 会从已完成练习开启新一轮", () => {
  const useSceneDetailActions = getUseSceneDetailActions();

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: {
        ...practiceSet,
        status: "completed",
        completedAt: "2026-03-22T00:00:00.000Z",
      },
      latestVariantSet: null,
      activeVariantId: null,
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  act(() => {
    result.current.handlePracticeToolClick();
  });

  assert.equal(savedPracticeSets[0]?.id, "practice-1-repeat");
  assert.equal(repeatPracticeWarmupCalls[0]?.practiceSet.id, "practice-1-repeat");
  assert.deepEqual(refreshCalls, ["scene-1"]);
  assert.deepEqual(viewModeCalls.at(-1), { viewMode: "practice", variantId: undefined });
});

test("useSceneDetailActions 会从已完成变体开启新一轮", () => {
  const useSceneDetailActions = getUseSceneDetailActions();

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: null,
      latestVariantSet: {
        ...variantSet,
        status: "completed",
        completedAt: "2026-03-22T00:00:00.000Z",
        variants: [
          {
            ...variantSet.variants[0],
            status: "completed",
          },
        ],
      },
      activeVariantId: "variant-1",
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  act(() => {
    result.current.handleVariantToolClick();
  });

  assert.equal(savedVariantSets[0]?.id, "variant-set-1-repeat");
  assert.equal(savedVariantSets[0]?.variants[0]?.status, "unviewed");
  assert.equal(repeatVariantWarmupCalls[0]?.variantSet.id, "variant-set-1-repeat");
  assert.deepEqual(activeVariantCalls, [null]);
  assert.deepEqual(refreshCalls, ["scene-1"]);
  assert.deepEqual(viewModeCalls.at(-1), { viewMode: "variants", variantId: undefined });
});

test("useSceneDetailActions 会在已有活跃变体时直接续上该变体", () => {
  const useSceneDetailActions = getUseSceneDetailActions();

  const { result } = renderHook(() =>
    useSceneDetailActions({
      baseLesson: lesson,
      latestPracticeSet: null,
      latestVariantSet: variantSet,
      activeVariantId: "variant-1",
      setActiveVariantId: (variantId) => activeVariantCalls.push(variantId),
      setViewModeWithRoute: (viewMode, variantId) => viewModeCalls.push({ viewMode, variantId }),
      refreshGeneratedState: (sceneKey) => refreshCalls.push(sceneKey),
    }),
  );

  act(() => {
    result.current.handleVariantToolClick();
  });

  assert.deepEqual(viewModeCalls.at(-1), {
    viewMode: "variant-study",
    variantId: "variant-1",
  });
});
