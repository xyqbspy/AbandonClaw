import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChunksListRequestParams,
  resolveChunksCachePresentation,
  resolveChunksNetworkFailure,
} from "./chunks-page-load-logic";

test("buildChunksListRequestParams 会规范化 query 和 cluster 请求参数", () => {
  assert.deepEqual(
    buildChunksListRequestParams({
      query: " burned out ",
      reviewFilter: "reviewing",
      contentFilter: "sentence",
      expressionClusterFilterId: "cluster-1",
    }),
    {
      query: "burned out",
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: "reviewing",
      learningItemType: "sentence",
      expressionClusterId: "cluster-1",
    },
  );

  assert.deepEqual(
    buildChunksListRequestParams({
      query: "",
      reviewFilter: "all",
      contentFilter: "expression",
      expressionClusterFilterId: "",
    }),
    {
      query: "",
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: "all",
      learningItemType: "expression",
      expressionClusterId: undefined,
    },
  );
});

test("resolveChunksCachePresentation 会区分命中缓存与未命中", () => {
  assert.deepEqual(
    resolveChunksCachePresentation({ cacheFound: false }),
    {
      hasCacheFallback: false,
      nextDataSource: "none",
      shouldStopLoading: false,
    },
  );

  assert.deepEqual(
    resolveChunksCachePresentation({ cacheFound: true }),
    {
      hasCacheFallback: true,
      nextDataSource: "cache",
      shouldStopLoading: true,
    },
  );
});

test("resolveChunksNetworkFailure 只在没有缓存回退时清空列表并提示错误", () => {
  assert.deepEqual(
    resolveChunksNetworkFailure({
      hasCacheFallback: true,
      error: new Error("boom"),
    }),
    {
      shouldClearRows: false,
      shouldStopLoading: false,
      message: null,
    },
  );

  assert.deepEqual(
    resolveChunksNetworkFailure({
      hasCacheFallback: false,
      error: new Error("boom"),
    }),
    {
      shouldClearRows: true,
      shouldStopLoading: true,
      message: "boom",
    },
  );
});
