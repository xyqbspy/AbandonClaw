import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

import { useChunksListData } from "./use-chunks-list-data";
import { PhraseListCacheRecord } from "@/lib/cache/phrase-list-cache";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

afterEach(() => {
  cleanup();
});

type ChunksListDeps = NonNullable<Parameters<typeof useChunksListData>[0]["deps"]>;

const buildCacheRecord = (items: UserPhraseItemResponse[], total: number): PhraseListCacheRecord => ({
  schemaVersion: "phrase-list-cache-v6",
  key: "phrase-list:v6:saved:r=all:t=expression:c=:q=burned%20out:p=1:l=100",
  type: "phrase_list",
  query: "burned out",
  status: "saved",
  reviewStatus: "all",
  learningItemType: "expression",
  expressionClusterId: "",
  page: 1,
  limit: 100,
  data: {
    rows: items,
    total,
    page: 1,
    limit: 100,
  },
  cachedAt: 1,
  lastAccessedAt: 1,
  expiresAt: Date.now() + 60_000,
});

const rows: UserPhraseItemResponse[] = [
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
];

test("useChunksListData 会先展示缓存，再被网络结果覆盖", async () => {
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const messages: string[] = [];
  const deps: ChunksListDeps = {
    getPhraseListCache: async () => ({
      found: true,
      record: buildCacheRecord(rows, 1),
      isExpired: false,
    }),
    setPhraseListCache: async () => undefined,
    getMyPhrasesFromApi: async () => ({
      rows: [...rows, { ...rows[0], userPhraseId: "p2", phraseId: "phrase-2", text: "wrap up" }],
      total: 2,
      page: 1,
      limit: 100,
    }),
    buildChunksListRequestParams: ({ query, reviewFilter, contentFilter, expressionClusterFilterId }) => ({
      query: query.trim(),
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: reviewFilter,
      learningItemType: contentFilter,
      expressionClusterId: expressionClusterFilterId || undefined,
    }),
    resolveChunksCachePresentation: ({ cacheFound }) => ({
      hasCacheFallback: cacheFound,
      nextDataSource: cacheFound ? "cache" : "none",
      shouldStopLoading: cacheFound,
    }),
    resolveChunksNetworkFailure: ({ error }) => ({
      shouldClearRows: true,
      shouldStopLoading: true,
      message: error instanceof Error ? error.message : "load failed",
    }),
    setTimeoutFn: (callback: () => void) => {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimeoutFn: (handle) => {
      timers.delete(handle as number);
    },
  };

  const { result } = renderHook(() =>
    useChunksListData({
      query: " burned out ",
      reviewFilter: "all",
      contentFilter: "expression",
      expressionClusterFilterId: "",
      onLoadFailed: (message) => messages.push(message),
      deps,
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
    resolve: (value: { rows: UserPhraseItemResponse[]; total: number; page: number; limit: number }) => void;
  }> = [];
  const deps: ChunksListDeps = {
    getPhraseListCache: async () => ({ found: false, record: null, isExpired: false }),
    setPhraseListCache: async () => undefined,
    getMyPhrasesFromApi: async (params) =>
      await new Promise<{ rows: UserPhraseItemResponse[]; total: number; page: number; limit: number }>((resolve) => {
        pendingRequests.push({ query: params?.query ?? "", resolve });
      }),
    buildChunksListRequestParams: ({ query, reviewFilter, contentFilter, expressionClusterFilterId }) => ({
      query: query.trim(),
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: reviewFilter,
      learningItemType: contentFilter,
      expressionClusterId: expressionClusterFilterId || undefined,
    }),
    resolveChunksCachePresentation: ({ cacheFound }) => ({
      hasCacheFallback: cacheFound,
      nextDataSource: cacheFound ? "cache" : "none",
      shouldStopLoading: cacheFound,
    }),
    resolveChunksNetworkFailure: () => ({
      shouldClearRows: true,
      shouldStopLoading: true,
      message: "boom",
    }),
    setTimeoutFn: (callback: () => void) => window.setTimeout(callback, 1),
    clearTimeoutFn: (handle) => window.clearTimeout(handle),
  };

  const { result } = renderHook(() =>
    useChunksListData({
      query: "first",
      reviewFilter: "all",
      contentFilter: "expression",
      expressionClusterFilterId: "",
      deps,
    }),
  );

  void result.current.loadPhrases("first", "all", "expression", "", { preferCache: false });
  void result.current.loadPhrases("second", "all", "expression", "", { preferCache: false });

  pendingRequests.find((item) => item.query === "first")?.resolve({
    rows,
    total: 1,
    page: 1,
    limit: 100,
  });
  pendingRequests.find((item) => item.query === "second")?.resolve({
    rows: [{ ...rows[0], userPhraseId: "p2", phraseId: "phrase-2", text: "second" }],
    total: 1,
    page: 1,
    limit: 100,
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
  const deps: ChunksListDeps = {
    getPhraseListCache: async () => ({ found: false, record: null, isExpired: false }),
    setPhraseListCache: async () => undefined,
    getMyPhrasesFromApi: async () => {
      throw new Error("boom");
    },
    buildChunksListRequestParams: ({ query, reviewFilter, contentFilter, expressionClusterFilterId }) => ({
      query: query.trim(),
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: reviewFilter,
      learningItemType: contentFilter,
      expressionClusterId: expressionClusterFilterId || undefined,
    }),
    resolveChunksCachePresentation: ({ cacheFound }) => ({
      hasCacheFallback: cacheFound,
      nextDataSource: cacheFound ? "cache" : "none",
      shouldStopLoading: cacheFound,
    }),
    resolveChunksNetworkFailure: ({ hasCacheFallback, error }) => ({
      shouldClearRows: !hasCacheFallback,
      shouldStopLoading: !hasCacheFallback,
      message: error instanceof Error ? error.message : "load failed",
    }),
    setTimeoutFn: (callback: () => void) => {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimeoutFn: (handle) => {
      timers.delete(handle as number);
    },
  };

  const { result } = renderHook(() =>
    useChunksListData({
      query: "",
      reviewFilter: "all",
      contentFilter: "expression",
      expressionClusterFilterId: "",
      onLoadFailed: (message) => messages.push(message),
      deps,
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

test("useChunksListData 在 onLoadFailed 回调变化时不会重复自动请求", async () => {
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const requestedQueries: string[] = [];
  const deps: ChunksListDeps = {
    getPhraseListCache: async () => ({ found: false, record: null, isExpired: false }),
    setPhraseListCache: async () => undefined,
    getMyPhrasesFromApi: async (params) => {
      requestedQueries.push(params?.query ?? "");
      return { rows, total: 1, page: 1, limit: 100 };
    },
    buildChunksListRequestParams: ({ query, reviewFilter, contentFilter, expressionClusterFilterId }) => ({
      query: query.trim(),
      limit: 100,
      page: 1,
      status: "saved",
      reviewStatus: reviewFilter,
      learningItemType: contentFilter,
      expressionClusterId: expressionClusterFilterId || undefined,
    }),
    resolveChunksCachePresentation: ({ cacheFound }) => ({
      hasCacheFallback: cacheFound,
      nextDataSource: cacheFound ? "cache" : "none",
      shouldStopLoading: cacheFound,
    }),
    resolveChunksNetworkFailure: ({ error }) => ({
      shouldClearRows: true,
      shouldStopLoading: true,
      message: error instanceof Error ? error.message : "load failed",
    }),
    setTimeoutFn: (callback: () => void) => {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimeoutFn: (handle) => {
      timers.delete(handle as number);
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
        deps,
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
