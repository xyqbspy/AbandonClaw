import { mapLessonToParsedScene } from "@/lib/adapters/scene-parser-adapter";
import { buildExerciseSpecsFromScene } from "@/lib/server/exercises/spec-builder";
import { Lesson } from "@/lib/types";
import { PracticeSet, VariantSet } from "@/lib/types/learning-flow";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import { generateExpressionMapFromApi } from "@/lib/utils/expression-map-api";
import { practiceGenerateFromApi } from "@/lib/utils/practice-generate-api";
import { normalizePracticeExercisesForScene } from "@/lib/shared/scene-practice-exercises";
import {
  generateSceneVariantsFromApi,
  getSceneVariantsFromApi,
} from "@/lib/utils/scenes-api";

import { shouldReuseExpressionMapCache } from "./scene-detail-controller";
import { buildPracticeSet, buildVariantSet, createGeneratedId } from "./scene-detail-actions";
import { buildReusedChunks } from "./scene-detail-logic";

const MIN_SCENE_CLOZE_EXERCISES = 5;
const MAX_SCENE_CLOZE_EXERCISES = 8;

const countSceneSentences = (
  scene: Pick<ReturnType<typeof mapLessonToParsedScene>, "sections">,
) =>
  scene.sections.reduce(
    (count, section) =>
      count + section.blocks.reduce((blockCount, block) => blockCount + block.sentences.length, 0),
    0,
  );

const getClozeTargetCount = (scene: Pick<ReturnType<typeof mapLessonToParsedScene>, "sections">) =>
  Math.min(
    MAX_SCENE_CLOZE_EXERCISES,
    Math.max(MIN_SCENE_CLOZE_EXERCISES, countSceneSentences(scene)),
  );

const toExerciseDedupKey = (exercise: ReturnType<typeof normalizePracticeExercisesForScene>[number]) =>
  [
    exercise.sentenceId ?? "",
    exercise.chunkId ?? "",
  ].join("::");

const ensureSceneClozeCoverage = ({
  parsedScene,
  normalizedExercises,
}: {
  parsedScene: ReturnType<typeof mapLessonToParsedScene>;
  normalizedExercises: ReturnType<typeof normalizePracticeExercisesForScene>;
}) => {
  const targetCount = getClozeTargetCount(parsedScene);
  const clozeExercises = normalizedExercises.filter((exercise) => exercise.type === "chunk_cloze");
  if (clozeExercises.length >= targetCount) {
    return clozeExercises;
  }

  const fallbackExercises = normalizePracticeExercisesForScene(
    parsedScene,
    buildExerciseSpecsFromScene(parsedScene, targetCount),
  ).filter((exercise) => exercise.type === "chunk_cloze");

  const merged: typeof clozeExercises = [];
  const seen = new Set<string>();

  for (const exercise of [...clozeExercises, ...fallbackExercises]) {
    const key = toExerciseDedupKey(exercise);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(exercise);
    if (merged.length >= targetCount) break;
  }

  return merged;
};

export const syncSceneVariantsFromDb = async ({
  baseLesson,
  hasExistingVariantSet,
  deps,
}: {
  baseLesson: Lesson;
  hasExistingVariantSet: boolean;
  deps?: {
    getSceneVariantsFromApi?: typeof getSceneVariantsFromApi;
    nowIso?: () => string;
  };
}): Promise<VariantSet | null> => {
  if (hasExistingVariantSet) return null;

  const variants = await (deps?.getSceneVariantsFromApi ?? getSceneVariantsFromApi)(
    baseLesson.slug,
  );
  if (variants.length === 0) return null;

  return buildVariantSet({
    baseLesson,
    variants,
    reusedChunks: buildReusedChunks(baseLesson),
    nowIso: deps?.nowIso?.() ?? new Date().toISOString(),
    createId: () => `db-variant-${baseLesson.id}`,
  });
};

export const generateScenePracticeSet = async ({
  baseLesson,
  sourceLesson,
  requestPolicy = "manual",
  deps,
}: {
  baseLesson: Lesson;
  sourceLesson: Lesson;
  requestPolicy?: "manual" | "auto";
  deps?: {
    mapLessonToParsedScene?: typeof mapLessonToParsedScene;
    practiceGenerateFromApi?: typeof practiceGenerateFromApi;
    nowIso?: () => string;
    createId?: typeof createGeneratedId;
  };
}): Promise<PracticeSet> => {
  const parsedScene = (deps?.mapLessonToParsedScene ?? mapLessonToParsedScene)(sourceLesson);
  const generatedResult = await (deps?.practiceGenerateFromApi ?? practiceGenerateFromApi)({
    scene: parsedScene,
    exerciseCount: 8,
  }, {
    bypassFailureGuard: requestPolicy === "manual",
  });
  const normalizedExercises = normalizePracticeExercisesForScene(parsedScene, generatedResult.exercises);
  const clozeExercises = ensureSceneClozeCoverage({
    parsedScene,
    normalizedExercises,
  });
  const exercises =
    clozeExercises.length > 0
      ? clozeExercises
      : buildExerciseSpecsFromScene(parsedScene, getClozeTargetCount(parsedScene));

  return buildPracticeSet({
    baseLesson,
    sourceLesson,
    generationSource: generatedResult.generationSource,
    exercises,
    nowIso: deps?.nowIso?.() ?? new Date().toISOString(),
    createId: deps?.createId ?? createGeneratedId,
  });
};

export const generateSceneVariantSet = async ({
  baseLesson,
  deps,
}: {
  baseLesson: Lesson;
  deps?: {
    generateSceneVariantsFromApi?: typeof generateSceneVariantsFromApi;
    nowIso?: () => string;
    createId?: typeof createGeneratedId;
  };
}): Promise<VariantSet> => {
  const variants = await (deps?.generateSceneVariantsFromApi ?? generateSceneVariantsFromApi)({
    sceneSlug: baseLesson.slug,
    variantCount: 3,
    retainChunkRatio: 0.6,
  });

  return buildVariantSet({
    baseLesson,
    variants,
    reusedChunks: buildReusedChunks(baseLesson),
    nowIso: deps?.nowIso?.() ?? new Date().toISOString(),
    createId: deps?.createId ?? createGeneratedId,
  });
};

export const ensureSceneExpressionMapData = async ({
  baseLesson,
  latestVariantSet,
  cachedExpressionMap,
  cachedVariantSetId,
  deps,
}: {
  baseLesson: Lesson | null;
  latestVariantSet: VariantSet | null;
  cachedExpressionMap: ExpressionMapResponse | null;
  cachedVariantSetId: string | null;
  deps?: {
    generateExpressionMapFromApi?: typeof generateExpressionMapFromApi;
  };
}): Promise<{
  expressionMap: ExpressionMapResponse;
  variantSetId: string;
  reused: boolean;
} | null> => {
  if (!baseLesson || !latestVariantSet) return null;

  if (
    cachedExpressionMap &&
    shouldReuseExpressionMapCache({
      currentVariantSetId: latestVariantSet.id,
      cachedVariantSetId,
    })
  ) {
    return {
      expressionMap: cachedExpressionMap,
      variantSetId: latestVariantSet.id,
      reused: true,
    };
  }

  const response = await (deps?.generateExpressionMapFromApi ?? generateExpressionMapFromApi)({
    sourceSceneId: baseLesson.id,
    sourceSceneTitle: baseLesson.title,
    baseExpressions: buildReusedChunks(baseLesson, 50),
    variantExpressionSources: latestVariantSet.variants.map((variant) => ({
      sourceSceneId: variant.id,
      expressions: buildReusedChunks(variant.lesson, 50),
    })),
  });

  return {
    expressionMap: response,
    variantSetId: latestVariantSet.id,
    reused: false,
  };
};
