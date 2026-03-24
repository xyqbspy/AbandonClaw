import assert from "node:assert/strict";
import test from "node:test";
import { buildPracticeSet, buildVariantSet } from "./scene-detail-actions";
import { Lesson } from "@/lib/types";
import { PracticeExercise } from "@/lib/types/scene-parser";

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
  sections: overrides.sections ?? [],
  explanations: overrides.explanations ?? [],
  sourceType: overrides.sourceType,
});

const exercises: PracticeExercise[] = [
  {
    id: "exercise-1",
    type: "typing",
    inputMode: "typing",
    sceneId: "scene-a",
    sentenceId: "sentence-1",
    answer: { text: "call it a day" },
  },
];

test("buildPracticeSet 会按来源 lesson 正确生成 original/variant 练习集", () => {
  const baseLesson = createLesson({ id: "base-1", title: "Base Scene" });
  const variantLesson = createLesson({
    id: "variant-1",
    title: "Variant Scene",
    sourceType: "variant",
    sections: [
      {
        id: "section-1",
        blocks: [
          {
            id: "block-1",
            sentences: [
              {
                id: "sentence-1",
                text: "I think we should call it a day now.",
                translation: "我觉得我们现在该收工了。",
                chunks: ["call it a day"],
              },
            ],
          },
        ],
      },
    ],
  });

  const originalSet = buildPracticeSet({
    baseLesson,
    sourceLesson: baseLesson,
    exercises,
    nowIso: "2026-03-21T00:00:00.000Z",
    createId: () => "practice-fixed",
  });
  const variantSet = buildPracticeSet({
    baseLesson,
    sourceLesson: variantLesson,
    exercises,
    nowIso: "2026-03-21T00:00:00.000Z",
    createId: () => "practice-fixed",
  });

  assert.equal(originalSet.sourceType, "original");
  assert.equal(originalSet.sourceVariantId, undefined);
  assert.equal(variantSet.sourceType, "variant");
  assert.equal(variantSet.sourceVariantId, "variant-1");
  assert.equal(variantSet.sourceVariantTitle, "Variant Scene");
  assert.equal(variantSet.modules?.length, 4);
  assert.equal(variantSet.modules?.[0]?.mode, "cloze");
  assert.equal(variantSet.modules?.[1]?.mode, "guided_recall");
  assert.equal(variantSet.modules?.[2]?.mode, "sentence_recall");
  assert.equal(variantSet.modules?.[3]?.mode, "full_dictation");
});

test("buildVariantSet 会生成稳定的变体条目结构", () => {
  const baseLesson = createLesson({ id: "base-1", title: "Base Scene" });
  const variants = [
    createLesson({ id: "variant-1", title: "Variant 1" }),
    createLesson({ id: "variant-2", title: "Variant 2" }),
  ];

  const variantSet = buildVariantSet({
    baseLesson,
    variants,
    reusedChunks: ["call it a day", "burn out"],
    nowIso: "2026-03-21T00:00:00.000Z",
    createId: () => "variant-fixed",
  });

  assert.equal(variantSet.id, "variant-fixed");
  assert.deepEqual(
    variantSet.variants.map((item) => item.id),
    ["variant-1-1", "variant-2-2"],
  );
  assert.deepEqual(
    variantSet.variants.map((item) => item.status),
    ["unviewed", "unviewed"],
  );
  assert.deepEqual(variantSet.reusedChunks, ["call it a day", "burn out"]);
});
