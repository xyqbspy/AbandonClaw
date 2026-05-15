import { clearLearningDashboardCache } from "@/lib/cache/learning-dashboard-cache";
import { clearAllChunksRuntimeCache } from "@/lib/cache/chunks-runtime-cache";
import { clearAllPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { clearAllReviewPageCache } from "@/lib/cache/review-page-cache";
import { clearAllSceneRuntimeCache } from "@/lib/cache/scene-runtime-cache";
import { clearSceneListCache } from "@/lib/cache/scene-list-cache";
import { clearIndexedDbCache } from "@/lib/cache/indexeddb";

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

/**
 * 切换账号或登出时调用：清掉所有客户端缓存（IndexedDB + 各 cache 模块的 memory map），
 * 避免下个账号读到上个账号留下的 dashboard / scene / phrase / review 数据。
 */
export const clearAllClientCache = async () => {
  await Promise.all([
    clearLearningDashboardCache(),
    clearAllPhraseListCache(),
    clearAllReviewPageCache(),
    clearAllChunksRuntimeCache(),
    clearAllSceneRuntimeCache(),
    clearSceneListCache(),
  ]).catch(swallow);
  await clearIndexedDbCache().catch(swallow);
};
