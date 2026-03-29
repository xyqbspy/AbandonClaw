import { clearLearningDashboardCache } from "@/lib/cache/learning-dashboard-cache";
import { clearAllChunksRuntimeCache } from "@/lib/cache/chunks-runtime-cache";
import { clearAllPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { clearAllReviewPageCache } from "@/lib/cache/review-page-cache";
import { clearAllSceneRuntimeCache } from "@/lib/cache/scene-runtime-cache";

const swallow = () => {
  // Non-blocking cache invalidation.
};

export const invalidateAfterPhraseMutation = () => {
  void Promise.all([
    clearLearningDashboardCache(),
    clearAllPhraseListCache(),
    clearAllChunksRuntimeCache(),
    clearAllSceneRuntimeCache(),
  ]).catch(swallow);
};

export const invalidateAfterReviewMutation = () => {
  void Promise.all([
    clearLearningDashboardCache(),
    clearAllPhraseListCache(),
    clearAllReviewPageCache(),
  ]).catch(swallow);
};

export const invalidateAfterSceneLearningMutation = () => {
  void Promise.all([
    clearLearningDashboardCache(),
  ]).catch(swallow);
};

export const invalidateAfterScenePracticeMutation = () => {
  void Promise.all([
    clearLearningDashboardCache(),
    clearAllReviewPageCache(),
  ]).catch(swallow);
};
