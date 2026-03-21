import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

export const getClusterIdFromSearchParams = (searchParams: SearchParamsLike) =>
  searchParams.get("cluster")?.trim() ?? "";

export const buildChunksHref = ({
  searchParams,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  clusterId: string;
}) => {
  const nextParams = new URLSearchParams(searchParams.toString());
  const normalizedClusterId = clusterId.trim();
  if (normalizedClusterId) {
    nextParams.set("cluster", normalizedClusterId);
  } else {
    nextParams.delete("cluster");
  }
  const query = nextParams.toString();
  return `/chunks${query ? `?${query}` : ""}`;
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
  contentFilter: "expression" | "sentence";
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
