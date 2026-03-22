import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import { useChunksRouteState } from "./use-chunks-route-state";

afterEach(() => {
  cleanup();
});

test("useChunksRouteState 会从 URL 回填 query/filter，并在本地状态变更时 replace", async () => {
  let currentSearchParams = new URLSearchParams(
    "query=burned%20out&review=reviewing&content=sentence&cluster=cluster-1",
  );
  const replacedHrefs: string[] = [];

  const { result, rerender } = renderHook(() =>
    useChunksRouteState({
      searchParams: {
        get: (name: string) => currentSearchParams.get(name),
        toString: () => currentSearchParams.toString(),
      },
      router: {
        replace: (href: string) => {
          replacedHrefs.push(href);
        },
      },
    }),
  );

  await waitFor(() => {
    assert.equal(result.current.query, "burned out");
    assert.equal(result.current.reviewFilter, "reviewing");
    assert.equal(result.current.contentFilter, "sentence");
    assert.equal(result.current.expressionClusterFilterId, "cluster-1");
  });

  act(() => {
    result.current.setQuery(" wrap up ");
  });

  await waitFor(() => {
    assert.equal(
      replacedHrefs.at(-1),
      "/chunks?query=wrap+up&review=reviewing&content=sentence&cluster=cluster-1",
    );
  });

  currentSearchParams = new URLSearchParams("query=call%20it%20a%20day&cluster=cluster-2");
  rerender();

  await waitFor(() => {
    assert.equal(result.current.query, "call it a day");
    assert.equal(result.current.reviewFilter, "all");
    assert.equal(result.current.contentFilter, "expression");
    assert.equal(result.current.expressionClusterFilterId, "cluster-2");
  });
});

test("useChunksRouteState 在状态与 URL 一致时不会重复 replace", async () => {
  const replacedHrefs: string[] = [];

  renderHook(() =>
    useChunksRouteState({
      searchParams: new URLSearchParams("query=burned+out&review=reviewing"),
      router: {
        replace: (href: string) => {
          replacedHrefs.push(href);
        },
      },
    }),
  );

  await Promise.resolve();
  assert.deepEqual(replacedHrefs, []);
});
