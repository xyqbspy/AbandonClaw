import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

import { useSavedRelations } from "./use-saved-relations";

afterEach(() => {
  cleanup();
});

const expressionRows = [
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
  {
    userPhraseId: "p2",
    phraseId: "phrase-2",
    text: "wrap up",
    normalizedText: "wrap up",
    translation: "收尾",
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

test("useSavedRelations 会批量预热表达关系并输出 ready 状态", async () => {
  const messages: string[] = [];
  const deps = {
    getPhraseRelationsBatchFromApi: async (userPhraseIds: string[]) => ({
      rows: [
        {
          sourceUserPhraseId: userPhraseIds[0],
          relationType: "similar" as const,
          item: expressionRows[1],
        },
      ],
    }),
    getPhraseRelationsFromApi: async () => ({ rows: [] }),
  };

  const { result } = renderHook(() =>
    useSavedRelations({
      contentFilter: "expression",
      expressionViewMode: "focus",
      expressionRows,
      focusDetailUserPhraseId: null,
      onLoadFailed: (message) => messages.push(message),
      deps: deps as never,
    }),
  );

  await waitFor(() => {
    assert.equal(result.current.focusRelationsBootstrapDone, true);
    assert.equal(result.current.savedRelationCache.p1?.loaded, true);
    assert.equal(result.current.savedRelationCache.p2?.loaded, true);
  });

  assert.equal(result.current.savedRelationRowsBySourceId.p1?.length, 1);
  assert.equal(result.current.savedRelationRowsBySourceId.p2?.length, 0);
  assert.deepEqual(messages, []);
});

test("useSavedRelations 支持按 id 失效关系缓存并重新预热", async () => {
  const requestedBatches: string[][] = [];
  const deps = {
    getPhraseRelationsBatchFromApi: async (userPhraseIds: string[]) => {
      requestedBatches.push(userPhraseIds);
      return {
      rows: [
        {
          sourceUserPhraseId: "p1",
          relationType: "similar" as const,
          item: expressionRows[1],
        },
      ],
      };
    },
    getPhraseRelationsFromApi: async () => ({ rows: [] }),
  };

  const { result } = renderHook(() =>
    useSavedRelations({
      contentFilter: "expression",
      expressionViewMode: "focus",
      expressionRows,
      focusDetailUserPhraseId: null,
      deps: deps as never,
    }),
  );

  await waitFor(() => {
    assert.equal(result.current.savedRelationCache.p1?.loaded, true);
  });

  result.current.invalidateSavedRelations(["p1"]);

  await waitFor(() => {
    assert.equal(requestedBatches.length, 2);
  });
  assert.deepEqual(requestedBatches[0], ["p1", "p2"]);
  assert.deepEqual(requestedBatches[1], ["p1"]);
});

test("useSavedRelations 会为详情懒加载缺失关系，并在完成后清理 loading key", async () => {
  const requestedIds: string[] = [];
  const deps = {
    getPhraseRelationsBatchFromApi: async () => ({ rows: [] }),
    getPhraseRelationsFromApi: async (userPhraseId: string) => {
      requestedIds.push(userPhraseId);
      return {
        rows: [
          {
            sourceUserPhraseId: userPhraseId,
            relationType: "contrast" as const,
            item: expressionRows[0],
          },
        ],
      };
    },
  };

  const { result } = renderHook(() =>
    useSavedRelations({
      contentFilter: "sentence",
      expressionViewMode: "list",
      expressionRows: [],
      focusDetailUserPhraseId: "detail-1",
      deps: deps as never,
    }),
  );

  await waitFor(() => {
    assert.equal(result.current.savedRelationCache["detail-1"]?.loaded, true);
    assert.equal(result.current.savedRelationLoadingKey, null);
  });

  assert.deepEqual(requestedIds, ["detail-1"]);
  assert.equal(result.current.savedRelationRowsBySourceId["detail-1"]?.length, 1);
});

test("useSavedRelations 在请求进行中不会重复拉取同一个详情关系", async () => {
  let resolveRequest: ((value: { rows: any[] }) => void) | null = null;
  const requestedIds: string[] = [];
  const deps = {
    getPhraseRelationsBatchFromApi: async () => ({ rows: [] }),
    getPhraseRelationsFromApi: async (userPhraseId: string) =>
      await new Promise<{ rows: any[] }>((resolve) => {
        requestedIds.push(userPhraseId);
        resolveRequest = resolve;
      }),
  };

  const { rerender } = renderHook(
    ({ focusDetailUserPhraseId }: { focusDetailUserPhraseId: string | null }) =>
      useSavedRelations({
        contentFilter: "sentence",
        expressionViewMode: "list",
        expressionRows: [],
        focusDetailUserPhraseId,
        deps: deps as never,
      }),
    {
      initialProps: { focusDetailUserPhraseId: "detail-2" },
    },
  );

  rerender({ focusDetailUserPhraseId: "detail-2" });
  rerender({ focusDetailUserPhraseId: "detail-2" });

  assert.deepEqual(requestedIds, ["detail-2"]);

  resolveRequest?.({ rows: [] });
});
