import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useExpressionClusterActions } from "./use-expression-cluster-actions";

afterEach(() => {
  cleanup();
});

const mainRow = {
  userPhraseId: "main-1",
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
  expressionClusterId: "cluster-1",
  expressionClusterRole: "main",
  expressionClusterMainUserPhraseId: "main-1",
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
} as any;

const detailRow = {
  ...mainRow,
  userPhraseId: "variant-1",
  text: "wrap it up",
  normalizedText: "wrap it up",
  expressionClusterRole: "variant",
  expressionClusterMainUserPhraseId: "main-1",
} as any;

const candidate = {
  row: {
    ...mainRow,
    userPhraseId: "move-1",
    text: "wind down",
    normalizedText: "wind down",
    expressionClusterId: null,
    expressionClusterRole: null,
    expressionClusterMainUserPhraseId: null,
  },
  sourceClusterId: null,
  sourceClusterMainText: "wind down",
  sourceClusterMemberCount: 1,
  isSourceMain: true,
} as any;

const labels = {
  loadFailed: "加载失败",
  detachClusterMemberSuccess: "已设为独立主表达",
  moveIntoClusterSelectOne: "请至少选择 1 个",
  moveIntoClusterSuccess: "已移入",
  moveIntoClusterPartialFailed: "部分失败",
};

test("useExpressionClusterActions 会 detach 后刷新并失效关系缓存", async () => {
  const invalidated: string[][] = [];
  const calls: string[] = [];
  const { result } = renderHook(() =>
    useExpressionClusterActions({
      focusExpression: mainRow,
      focusDetailSavedItem: detailRow,
      moveIntoClusterCandidates: [],
      selectedMoveIntoClusterMap: {},
      loadPhrases: async () => {
        calls.push("load");
      },
      onInvalidateSavedRelations: (ids) => invalidated.push(ids),
      onAssignFocusMainExpression: () => {},
      onResetMoveSelection: () => {},
      onOpenMoveSheet: () => {},
      onCloseMoveSheet: () => {},
      onCloseFocusDetail: () => {
        calls.push("close-detail");
      },
      onCloseFocusActions: () => {},
      onClearDetailConfirm: () => {
        calls.push("clear-confirm");
      },
      onSuccess: (message) => {
        calls.push(message);
      },
      labels,
      deps: {
        detachExpressionClusterMemberFromApi: async () => ({}) as any,
        ensureExpressionClusterForPhraseFromApi: async () => ({}) as any,
        moveExpressionClusterMemberFromApi: async () => ({}) as any,
        setExpressionClusterMainFromApi: async () => ({}) as any,
      },
    }),
  );

  await act(async () => {
    await result.current.detachFocusDetailFromCluster();
  });

  assert.deepEqual(invalidated, [["variant-1", "main-1"]]);
  assert.deepEqual(calls, ["load", "已设为独立主表达", "clear-confirm", "close-detail"]);
});

test("useExpressionClusterActions 会设置当前详情为主表达并关闭详情", async () => {
  const assigned: string[] = [];
  const calls: string[] = [];
  const { result } = renderHook(() =>
    useExpressionClusterActions({
      focusExpression: mainRow,
      focusDetailSavedItem: detailRow,
      moveIntoClusterCandidates: [],
      selectedMoveIntoClusterMap: {},
      loadPhrases: async () => {},
      onInvalidateSavedRelations: () => {},
      onAssignFocusMainExpression: (item) => assigned.push(item.userPhraseId),
      onResetMoveSelection: () => {},
      onOpenMoveSheet: () => {},
      onCloseMoveSheet: () => {},
      onCloseFocusDetail: () => {
        calls.push("close-detail");
      },
      onCloseFocusActions: () => {
        calls.push("close-actions");
      },
      onClearDetailConfirm: () => {
        calls.push("clear-confirm");
      },
      labels,
      deps: {
        detachExpressionClusterMemberFromApi: async () => ({}) as any,
        ensureExpressionClusterForPhraseFromApi: async () => ({}) as any,
        moveExpressionClusterMemberFromApi: async () => ({}) as any,
        setExpressionClusterMainFromApi: async () => ({}) as any,
      },
    }),
  );

  await act(async () => {
    await result.current.setFocusDetailAsClusterMain();
  });

  assert.deepEqual(assigned, ["variant-1"]);
  assert.deepEqual(calls, ["close-actions", "clear-confirm", "close-detail"]);
});

test("useExpressionClusterActions 会 move 选中项并汇总成功信息", async () => {
  const invalidated: string[][] = [];
  const messages: string[] = [];
  const { result } = renderHook(() =>
    useExpressionClusterActions({
      focusExpression: mainRow,
      focusDetailSavedItem: detailRow,
      moveIntoClusterCandidates: [candidate],
      selectedMoveIntoClusterMap: { "move-1": true },
      loadPhrases: async () => {},
      onInvalidateSavedRelations: (ids) => invalidated.push(ids),
      onAssignFocusMainExpression: () => {},
      onResetMoveSelection: () => {
        messages.push("reset");
      },
      onOpenMoveSheet: () => {},
      onCloseMoveSheet: () => {
        messages.push("close-sheet");
      },
      onCloseFocusDetail: () => {},
      onCloseFocusActions: () => {},
      onClearDetailConfirm: () => {},
      onSuccess: (message) => messages.push(message),
      onError: (message) => messages.push(`error:${message}`),
      labels,
      deps: {
        detachExpressionClusterMemberFromApi: async () => ({}) as any,
        ensureExpressionClusterForPhraseFromApi: async () => ({}) as any,
        moveExpressionClusterMemberFromApi: async () =>
          ({
            action: "attached_member",
          }) as any,
        setExpressionClusterMainFromApi: async () => ({}) as any,
      },
    }),
  );

  await act(async () => {
    await result.current.handleMoveSelectedIntoCurrentCluster();
  });

  assert.deepEqual(invalidated, [["main-1", "move-1"]]);
  assert.deepEqual(messages, ["已移入 1 项（1个独立表达）", "close-sheet", "reset"]);
});

test("useExpressionClusterActions 会在没有 target cluster 时先 ensure 再打开选择器", async () => {
  const calls: string[] = [];
  const { result } = renderHook(() =>
    useExpressionClusterActions({
      focusExpression: {
        ...mainRow,
        expressionClusterId: null,
      },
      focusDetailSavedItem: null,
      moveIntoClusterCandidates: [candidate],
      selectedMoveIntoClusterMap: {},
      loadPhrases: async () => {
        calls.push("load");
      },
      onInvalidateSavedRelations: () => {},
      onAssignFocusMainExpression: () => {},
      onResetMoveSelection: () => {
        calls.push("reset");
      },
      onOpenMoveSheet: () => {
        calls.push("open-sheet");
      },
      onCloseMoveSheet: () => {},
      onCloseFocusDetail: () => {},
      onCloseFocusActions: () => {
        calls.push("close-actions");
      },
      onClearDetailConfirm: () => {},
      labels,
      deps: {
        detachExpressionClusterMemberFromApi: async () => ({}) as any,
        ensureExpressionClusterForPhraseFromApi: async () => {
          calls.push("ensure");
          return {} as any;
        },
        moveExpressionClusterMemberFromApi: async () => ({}) as any,
        setExpressionClusterMainFromApi: async () => ({}) as any,
      },
    }),
  );

  await act(async () => {
    await result.current.openMoveIntoCurrentCluster();
  });

  assert.equal(result.current.moveIntoClusterOpen, true);
  assert.deepEqual(calls, ["close-actions", "reset", "ensure", "load", "open-sheet"]);
});
