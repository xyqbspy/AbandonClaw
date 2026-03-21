import { PhraseReviewStatus } from "@/lib/utils/phrases-api";

export type ChunksListRequestParams = {
  query: string;
  limit: number;
  page: number;
  status: "saved";
  reviewStatus: PhraseReviewStatus | "all";
  learningItemType: "expression" | "sentence";
  expressionClusterId?: string;
};

export const buildChunksListRequestParams = ({
  query,
  reviewFilter,
  contentFilter,
  expressionClusterFilterId,
}: {
  query: string;
  reviewFilter: PhraseReviewStatus | "all";
  contentFilter: "expression" | "sentence";
  expressionClusterFilterId: string;
}): ChunksListRequestParams => ({
  query: query.trim(),
  limit: 100,
  page: 1,
  status: "saved",
  reviewStatus: reviewFilter,
  learningItemType: contentFilter,
  expressionClusterId: expressionClusterFilterId || undefined,
});

export const resolveChunksCachePresentation = ({
  cacheFound,
}: {
  cacheFound: boolean;
}) => {
  if (!cacheFound) {
    return {
      hasCacheFallback: false,
      nextDataSource: "none" as const,
      shouldStopLoading: false,
    };
  }

  return {
    hasCacheFallback: true,
    nextDataSource: "cache" as const,
    shouldStopLoading: true,
  };
};

export const resolveChunksNetworkFailure = ({
  hasCacheFallback,
  error,
}: {
  hasCacheFallback: boolean;
  error: unknown;
}) => {
  if (hasCacheFallback) {
    return {
      shouldClearRows: false,
      shouldStopLoading: false,
      message: null,
    };
  }

  return {
    shouldClearRows: true,
    shouldStopLoading: true,
    message: error instanceof Error ? error.message : "加载表达失败。",
  };
};
