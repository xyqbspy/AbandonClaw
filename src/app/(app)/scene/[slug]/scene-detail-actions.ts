import { Lesson } from "@/lib/types";
import { PracticeExercise } from "@/lib/types/scene-parser";
import { PracticeSet, VariantSet } from "@/lib/types/learning-flow";

export const createGeneratedId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const buildPracticeSet = ({
  baseLesson,
  sourceLesson,
  exercises,
  nowIso,
  createId = createGeneratedId,
}: {
  baseLesson: Lesson;
  sourceLesson: Lesson;
  exercises: PracticeExercise[];
  nowIso: string;
  createId?: (prefix: string) => string;
}): PracticeSet => {
  const isVariantSource = sourceLesson.sourceType === "variant";

  return {
    id: createId("practice"),
    sourceSceneId: baseLesson.id,
    sourceSceneTitle: baseLesson.title,
    sourceType: isVariantSource ? "variant" : "original",
    sourceVariantId: isVariantSource ? sourceLesson.id : undefined,
    sourceVariantTitle: isVariantSource ? sourceLesson.title : undefined,
    exercises,
    status: "generated",
    createdAt: nowIso,
  };
};

export const buildVariantSet = ({
  baseLesson,
  variants,
  reusedChunks,
  nowIso,
  createId = createGeneratedId,
}: {
  baseLesson: Lesson;
  variants: Lesson[];
  reusedChunks: string[];
  nowIso: string;
  createId?: (prefix: string) => string;
}): VariantSet => ({
  id: createId("variant"),
  sourceSceneId: baseLesson.id,
  sourceSceneTitle: baseLesson.title,
  reusedChunks,
  variants: variants.map((lesson, index) => ({
    id: `${lesson.id}-${index + 1}`,
    lesson,
    status: "unviewed",
  })),
  status: "generated",
  createdAt: nowIso,
});
