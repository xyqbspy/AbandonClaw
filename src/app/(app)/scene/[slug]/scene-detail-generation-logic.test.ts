import assert from "node:assert/strict";
import test from "node:test";

import { ensureSceneExpressionMapData, generateScenePracticeSet, generateSceneVariantSet, syncSceneVariantsFromDb } from "./scene-detail-generation-logic";

const baseLesson = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  sceneType: "dialogue",
  sourceType: "original",
  sections: [
    {
      id: "section-1",
      title: "Section 1",
      blocks: [
        {
          id: "block-1",
          sentences: [
            {
              id: "sentence-1",
              text: "How are you?",
              translation: "",
              chunks: ["How are you"],
              chunkDetails: [
                { text: "How are you", translation: "", usageNote: "" },
              ],
            },
          ],
        },
      ],
    },
  ],
} as any;

const variantLesson = {
  ...(baseLesson as any),
  id: "variant-1",
  slug: "variant-1",
  title: "Variant 1",
  sourceType: "variant",
} as never;

test("syncSceneVariantsFromDb 会在已有本地变体时直接跳过", async () => {
  const result = await syncSceneVariantsFromDb({
    baseLesson,
    hasExistingVariantSet: true,
    deps: {
      getSceneVariantsFromApi: async () => {
        throw new Error("should not fetch");
      },
    },
  });

  assert.equal(result, null);
});

test("syncSceneVariantsFromDb 会把数据库变体转成稳定的 VariantSet", async () => {
  const result = await syncSceneVariantsFromDb({
    baseLesson,
    hasExistingVariantSet: false,
    deps: {
      getSceneVariantsFromApi: async () => [variantLesson],
      nowIso: () => "2026-03-22T00:00:00.000Z",
    },
  });

  assert.equal(result?.id, "db-variant-scene-1");
  assert.equal(result?.variants.length, 1);
  assert.equal(result?.variants[0]?.lesson.id, "variant-1");
});

test("generateScenePracticeSet 会生成基于来源 lesson 的练习集", async () => {
  const result = await generateScenePracticeSet({
    baseLesson,
    sourceLesson: variantLesson,
    deps: {
      mapLessonToParsedScene: (lesson) => ({ lessonId: lesson.id }) as never,
      practiceGenerateFromApi: async () => [
        {
          id: "exercise-1",
          prompt: "Prompt",
          answer: "Answer",
          choices: [],
          explanation: "",
          type: "translation",
        },
      ] as never,
      nowIso: () => "2026-03-22T00:00:00.000Z",
      createId: () => "practice-fixed",
    },
  });

  assert.equal(result.id, "practice-fixed");
  assert.equal(result.sourceType, "variant");
  assert.equal(result.sourceVariantId, "variant-1");
  assert.equal(result.exercises.length, 1);
});

test("generateSceneVariantSet 会生成稳定的变体集", async () => {
  const result = await generateSceneVariantSet({
    baseLesson,
    deps: {
      generateSceneVariantsFromApi: async () => [variantLesson],
      nowIso: () => "2026-03-22T00:00:00.000Z",
      createId: () => "variant-fixed",
    },
  });

  assert.equal(result.id, "variant-fixed");
  assert.equal(result.variants.length, 1);
  assert.equal(result.variants[0]?.lesson.id, "variant-1");
});

test("ensureSceneExpressionMapData 会在变体集未变化时复用缓存", async () => {
  const cachedExpressionMap = {
    version: "v1",
    sourceSceneId: "scene-1",
    clusters: [],
  } as any;
  const latestVariantSet = {
    id: "variant-set-1",
    sourceSceneId: "scene-1",
    sourceSceneTitle: "Scene 1",
    reusedChunks: [],
    variants: [],
    status: "generated",
    createdAt: "2026-03-22T00:00:00.000Z",
  } as never;

  const result = await ensureSceneExpressionMapData({
    baseLesson,
    latestVariantSet,
    cachedExpressionMap,
    cachedVariantSetId: "variant-set-1",
    deps: {
      generateExpressionMapFromApi: async () => {
        throw new Error("should not generate");
      },
    },
  });

  assert.deepEqual(result, {
    expressionMap: cachedExpressionMap,
    variantSetId: "variant-set-1",
    reused: true,
  });
});

test("ensureSceneExpressionMapData 会在缓存失效时重新生成表达地图", async () => {
  const latestVariantSet = {
    id: "variant-set-1",
    sourceSceneId: "scene-1",
    sourceSceneTitle: "Scene 1",
    reusedChunks: [],
    variants: [
      {
        id: "variant-item-1",
        lesson: variantLesson,
        status: "unviewed",
      },
    ],
    status: "generated",
    createdAt: "2026-03-22T00:00:00.000Z",
  } as never;

  const result = await ensureSceneExpressionMapData({
    baseLesson,
    latestVariantSet,
    cachedExpressionMap: null,
    cachedVariantSetId: null,
    deps: {
      generateExpressionMapFromApi: async () => ({
        version: "v1",
        sourceSceneId: "scene-1",
        clusters: [
          {
            id: "cluster-1",
            anchor: "How are you",
            meaning: "问候",
            expressions: ["How are you"],
            sourceSceneIds: ["scene-1"],
            nodes: [],
          },
        ],
      }),
    },
  });

  assert.equal(result?.reused, false);
  assert.equal(result?.variantSetId, "variant-set-1");
  assert.equal(result?.expressionMap.clusters.length, 1);
});
