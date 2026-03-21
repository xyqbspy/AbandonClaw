import { PhraseReviewStatus, UserPhraseItemResponse } from "@/lib/utils/phrases-api";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

export type ChunksContentFilter = "expression" | "sentence";
export type ChunksReviewFilter = PhraseReviewStatus | "all";

const isChunksReviewFilter = (value: string): value is ChunksReviewFilter =>
  value === "all" ||
  value === "saved" ||
  value === "reviewing" ||
  value === "mastered" ||
  value === "archived";

const isChunksContentFilter = (value: string): value is ChunksContentFilter =>
  value === "expression" || value === "sentence";

export const getClusterIdFromSearchParams = (searchParams: SearchParamsLike) =>
  searchParams.get("cluster")?.trim() ?? "";

export const parseChunksRouteState = (searchParams: SearchParamsLike) => {
  const routeQuery = searchParams.get("query")?.trim() ?? "";
  const reviewParam = searchParams.get("review")?.trim() ?? "";
  const contentParam = searchParams.get("content")?.trim() ?? "";

  return {
    query: routeQuery,
    reviewFilter: isChunksReviewFilter(reviewParam) ? reviewParam : ("all" as ChunksReviewFilter),
    contentFilter: isChunksContentFilter(contentParam)
      ? contentParam
      : ("expression" as ChunksContentFilter),
    clusterId: getClusterIdFromSearchParams(searchParams),
  };
};

export const buildChunksRouteHref = ({
  searchParams,
  query,
  reviewFilter,
  contentFilter,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  query: string;
  reviewFilter: ChunksReviewFilter;
  contentFilter: ChunksContentFilter;
  clusterId: string;
}) => {
  const nextParams = new URLSearchParams(searchParams.toString());
  const normalizedQuery = query.trim();
  const normalizedClusterId = clusterId.trim();

  if (normalizedQuery) nextParams.set("query", normalizedQuery);
  else nextParams.delete("query");

  if (reviewFilter !== "all") nextParams.set("review", reviewFilter);
  else nextParams.delete("review");

  if (contentFilter !== "expression") nextParams.set("content", contentFilter);
  else nextParams.delete("content");

  if (normalizedClusterId) nextParams.set("cluster", normalizedClusterId);
  else nextParams.delete("cluster");

  const suffix = nextParams.toString();
  return `/chunks${suffix ? `?${suffix}` : ""}`;
};

export const shouldReplaceChunksRoute = ({
  searchParams,
  query,
  reviewFilter,
  contentFilter,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  query: string;
  reviewFilter: ChunksReviewFilter;
  contentFilter: ChunksContentFilter;
  clusterId: string;
}) => {
  const nextHref = buildChunksRouteHref({
    searchParams,
    query,
    reviewFilter,
    contentFilter,
    clusterId,
  });
  const currentQuery = searchParams.toString();
  const currentHref = `/chunks${currentQuery ? `?${currentQuery}` : ""}`;
  return {
    nextHref,
    shouldReplace: nextHref !== currentHref,
  };
};

export const buildChunksHref = ({
  searchParams,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  clusterId: string;
}) => {
  return buildChunksRouteHref({
    searchParams,
    query: searchParams.get("query")?.trim() ?? "",
    reviewFilter: isChunksReviewFilter(searchParams.get("review")?.trim() ?? "")
      ? (searchParams.get("review")?.trim() as ChunksReviewFilter)
      : "all",
    contentFilter: isChunksContentFilter(searchParams.get("content")?.trim() ?? "")
      ? (searchParams.get("content")?.trim() as ChunksContentFilter)
      : "expression",
    clusterId,
  });
};

export const buildClusterFilterChange = ({
  searchParams,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  clusterId: string;
}) => {
  const nextClusterId = clusterId.trim();
  return {
    nextClusterId,
    nextHref: buildChunksHref({
      searchParams,
      clusterId: nextClusterId,
    }),
    shouldResetFilters: nextClusterId.length > 0,
  };
};

export const buildChunksSummary = ({
  loading,
  total,
  labels,
}: {
  loading: boolean;
  total: number;
  labels: {
    loading: string;
    total: string;
    items: string;
  };
}) => {
  if (loading) return labels.loading;
  return `${labels.total} ${total} ${labels.items}`;
};

export const resolveClusterFilterExpressionLabel = ({
  expressionClusterFilterId,
  phrases,
}: {
  expressionClusterFilterId: string;
  phrases: UserPhraseItemResponse[];
}) => {
  if (!expressionClusterFilterId) return "";
  const row = phrases.find(
    (item) =>
      item.learningItemType === "expression" &&
      item.expressionClusterId === expressionClusterFilterId,
  );
  return row?.text ?? "";
};

export const resolveFocusExpressionId = ({
  contentFilter,
  focusExpressionId,
  focusMainExpressionIds,
  resolveFocusMainExpressionId,
}: {
  contentFilter: ChunksContentFilter;
  focusExpressionId: string;
  focusMainExpressionIds: string[];
  resolveFocusMainExpressionId: (userPhraseId: string) => string;
}) => {
  if (contentFilter !== "expression" || focusMainExpressionIds.length === 0) {
    return "";
  }

  const resolvedId = focusExpressionId
    ? resolveFocusMainExpressionId(focusExpressionId)
    : "";

  if (!resolvedId || !focusMainExpressionIds.includes(resolvedId)) {
    return focusMainExpressionIds[0] ?? "";
  }

  return resolvedId;
};
