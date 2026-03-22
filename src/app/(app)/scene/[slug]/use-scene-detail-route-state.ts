import { useCallback, useEffect, useState } from "react";

import {
  buildSceneDetailHref,
  parseSceneDetailRouteState,
  SceneViewMode,
} from "./scene-detail-page-logic";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

type RouterLike = {
  push: (href: string, options?: { scroll?: boolean }) => void;
};

export const useSceneDetailRouteState = ({
  sceneSlug,
  searchParams,
  router,
  onRouteChange,
}: {
  sceneSlug: string;
  searchParams: SearchParamsLike;
  router: RouterLike;
  onRouteChange?: (routeState: {
    viewMode: SceneViewMode;
    activeVariantId: string | null;
  }) => void;
}) => {
  const routeState = parseSceneDetailRouteState(searchParams);
  const [viewMode, setViewMode] = useState<SceneViewMode>(routeState.viewMode);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    routeState.activeVariantId,
  );

  useEffect(() => {
    const nextRouteState = parseSceneDetailRouteState(searchParams);
    setViewMode(nextRouteState.viewMode);
    setActiveVariantId(nextRouteState.activeVariantId);
    onRouteChange?.(nextRouteState);
  }, [onRouteChange, sceneSlug, searchParams]);

  const setViewModeWithRoute = useCallback(
    (nextViewMode: SceneViewMode, variantId?: string | null) => {
      const href = buildSceneDetailHref({
        sceneSlug,
        searchParams,
        nextViewMode,
        variantId,
      });
      router.push(href, { scroll: false });
    },
    [router, sceneSlug, searchParams],
  );

  return {
    viewMode,
    setViewMode,
    activeVariantId,
    setActiveVariantId,
    setViewModeWithRoute,
  };
};
