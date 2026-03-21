import { SceneViewMode, estimateSceneLearningProgress } from "./scene-detail-page-logic";

export const resolveSceneNetworkStrategy = ({
  cacheFound,
  cacheExpired,
}: {
  cacheFound: boolean;
  cacheExpired: boolean;
}) => {
  if (!cacheFound) {
    return {
      shouldUseCacheFallback: false,
      shouldFetchNetwork: true,
    };
  }

  if (cacheExpired) {
    return {
      shouldUseCacheFallback: true,
      shouldFetchNetwork: true,
    };
  }

  return {
    shouldUseCacheFallback: true,
    shouldFetchNetwork: false,
  };
};

export const shouldFlushSceneLearningDelta = ({
  hasBaseLesson,
  learningStarted,
  studySecondsDelta,
  withPause,
}: {
  hasBaseLesson: boolean;
  learningStarted: boolean;
  studySecondsDelta: number;
  withPause: boolean;
}) => {
  if (!hasBaseLesson || !learningStarted) return false;
  if (withPause) return true;
  return studySecondsDelta > 0;
};

export const buildSceneLearningUpdatePayload = ({
  viewMode,
  activeVariantId,
  withPause = false,
}: {
  viewMode: SceneViewMode;
  activeVariantId?: string | null;
  withPause?: boolean;
}) => ({
  progressPercent: estimateSceneLearningProgress(viewMode),
  lastVariantIndex: viewMode === "variant-study" && activeVariantId ? 1 : undefined,
  withPause,
});
