import { useCallback, useEffect, useRef, useState } from "react";

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
  const pendingRouteStateRef = useRef<{
    viewMode: SceneViewMode;
    activeVariantId: string | null;
  } | null>(null);
  const [viewMode, setViewMode] = useState<SceneViewMode>(routeState.viewMode);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    routeState.activeVariantId,
  );

  useEffect(() => {
    const nextRouteState = parseSceneDetailRouteState(searchParams);
    const pendingRouteState = pendingRouteStateRef.current;
    if (
      pendingRouteState &&
      (pendingRouteState.viewMode !== nextRouteState.viewMode ||
        pendingRouteState.activeVariantId !== nextRouteState.activeVariantId)
    ) {
      return;
    }
    pendingRouteStateRef.current = null;
    /* eslint-disable react-hooks/set-state-in-effect -- Route changes must hydrate the local scene view controls from URL state. */
    setViewMode(nextRouteState.viewMode);
    setActiveVariantId(nextRouteState.activeVariantId);
    /* eslint-enable react-hooks/set-state-in-effect */
    onRouteChange?.(nextRouteState);
  }, [onRouteChange, sceneSlug, searchParams]);

  const setViewModeWithRoute = useCallback(
    (nextViewMode: SceneViewMode, variantId?: string | null) => {
      const nextRouteState = {
        viewMode: nextViewMode,
        activeVariantId: variantId ?? null,
      };
      pendingRouteStateRef.current = nextRouteState;
      setViewMode(nextRouteState.viewMode);
      setActiveVariantId(nextRouteState.activeVariantId);
      onRouteChange?.(nextRouteState);
      const href = buildSceneDetailHref({
        sceneSlug,
        searchParams,
        nextViewMode,
        variantId,
      });
      router.push(href, { scroll: false });
    },
    [onRouteChange, router, sceneSlug, searchParams],
  );

  return {
    viewMode,
    setViewMode,
    activeVariantId,
    setActiveVariantId,
    setViewModeWithRoute,
  };
};
