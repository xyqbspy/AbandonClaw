import { generateScenePracticeSet, generateSceneVariantSet } from "@/app/(app)/scene/[slug]/scene-detail-generation-logic";
import { getSceneCache, setSceneCache } from "@/lib/cache/scene-cache";
import { Lesson } from "@/lib/types";
import { PracticeSet, VariantSet } from "@/lib/types/learning-flow";
import { SceneLearningProgressResponse } from "@/lib/utils/learning-api";
import { scheduleIdleAction, scheduleLessonAudioWarmup } from "@/lib/utils/resource-actions";
import { getSceneDetailBySlugFromApi } from "@/lib/utils/scenes-api";
import {
  getSceneGeneratedState,
  savePracticeSet,
  saveVariantSet,
} from "@/lib/utils/scene-learning-flow-storage";

type ContinueSceneStep = NonNullable<SceneLearningProgressResponse["session"]>["currentStep"] | null;

const loadSceneLesson = async (sceneSlug: string) => {
  const cache = await getSceneCache(sceneSlug).catch(() => null);
  if (cache?.found && cache.record) {
    return cache.record.data;
  }

  const lesson = await getSceneDetailBySlugFromApi(sceneSlug);
  void setSceneCache(sceneSlug, lesson).catch(() => {
    // Non-blocking cache write.
  });
  return lesson;
};

const resolvePracticeSourceLesson = ({
  baseLesson,
  latestVariantSet,
  practiceSet,
}: {
  baseLesson: Lesson;
  latestVariantSet: VariantSet | null;
  practiceSet: PracticeSet;
}) => {
  if (practiceSet.sourceType !== "variant") {
    return baseLesson;
  }

  return (
    latestVariantSet?.variants.find(
      (variant) =>
        variant.id === practiceSet.sourceVariantId ||
        variant.lesson.id === practiceSet.sourceVariantId,
    )?.lesson ?? baseLesson
  );
};

export const warmupRepeatPracticeResources = (params: {
  baseLesson: Lesson;
  latestVariantSet: VariantSet | null;
  practiceSet: PracticeSet;
}) => {
  const sourceLesson = resolvePracticeSourceLesson(params);
  scheduleLessonAudioWarmup(sourceLesson, {
    sentenceLimit: 2,
    chunkLimit: 2,
    key: `repeat-practice-audio:${params.practiceSet.id}:${sourceLesson.id}`,
  });
};

export const warmupRepeatVariantResources = (params: {
  baseLesson: Lesson;
  variantSet: VariantSet;
}) => {
  scheduleLessonAudioWarmup(params.baseLesson, {
    sentenceLimit: 2,
    chunkLimit: 2,
    key: `repeat-variant-source-audio:${params.variantSet.id}:${params.baseLesson.id}`,
  });

  const firstVariantLesson = params.variantSet.variants[0]?.lesson;
  if (!firstVariantLesson) return;

  scheduleLessonAudioWarmup(firstVariantLesson, {
    sentenceLimit: 2,
    chunkLimit: 2,
    key: `repeat-variant-target-audio:${params.variantSet.id}:${firstVariantLesson.id}`,
  });
};

export const warmupContinueLearningScene = (params: {
  sceneSlug: string;
  currentStep?: ContinueSceneStep;
}) => {
  const sceneSlug = params.sceneSlug.trim();
  if (!sceneSlug) return false;

  return scheduleIdleAction(`continue-scene:${sceneSlug}:${params.currentStep ?? "none"}`, () => {
    void (async () => {
      const lesson = await loadSceneLesson(sceneSlug);

      scheduleLessonAudioWarmup(lesson, {
        sentenceLimit: 2,
        chunkLimit: 2,
      });

      const generatedState = getSceneGeneratedState(lesson.id);

      if (
        (params.currentStep === "practice_sentence" || params.currentStep === "scene_practice") &&
        generatedState.practiceStatus === "idle"
      ) {
        const practiceSet = await generateScenePracticeSet({
          baseLesson: lesson,
          sourceLesson: lesson,
        });
        savePracticeSet(practiceSet);
      }

      if (
        (params.currentStep === "scene_practice" || params.currentStep === "done") &&
        generatedState.variantStatus === "idle"
      ) {
        const variantSet = await generateSceneVariantSet({
          baseLesson: lesson,
        });
        saveVariantSet(variantSet);
      }
    })().catch(() => {
      // Keep continue warmup non-blocking.
    });
  });
};
