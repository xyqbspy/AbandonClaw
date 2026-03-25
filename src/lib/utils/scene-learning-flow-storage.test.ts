import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { PracticeSet } from "@/lib/types/learning-flow";
import {
  getLatestPracticeSet,
  getLatestVariantSet,
  hydrateVariantSetFromRun,
  markPracticeSetCompleted,
  markVariantSetCompleted,
  restartPracticeSet,
  restartVariantSet,
  savePracticeSet,
  saveVariantSet,
  updatePracticeSetSession,
} from "./scene-learning-flow-storage";
import { VariantSet } from "@/lib/types/learning-flow";

const createLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
};

const practiceSet: PracticeSet = {
  id: "practice-storage-1",
  sourceSceneId: "scene-storage-1",
  sourceSceneTitle: "Storage Scene",
  sourceType: "original",
  exercises: [
    {
      id: "exercise-1",
      type: "chunk_cloze",
      inputMode: "typing",
      sceneId: "scene-storage-1",
      sentenceId: "sentence-1",
      chunkId: "chunk-1",
      prompt: "补全句子中的表达",
      answer: {
        text: "call it a day",
        acceptedAnswers: ["call it a day"],
      },
      cloze: {
        displayText: "I should ____ now.",
      },
    },
  ],
  status: "generated",
  createdAt: "2026-03-23T08:00:00.000Z",
};

const variantSet: VariantSet = {
  id: "variant-storage-1",
  sourceSceneId: "scene-storage-1",
  sourceSceneTitle: "Storage Scene",
  reusedChunks: ["call it a day"],
  variants: [
    {
      id: "variant-item-1",
      lesson: {
        id: "variant-lesson-1",
        slug: "variant-1",
        title: "Variant 1",
        difficulty: "Beginner",
        estimatedMinutes: 5,
        completionRate: 0,
        tags: [],
        sceneType: "dialogue",
        sections: [
          {
            id: "section-1",
            blocks: [
              {
                id: "block-1",
                sentences: [
                  {
                    id: "sentence-1",
                    text: "Call it a day.",
                    translation: "今天先到这。",
                    chunks: ["call it a day"],
                  },
                ],
              },
            ],
          },
        ],
        explanations: [],
        sourceType: "variant",
      },
      status: "completed",
    },
  ],
  status: "generated",
  createdAt: "2026-03-23T08:00:00.000Z",
};

afterEach(() => {
  window.localStorage.clear();
});

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: createLocalStorageMock(),
    },
  });
});

test("scene learning flow storage 会持久化练习过程", () => {
  savePracticeSet(practiceSet);

  updatePracticeSetSession(practiceSet.sourceSceneId, practiceSet.id, {
    activeExerciseIndex: 0,
    answerMap: { "exercise-1": "call it a day" },
    resultMap: { "exercise-1": "correct" },
    attemptCountMap: { "exercise-1": 2 },
    incorrectCountMap: { "exercise-1": 1 },
    updatedAt: "2026-03-23T08:05:00.000Z",
  });

  const latestPracticeSet = getLatestPracticeSet(practiceSet.sourceSceneId);
  assert.ok(latestPracticeSet);
  assert.equal(latestPracticeSet.sessionState?.answerMap["exercise-1"], "call it a day");
  assert.equal(latestPracticeSet.sessionState?.attemptCountMap["exercise-1"], 2);
  assert.equal(latestPracticeSet.sessionState?.incorrectCountMap["exercise-1"], 1);
});

test("scene learning flow storage 在标记完成时会清空练习过程", () => {
  savePracticeSet(practiceSet);

  updatePracticeSetSession(practiceSet.sourceSceneId, practiceSet.id, {
    activeExerciseIndex: 0,
    answerMap: { "exercise-1": "call it a day" },
    resultMap: { "exercise-1": "correct" },
    attemptCountMap: { "exercise-1": 1 },
    incorrectCountMap: {},
    updatedAt: "2026-03-23T08:06:00.000Z",
  });

  markPracticeSetCompleted(practiceSet.sourceSceneId, practiceSet.id);

  const latestPracticeSet = getLatestPracticeSet(practiceSet.sourceSceneId);
  assert.ok(latestPracticeSet);
  assert.equal(latestPracticeSet.status, "completed");
  assert.equal(latestPracticeSet.sessionState, undefined);
});

test("scene learning flow storage 支持从已完成练习复制出新一轮", () => {
  savePracticeSet(practiceSet);
  markPracticeSetCompleted(practiceSet.sourceSceneId, practiceSet.id);

  const completedPracticeSet = getLatestPracticeSet(practiceSet.sourceSceneId);
  assert.ok(completedPracticeSet);

  const restartedPracticeSet = restartPracticeSet(completedPracticeSet);
  const latestPracticeSet = getLatestPracticeSet(practiceSet.sourceSceneId);
  assert.ok(latestPracticeSet);

  assert.equal(restartedPracticeSet.status, "generated");
  assert.equal(latestPracticeSet.status, "generated");
  assert.equal(latestPracticeSet.completedAt, undefined);
  assert.equal(latestPracticeSet.sessionState, undefined);
  assert.notEqual(latestPracticeSet.id, practiceSet.id);
});

test("scene learning flow storage 支持从已完成变体复制出新一轮", () => {
  saveVariantSet(variantSet);
  markVariantSetCompleted(variantSet.sourceSceneId, variantSet.id);

  const completedVariantSet = getLatestVariantSet(variantSet.sourceSceneId);
  assert.ok(completedVariantSet);

  const restartedVariantSet = restartVariantSet(completedVariantSet);
  const latestVariantSet = getLatestVariantSet(variantSet.sourceSceneId);
  assert.ok(latestVariantSet);

  assert.equal(restartedVariantSet.status, "generated");
  assert.equal(latestVariantSet.status, "generated");
  assert.equal(latestVariantSet.completedAt, undefined);
  assert.notEqual(latestVariantSet.id, variantSet.id);
  assert.equal(latestVariantSet.variants[0]?.status, "unviewed");
});

test("scene learning flow storage 会按服务端变体 run 合并已查看状态", () => {
  saveVariantSet({
    ...variantSet,
    variants: [
      {
        ...variantSet.variants[0],
        status: "unviewed",
      },
      {
        ...variantSet.variants[0],
        id: "variant-item-2",
        lesson: {
          ...variantSet.variants[0].lesson,
          id: "variant-lesson-2",
          slug: "variant-2",
          title: "Variant 2",
        },
        status: "completed",
      },
    ],
  });

  hydrateVariantSetFromRun(variantSet.sourceSceneId, variantSet.id, {
    activeVariantId: "variant-item-1",
    viewedVariantIds: ["variant-item-1"],
    status: "completed",
  });

  const latestVariantSet = getLatestVariantSet(variantSet.sourceSceneId);
  assert.ok(latestVariantSet);
  assert.equal(latestVariantSet.status, "completed");
  assert.equal(latestVariantSet.variants[0]?.status, "viewed");
  assert.equal(latestVariantSet.variants[1]?.status, "completed");
});
