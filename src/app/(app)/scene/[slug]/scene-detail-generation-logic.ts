import { mapLessonToParsedScene } from "@/lib/adapters/scene-parser-adapter";
import { Lesson } from "@/lib/types";
import { PracticeSet, VariantSet } from "@/lib/types/learning-flow";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import { generateExpressionMapFromApi } from "@/lib/utils/expression-map-api";
import { practiceGenerateFromApi } from "@/lib/utils/practice-generate-api";
import {
  generateSceneVariantsFromApi,
  getSceneVariantsFromApi,
} from "@/lib/utils/scenes-api";

import { shouldReuseExpressionMapCache } from "./scene-detail-controller";
import { buildPracticeSet, buildVariantSet, createGeneratedId } from "./scene-detail-actions";
import { buildReusedChunks } from "./scene-detail-logic";

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
  deps,
}: {
  baseLesson: Lesson;
  sourceLesson: Lesson;
  deps?: {
    mapLessonToParsedScene?: typeof mapLessonToParsedScene;
    practiceGenerateFromApi?: typeof practiceGenerateFromApi;
    nowIso?: () => string;
    createId?: typeof createGeneratedId;
  };
}): Promise<PracticeSet> => {
  const parsedScene = (deps?.mapLessonToParsedScene ?? mapLessonToParsedScene)(sourceLesson);
  const exercises = await (deps?.practiceGenerateFromApi ?? practiceGenerateFromApi)({
    scene: parsedScene,
    exerciseCount: 8,
  });

  return buildPracticeSet({
    baseLesson,
    sourceLesson,
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
