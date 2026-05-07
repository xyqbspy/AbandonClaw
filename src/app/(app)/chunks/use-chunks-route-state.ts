import { useEffect, useState } from "react";

import { PhraseReviewStatus } from "@/lib/utils/phrases-api";

import { parseChunksRouteState, shouldReplaceChunksRoute } from "./chunks-page-logic";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

type RouterLike = {
  replace: (href: string) => void;
};

export const useChunksRouteState = ({
  searchParams,
  router,
}: {
  searchParams: SearchParamsLike;
  router: RouterLike;
}) => {
  const routeState = parseChunksRouteState(searchParams);
  const [query, setQuery] = useState(routeState.query);
  const [reviewFilter, setReviewFilter] = useState<PhraseReviewStatus | "all">(
    routeState.reviewFilter,
  );
  const [contentFilter, setContentFilter] = useState<"expression" | "sentence">(
    routeState.contentFilter,
  );
  const [expressionClusterFilterId, setExpressionClusterFilterId] = useState<string>(
    routeState.clusterId,
  );

  useEffect(() => {
    const nextRouteState = parseChunksRouteState(searchParams);
    /* eslint-disable react-hooks/set-state-in-effect -- URL search params are the external source for the local filter controls. */
    setQuery(nextRouteState.query);
    setReviewFilter(nextRouteState.reviewFilter);
    setContentFilter(nextRouteState.contentFilter);
    setExpressionClusterFilterId(nextRouteState.clusterId);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams]);

  useEffect(() => {
    const routeUpdate = shouldReplaceChunksRoute({
      searchParams,
      query,
      reviewFilter,
      contentFilter,
      clusterId: expressionClusterFilterId,
    });
    if (!routeUpdate.shouldReplace) return;
    router.replace(routeUpdate.nextHref);
  }, [contentFilter, expressionClusterFilterId, query, reviewFilter, router, searchParams]);

  return {
    routeState,
    query,
    setQuery,
    reviewFilter,
    setReviewFilter,
    contentFilter,
    setContentFilter,
    expressionClusterFilterId,
    setExpressionClusterFilterId,
  };
};
