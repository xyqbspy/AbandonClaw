import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";

import type { Lesson } from "@/lib/types";
import type { PracticeSet, VariantSet } from "@/lib/types/learning-flow";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const warmupCalls: Array<{
  lesson: Lesson;
  options?: { sentenceLimit?: number; chunkLimit?: number; key?: string };
}> = [];

const baseLesson: Lesson = {
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

const variantLesson: Lesson = {
  ...baseLesson,
  id: "variant-lesson-1",
  slug: "scene-1-variant-1",
  title: "Scene 1 Variant 1",
  sourceType: "variant",
};

const latestVariantSet: VariantSet = {
  id: "variant-set-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Scene 1",
  reusedChunks: ["call it a day"],
  variants: [
    {
      id: "variant-item-1",
      lesson: variantLesson,
      status: "completed",
    },
  ],
  status: "completed",
  createdAt: "2026-03-22T00:00:00.000Z",
  completedAt: "2026-03-22T00:00:00.000Z",
};

const mockedModules = {
  "@/lib/utils/resource-actions": {
    scheduleIdleAction: () => true,
    scheduleLessonAudioWarmup: (
      lesson: Lesson,
      options?: { sentenceLimit?: number; chunkLimit?: number; key?: string },
    ) => {
      warmupCalls.push({ lesson, options });
      return true;
    },
  },
  "@/lib/cache/scene-cache": {
    getSceneCache: async () => null,
    setSceneCache: async () => undefined,
  },
  "@/lib/utils/scenes-api": {
    getSceneDetailBySlugFromApi: async () => baseLesson,
  },
  "@/lib/utils/scene-learning-flow-storage": {
    getSceneGeneratedState: () => ({
      latestPracticeSet: null,
      latestVariantSet: null,
      practiceStatus: "idle",
      variantStatus: "idle",
    }),
    savePracticeSet: () => undefined,
    saveVariantSet: () => undefined,
  },
  "@/app/(app)/scene/[slug]/scene-detail-generation-logic": {
    generateScenePracticeSet: async () => {
      throw new Error("not expected");
    },
    generateSceneVariantSet: async () => {
      throw new Error("not expected");
    },
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let sceneResourceActionsModule: typeof import("./scene-resource-actions") | null = null;

function getSceneResourceActions() {
  if (!sceneResourceActionsModule) {
    const modulePath = localRequire.resolve("./scene-resource-actions");
    delete localRequire.cache[modulePath];
    sceneResourceActionsModule = localRequire("./scene-resource-actions") as typeof import("./scene-resource-actions");
  }
  return sceneResourceActionsModule;
}

afterEach(() => {
  warmupCalls.length = 0;
  sceneResourceActionsModule = null;
});

test("warmupRepeatPracticeResources 会优先预热变体来源音频", () => {
  const { warmupRepeatPracticeResources } = getSceneResourceActions();

  const practiceSet: PracticeSet = {
    id: "practice-1-repeat",
    sourceSceneId: "scene-1",
    sourceSceneTitle: "Scene 1",
    sourceType: "variant",
    sourceVariantId: "variant-item-1",
    sourceVariantTitle: "Scene 1 Variant 1",
    exercises: [],
    status: "generated",
    createdAt: "2026-03-22T00:00:00.000Z",
  };

  warmupRepeatPracticeResources({
    baseLesson,
    latestVariantSet,
    practiceSet,
  });

  assert.equal(warmupCalls.length, 1);
  assert.equal(warmupCalls[0]?.lesson.id, "variant-lesson-1");
  assert.equal(
    warmupCalls[0]?.options?.key,
    "repeat-practice-audio:practice-1-repeat:variant-lesson-1",
  );
});

test("warmupRepeatVariantResources 会预热源场景和首个变体音频", () => {
  const { warmupRepeatVariantResources } = getSceneResourceActions();

  warmupRepeatVariantResources({
    baseLesson,
    variantSet: {
      ...latestVariantSet,
      id: "variant-set-1-repeat",
      status: "generated",
      completedAt: undefined,
    },
  });

  assert.equal(warmupCalls.length, 2);
  assert.equal(warmupCalls[0]?.lesson.id, "scene-1");
  assert.equal(
    warmupCalls[0]?.options?.key,
    "repeat-variant-source-audio:variant-set-1-repeat:scene-1",
  );
  assert.equal(warmupCalls[1]?.lesson.id, "variant-lesson-1");
  assert.equal(
    warmupCalls[1]?.options?.key,
    "repeat-variant-target-audio:variant-set-1-repeat:variant-lesson-1",
  );
});
