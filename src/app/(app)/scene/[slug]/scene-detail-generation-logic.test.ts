import assert from "node:assert/strict";
import test from "node:test";

import { Lesson } from "@/lib/types";

import {
  ensureSceneExpressionMapData,
  generateScenePracticeSet,
  generateSceneVariantSet,
  syncSceneVariantsFromDb,
} from "./scene-detail-generation-logic";

const baseLesson: Lesson = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sourceType: "custom",
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
                {
                  text: "How are you",
                  translation: "",
                  grammarLabel: "",
                  meaningInSentence: "",
                  usageNote: "",
                  examples: [],
                  start: 0,
                  end: 11,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  explanations: [],
};

const variantLesson: Lesson = {
  ...baseLesson,
  id: "variant-1",
  slug: "variant-1",
  title: "Variant 1",
  sourceType: "variant",
};

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
      mapLessonToParsedScene: (lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        type: "dialogue",
        sections: [],
      }),
      practiceGenerateFromApi: async () => [
        {
          id: "exercise-1",
          type: "chunk_cloze",
          inputMode: "typing",
          sceneId: variantLesson.id,
          sentenceId: "sentence-1",
          chunkId: "chunk-1",
          prompt: "Prompt",
          answer: {
            text: "How are you",
            acceptedAnswers: ["How are you"],
          },
          cloze: {
            displayText: "____?",
          },
        },
      ],
      nowIso: () => "2026-03-22T00:00:00.000Z",
      createId: () => "practice-fixed",
    },
  });

  assert.equal(result.id, "practice-fixed");
  assert.equal(result.sourceType, "variant");
  assert.equal(result.sourceVariantId, "variant-1");
  assert.equal(result.exercises.length, 1);
  assert.equal(result.exercises[0]?.type, "chunk_cloze");
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
    version: "v1" as const,
    sourceSceneId: "scene-1",
    clusters: [],
  };
  const latestVariantSet = {
    id: "variant-set-1",
    sourceSceneId: "scene-1",
    sourceSceneTitle: "Scene 1",
    reusedChunks: [],
    variants: [],
    status: "generated" as const,
    createdAt: "2026-03-22T00:00:00.000Z",
  };

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
        status: "unviewed" as const,
      },
    ],
    status: "generated" as const,
    createdAt: "2026-03-22T00:00:00.000Z",
  };

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

test("generateScenePracticeSet 会把 chunk_cloze 题面的挖空答案和判题答案自动对齐", async () => {
  const result = await generateScenePracticeSet({
    baseLesson,
    sourceLesson: variantLesson,
    deps: {
      mapLessonToParsedScene: () => ({
        id: variantLesson.id,
        slug: variantLesson.slug,
        title: variantLesson.title,
        type: "dialogue",
        sections: [
          {
            id: "section-1",
            blocks: [
              {
                id: "block-1",
                type: "dialogue",
                speaker: "A",
                sentences: [
                  {
                    id: "sentence-1",
                    text: "Don't burn yourself out.",
                    translation: "别把自己累垮了。",
                    chunks: [
                      {
                        id: "chunk-1",
                        key: "burn yourself out",
                        text: "burn yourself out",
                        start: 6,
                        end: 23,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      practiceGenerateFromApi: async () => [
        {
          id: "exercise-1",
          type: "chunk_cloze",
          inputMode: "typing",
          sceneId: variantLesson.id,
          sentenceId: "sentence-1",
          chunkId: "chunk-1",
          prompt: "补全句子中的表达",
          answer: {
            text: "burn yourself out",
            acceptedAnswers: ["burn yourself out"],
          },
          cloze: {
            displayText: "Don't ___ yourself out.",
          },
        },
      ],
      nowIso: () => "2026-03-22T00:00:00.000Z",
      createId: () => "practice-fixed",
    },
  });

  assert.equal(result.exercises[0]?.answer.text, "burn");
  assert.deepEqual(result.exercises[0]?.answer.acceptedAnswers, ["burn"]);
  assert.equal(result.exercises[0]?.metadata?.chunkText, "burn");
  assert.equal(result.exercises[0]?.prompt, "补全句子中的表达");
});

test("generateScenePracticeSet 会把填空练习模块收敛成纯 chunk_cloze", async () => {
  const result = await generateScenePracticeSet({
    baseLesson,
    sourceLesson: variantLesson,
    deps: {
      mapLessonToParsedScene: () => ({
        id: variantLesson.id,
        slug: variantLesson.slug,
        title: variantLesson.title,
        type: "dialogue",
        sections: [
          {
            id: "section-1",
            blocks: [
              {
                id: "block-1",
                type: "dialogue",
                speaker: "A",
                sentences: [
                  {
                    id: "sentence-1",
                    text: "Don't burn yourself out.",
                    translation: "别把自己累垮了。",
                    chunks: [
                      {
                        id: "chunk-1",
                        key: "burn yourself out",
                        text: "burn yourself out",
                        start: 6,
                        end: 23,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      practiceGenerateFromApi: async () => [
        {
          id: "exercise-1",
          type: "chunk_cloze",
          inputMode: "typing",
          sceneId: variantLesson.id,
          sentenceId: "sentence-1",
          chunkId: "chunk-1",
          prompt: "补全句子中的表达",
          answer: {
            text: "burn yourself out",
            acceptedAnswers: ["burn yourself out"],
          },
          cloze: {
            displayText: "Don't ___ yourself out.",
          },
        },
        {
          id: "exercise-2",
          type: "translation_prompt",
          inputMode: "typing",
          sceneId: variantLesson.id,
          sentenceId: "sentence-1",
          prompt: "看中文提示，完整复现这句",
          answer: {
            text: "Don't burn yourself out.",
          },
          cloze: {
            displayText: "别把自己累垮了。",
          },
        },
      ],
      nowIso: () => "2026-03-22T00:00:00.000Z",
      createId: () => "practice-fixed",
    },
  });

  assert.deepEqual(
    result.exercises.map((exercise) => exercise.type),
    ["chunk_cloze"],
  );
  assert.deepEqual(
    result.modules?.find((module) => module.mode === "cloze")?.exercises.map((exercise) => exercise.type),
    ["chunk_cloze"],
  );
});

test("generateScenePracticeSet 会在 AI 的 chunk_cloze 偏少时补足到按句子数收口的最少覆盖", async () => {
  const sentences = Array.from({ length: 6 }, (_, index) => ({
    id: `sentence-${index + 1}`,
    text: `I should call it a day ${index + 1}.`,
    translation: `我该收工了 ${index + 1}。`,
    chunks: [
      {
        id: `chunk-${index + 1}`,
        key: `call it a day ${index + 1}`,
        text: "call it a day",
        start: 9,
        end: 22,
      },
    ],
  }));

  const result = await generateScenePracticeSet({
    baseLesson,
    sourceLesson: variantLesson,
    deps: {
      mapLessonToParsedScene: () => ({
        id: variantLesson.id,
        slug: variantLesson.slug,
        title: variantLesson.title,
        type: "dialogue",
        sections: [
          {
            id: "section-1",
            blocks: [
              {
                id: "block-1",
                type: "dialogue",
                speaker: "A",
                sentences,
              },
            ],
          },
        ],
      }),
      practiceGenerateFromApi: async () => [
        {
          id: "exercise-1",
          type: "chunk_cloze",
          inputMode: "typing",
          sceneId: variantLesson.id,
          sentenceId: "sentence-1",
          chunkId: "chunk-1",
          prompt: "补全句子中的表达",
          answer: {
            text: "call it a day",
            acceptedAnswers: ["call it a day"],
          },
          cloze: {
            displayText: "I should ____ 1.",
          },
        },
        {
          id: "exercise-2",
          type: "chunk_cloze",
          inputMode: "typing",
          sceneId: variantLesson.id,
          sentenceId: "sentence-2",
          chunkId: "chunk-2",
          prompt: "补全句子中的表达",
          answer: {
            text: "call it a day",
            acceptedAnswers: ["call it a day"],
          },
          cloze: {
            displayText: "I should ____ 2.",
          },
        },
      ],
      nowIso: () => "2026-03-22T00:00:00.000Z",
      createId: () => "practice-fixed",
    },
  });

  assert.equal(result.exercises.length, 6);
  assert.equal(
    result.modules?.find((module) => module.mode === "cloze")?.exercises.length,
    6,
  );
});
