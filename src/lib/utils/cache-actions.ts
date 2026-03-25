import { clearLearningDashboardCache } from "@/lib/cache/learning-dashboard-cache";
import { clearAllPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { clearAllReviewPageCache } from "@/lib/cache/review-page-cache";
import { clearSceneListCache } from "@/lib/cache/scene-list-cache";

const swallow = () => {
  // Non-blocking cache invalidation.
};

export const invalidateAfterPhraseMutation = () => {
  void Promise.all([
    clearLearningDashboardCache(),
    clearAllPhraseListCache(),
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
    clearSceneListCache(),
  ]).catch(swallow);
};

export const invalidateAfterScenePracticeMutation = () => {
  void Promise.all([
    clearLearningDashboardCache(),
    clearSceneListCache(),
    clearAllReviewPageCache(),
  ]).catch(swallow);
};
