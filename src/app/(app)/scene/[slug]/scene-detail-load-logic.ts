import { buildScenePrefetchCandidates } from "./scene-detail-page-logic";

export const resolveSceneCachePresentation = ({
  cacheFound,
  cacheExpired,
}: {
  cacheFound: boolean;
  cacheExpired: boolean;
}) => {
  if (!cacheFound) {
    return {
      hasCacheFallback: false,
      cacheFresh: false,
      shouldHydrateFromCache: false,
      nextDataSource: "none" as const,
      shouldStopLoading: false,
      shouldFetchNetwork: true,
    };
  }

  if (cacheExpired) {
    return {
      hasCacheFallback: true,
      cacheFresh: false,
      shouldHydrateFromCache: true,
      nextDataSource: "cache" as const,
      shouldStopLoading: true,
      shouldFetchNetwork: true,
    };
  }

  return {
    hasCacheFallback: true,
    cacheFresh: true,
    shouldHydrateFromCache: true,
    nextDataSource: "cache" as const,
    shouldStopLoading: true,
    shouldFetchNetwork: false,
  };
};

export const buildScenePrefetchPlan = ({
  requestSlug,
  sceneSlugs,
  recentCacheKeys,
  extractSlugFromSceneCacheKey,
  limit = 2,
}: {
  requestSlug: string;
  sceneSlugs: string[];
  recentCacheKeys: string[];
  extractSlugFromSceneCacheKey: (key: string) => string;
  limit?: number;
}) => {
  return buildScenePrefetchCandidates({
    requestSlug,
    sceneSlugs,
    recentCacheKeys,
    extractSlugFromSceneCacheKey,
    limit,
  });
};

export const resolveSceneNetworkFailure = ({
  hasCacheFallback,
  error,
}: {
  hasCacheFallback: boolean;
  error: unknown;
}) => {
  if (hasCacheFallback) {
    return {
      shouldClearLesson: false,
      shouldStopLoading: false,
      message: null,
    };
  }

  return {
    shouldClearLesson: true,
    shouldStopLoading: true,
    message: error instanceof Error ? error.message : "加载场景失败。",
  };
};
