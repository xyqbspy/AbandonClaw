import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import { useSceneDetailRouteState } from "./use-scene-detail-route-state";

afterEach(() => {
  cleanup();
});

test("useSceneDetailRouteState 会从 URL 回填视图状态，并在 state 变更时同步路由", async () => {
  let currentSearchParams = new URLSearchParams("view=variants");
  const pushes: string[] = [];
  const routeChanges: Array<{ viewMode: string; activeVariantId: string | null }> = [];

  const { result, rerender } = renderHook(() =>
    useSceneDetailRouteState({
      sceneSlug: "scene-a",
      searchParams: {
        get: (name: string) => currentSearchParams.get(name),
        toString: () => currentSearchParams.toString(),
      },
      router: {
        push: (href: string) => {
          pushes.push(href);
        },
      },
      onRouteChange: (routeState) => {
        routeChanges.push(routeState);
      },
    }),
  );

  await waitFor(() => {
    assert.equal(result.current.viewMode, "variants");
    assert.equal(result.current.activeVariantId, null);
  });

  currentSearchParams = new URLSearchParams("view=variant-study&variant=variant-2");
  rerender();

  await waitFor(() => {
    assert.equal(result.current.viewMode, "variant-study");
    assert.equal(result.current.activeVariantId, "variant-2");
  });

  act(() => {
    result.current.setViewModeWithRoute("expression-map");
  });

  assert.equal(pushes.at(-1), "/scene/scene-a?view=expression-map");
  assert.deepEqual(routeChanges.at(-1), {
    viewMode: "variant-study",
    activeVariantId: "variant-2",
  });
});
