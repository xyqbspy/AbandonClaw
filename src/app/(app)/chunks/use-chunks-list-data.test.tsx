import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

import { useChunksListData } from "./use-chunks-list-data";

afterEach(() => {
  cleanup();
});

const rows = [
  {
    userPhraseId: "p1",
    phraseId: "phrase-1",
    text: "call it a day",
    normalizedText: "call it a day",
    translation: "今天先到这里",
    usageNote: null,
    difficulty: null,
    tags: [],
    sourceSceneSlug: null,
    sourceType: "manual",
    sourceNote: null,
    sourceSentenceIndex: null,
    sourceSentenceText: null,
    sourceChunkText: null,
    expressionClusterId: null,
    expressionClusterRole: null,
    expressionClusterMainUserPhraseId: null,
    aiEnrichmentStatus: null,
    semanticFocus: null,
    typicalScenario: null,
    exampleSentences: [],
    aiEnrichmentError: null,
    learningItemType: "expression",
    savedAt: "2026-03-21T00:00:00.000Z",
    lastSeenAt: "2026-03-21T00:00:00.000Z",
    reviewStatus: "saved",
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    masteredAt: null,
  },
] as any[];

test("useChunksListData 会先展示缓存，再被网络结果覆盖", async () => {
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const messages: string[] = [];
  const deps = {
    getPhraseListCache: async () => ({
      found: true,
      record: { data: { rows, total: 1 } },
    }),
    setPhraseListCache: async () => undefined,
    getMyPhrasesFromApi: async () => ({
      rows: [...rows, { ...rows[0], userPhraseId: "p2", phraseId: "phrase-2", text: "wrap up" }],
      total: 2,
    }),
    buildChunksListRequestParams: ({
      query,
      reviewFilter,
      contentFilter,
      expressionClusterFilterId,
    }: any) => ({
      query: query.trim(),
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: reviewFilter,
      learningItemType: contentFilter,
      expressionClusterId: expressionClusterFilterId || undefined,
    }),
    resolveChunksCachePresentation: ({ cacheFound }: { cacheFound: boolean }) => ({
      hasCacheFallback: cacheFound,
      nextDataSource: cacheFound ? ("cache" as const) : ("none" as const),
      shouldStopLoading: cacheFound,
    }),
    resolveChunksNetworkFailure: ({ error }: { error: unknown }) => ({
      shouldClearRows: true,
      shouldStopLoading: true,
      message: error instanceof Error ? error.message : "load failed",
    }),
    setTimeoutFn: (callback: () => void) => {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId as never;
    },
    clearTimeoutFn: (handle: number) => {
      timers.delete(handle);
    },
  };

  const { result } = renderHook(() =>
    useChunksListData({
      query: " burned out ",
      reviewFilter: "all",
      contentFilter: "expression",
      expressionClusterFilterId: "",
      onLoadFailed: (message) => messages.push(message),
      deps: deps as never,
    }),
  );

  Array.from(timers.values()).forEach((callback) => callback());

  await waitFor(() => {
    assert.equal(result.current.listDataSource, "network");
    assert.equal(result.current.total, 2);
    assert.equal(result.current.phrases.length, 2);
    assert.equal(result.current.loading, false);
  });
  assert.deepEqual(messages, []);
});

test("useChunksListData 会忽略旧请求的迟到回填", async () => {
  const pendingRequests: Array<{
    query: string;
    resolve: (value: { rows: any[]; total: number }) => void;
  }> = [];
  const deps = {
    getPhraseListCache: async () => ({ found: false, record: null }),
    setPhraseListCache: async () => undefined,
    getMyPhrasesFromApi: async ({ query }: { query: string }) =>
      await new Promise<{ rows: any[]; total: number }>((resolve) => {
        pendingRequests.push({ query, resolve });
      }),
    buildChunksListRequestParams: ({
      query,
      reviewFilter,
      contentFilter,
      expressionClusterFilterId,
    }: any) => ({
      query: query.trim(),
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: reviewFilter,
      learningItemType: contentFilter,
      expressionClusterId: expressionClusterFilterId || undefined,
    }),
    resolveChunksCachePresentation: ({ cacheFound }: { cacheFound: boolean }) => ({
      hasCacheFallback: cacheFound,
      nextDataSource: cacheFound ? ("cache" as const) : ("none" as const),
      shouldStopLoading: cacheFound,
    }),
    resolveChunksNetworkFailure: () => ({
      shouldClearRows: true,
      shouldStopLoading: true,
      message: "boom",
    }),
    setTimeoutFn: (callback: () => void) => window.setTimeout(callback, 1),
    clearTimeoutFn: (handle: number) => window.clearTimeout(handle),
  };

  const { result } = renderHook(() =>
    useChunksListData({
      query: "first",
      reviewFilter: "all",
      contentFilter: "expression",
      expressionClusterFilterId: "",
      deps: deps as never,
    }),
  );

  void result.current.loadPhrases("first", "all", "expression", "", {
    preferCache: false,
  });
  void result.current.loadPhrases("second", "all", "expression", "", {
    preferCache: false,
  });

  pendingRequests.find((item) => item.query === "first")?.resolve({
    rows,
    total: 1,
  });
  pendingRequests.find((item) => item.query === "second")?.resolve({
    rows: [{ ...rows[0], userPhraseId: "p2", phraseId: "phrase-2", text: "second" }],
    total: 1,
  });

  await waitFor(() => {
    assert.equal(result.current.phrases[0]?.text, "second");
    assert.equal(result.current.total, 1);
  });
});

test("useChunksListData 在无缓存且网络失败时会清空列表并上报错误", async () => {
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const messages: string[] = [];
  const deps = {
    getPhraseListCache: async () => ({ found: false, record: null }),
    setPhraseListCache: async () => undefined,
    getMyPhrasesFromApi: async () => {
      throw new Error("boom");
    },
    buildChunksListRequestParams: ({
      query,
      reviewFilter,
      contentFilter,
      expressionClusterFilterId,
    }: any) => ({
      query: query.trim(),
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: reviewFilter,
      learningItemType: contentFilter,
      expressionClusterId: expressionClusterFilterId || undefined,
    }),
    resolveChunksCachePresentation: ({ cacheFound }: { cacheFound: boolean }) => ({
      hasCacheFallback: cacheFound,
      nextDataSource: cacheFound ? ("cache" as const) : ("none" as const),
      shouldStopLoading: cacheFound,
    }),
    resolveChunksNetworkFailure: ({
      hasCacheFallback,
      error,
    }: {
      hasCacheFallback: boolean;
      error: unknown;
    }) => ({
      shouldClearRows: !hasCacheFallback,
      shouldStopLoading: !hasCacheFallback,
      message: error instanceof Error ? error.message : "load failed",
    }),
    setTimeoutFn: (callback: () => void) => {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId as never;
    },
    clearTimeoutFn: (handle: number) => {
      timers.delete(handle);
    },
  };

  const { result } = renderHook(() =>
    useChunksListData({
      query: "",
      reviewFilter: "all",
      contentFilter: "expression",
      expressionClusterFilterId: "",
      onLoadFailed: (message) => messages.push(message),
      deps: deps as never,
    }),
  );

  Array.from(timers.values()).forEach((callback) => callback());

  await waitFor(() => {
    assert.equal(result.current.loading, false);
    assert.equal(result.current.total, 0);
    assert.equal(result.current.phrases.length, 0);
  });
  assert.deepEqual(messages, ["boom"]);
});

test("useChunksListData 在 onLoadFailed 回调身份变化时不会重复自动请求", async () => {
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const requestedQueries: string[] = [];
  const deps = {
    getPhraseListCache: async () => ({ found: false, record: null }),
    setPhraseListCache: async () => undefined,
    getMyPhrasesFromApi: async ({ query }: { query: string }) => {
      requestedQueries.push(query);
      return { rows, total: 1 };
    },
    buildChunksListRequestParams: ({
      query,
      reviewFilter,
      contentFilter,
      expressionClusterFilterId,
    }: any) => ({
      query: query.trim(),
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: reviewFilter,
      learningItemType: contentFilter,
      expressionClusterId: expressionClusterFilterId || undefined,
    }),
    resolveChunksCachePresentation: ({ cacheFound }: { cacheFound: boolean }) => ({
      hasCacheFallback: cacheFound,
      nextDataSource: cacheFound ? ("cache" as const) : ("none" as const),
      shouldStopLoading: cacheFound,
    }),
    resolveChunksNetworkFailure: ({ error }: { error: unknown }) => ({
      shouldClearRows: true,
      shouldStopLoading: true,
      message: error instanceof Error ? error.message : "load failed",
    }),
    setTimeoutFn: (callback: () => void) => {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId as never;
    },
    clearTimeoutFn: (handle: number) => {
      timers.delete(handle);
    },
  };

  const { rerender } = renderHook(
    ({ onLoadFailed }: { onLoadFailed: (message: string) => void }) =>
      useChunksListData({
        query: "same",
        reviewFilter: "all",
        contentFilter: "expression",
        expressionClusterFilterId: "",
        onLoadFailed,
        deps: deps as never,
      }),
    {
      initialProps: { onLoadFailed: () => undefined },
    },
  );

  rerender({ onLoadFailed: () => undefined });

  assert.equal(timers.size, 1);
  Array.from(timers.values()).forEach((callback) => callback());

  await waitFor(() => {
    assert.deepEqual(requestedQueries, ["same"]);
  });
});
