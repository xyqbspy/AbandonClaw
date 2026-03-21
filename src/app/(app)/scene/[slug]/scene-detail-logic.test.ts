import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReusedChunks,
  collectLessonChunkTexts,
  extractSlugFromSceneCacheKey,
  findChunkContext,
  findSentenceForChunk,
  isSceneViewMode,
  toVariantStatusLabel,
  toVariantTitle,
} from "./scene-detail-logic";
import { Lesson, LessonSentence } from "@/lib/types";

const createSentence = (overrides: Partial<LessonSentence> = {}): LessonSentence => ({
  id: overrides.id ?? "sentence-1",
  text: overrides.text ?? "We should call it a day.",
  translation: overrides.translation ?? "我们今天先到这里。",
  chunks: overrides.chunks ?? [],
  speaker: overrides.speaker,
  audioText: overrides.audioText,
  tts: overrides.tts,
  chunkDetails: overrides.chunkDetails,
});

const createLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: overrides.id ?? "lesson-1",
  slug: overrides.slug ?? "scene-a",
  title: overrides.title ?? "Scene A",
  subtitle: overrides.subtitle,
  description: overrides.description,
  difficulty: overrides.difficulty ?? "Intermediate",
  estimatedMinutes: overrides.estimatedMinutes ?? 8,
  completionRate: overrides.completionRate ?? 0,
  tags: overrides.tags ?? [],
  sceneType: overrides.sceneType ?? "dialogue",
  sections: overrides.sections ?? [
    {
      id: "section-1",
      blocks: [
        {
          id: "block-1",
          sentences: [
            createSentence({
              id: "s1",
              text: "I should call it a day.",
              chunks: ["call it a day", "wrap up"],
            }),
            createSentence({
              id: "s2",
              text: "I'm burned out.",
              chunks: ["burned out"],
              chunkDetails: [
                {
                  text: "at least",
                  translation: "至少",
                  grammarLabel: "",
                  meaningInSentence: "",
                  usageNote: "",
                  examples: [],
                  start: 0,
                  end: 0,
                },
              ],
            }),
          ],
        },
      ],
    },
  ],
  explanations: overrides.explanations ?? [],
  sourceType: overrides.sourceType,
});

test("buildReusedChunks 会按出现顺序去重并限制数量", () => {
  const lesson = createLesson();

  assert.deepEqual(buildReusedChunks(lesson, 3), [
    "call it a day",
    "wrap up",
    "at least",
  ]);
});

test("collectLessonChunkTexts 会收集 chunk 和 chunkDetails 的规范化文本", () => {
  const lesson = createLesson();

  assert.deepEqual(collectLessonChunkTexts(lesson), [
    "call it a day",
    "wrap up",
    "burned out",
    "at least",
  ]);
});

test("findSentenceForChunk 和 findChunkContext 能在基础场景与变体中定位 chunk", () => {
  const baseLesson = createLesson({ id: "base-1", slug: "base-scene" });
  const variantLesson = createLesson({
    id: "variant-1",
    slug: "variant-scene",
    sections: [
      {
        id: "section-1",
        blocks: [
          {
            id: "block-1",
            sentences: [
              createSentence({
                id: "v1",
                text: "We can barely sleep.",
                chunks: ["barely slept"],
              }),
            ],
          },
        ],
      },
    ],
  });

  assert.equal(findSentenceForChunk(baseLesson, "call it a day")?.id, "s1");
  assert.equal(findSentenceForChunk(baseLesson, "at least")?.id, "s2");
  assert.equal(findSentenceForChunk(baseLesson, "missing")?.id, "s1");

  const context = findChunkContext("barely slept", baseLesson, [variantLesson]);
  assert.equal(context?.lesson.id, "variant-1");
  assert.equal(context?.sentence.id, "v1");
});

test("场景辅助文案 helper 会返回稳定结果", () => {
  assert.equal(isSceneViewMode("scene"), true);
  assert.equal(isSceneViewMode("expression-map"), true);
  assert.equal(isSceneViewMode("unknown"), false);
  assert.equal(toVariantStatusLabel("unviewed"), "未查看");
  assert.equal(toVariantStatusLabel("viewed"), "已查看");
  assert.equal(toVariantStatusLabel("completed"), "已完成");
  assert.equal(toVariantTitle("Office Small Talk (Variant 2)"), "Office Small Talk");
  assert.equal(toVariantTitle("点餐练习（变体 3）"), "点餐练习");
  assert.equal(extractSlugFromSceneCacheKey("scene:coffee-chat"), "coffee-chat");
  assert.equal(extractSlugFromSceneCacheKey("other:coffee-chat"), "");
});
