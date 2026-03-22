import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useFocusDetailController } from "./use-focus-detail-controller";

afterEach(() => {
  cleanup();
});

const rows = [
  {
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
  },
  {
    userPhraseId: "similar-1",
    phraseId: "phrase-2",
    text: "wrap it up",
    normalizedText: "wrap it up",
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
    expressionClusterId: "cluster-1",
    expressionClusterRole: "variant",
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
  },
  {
    userPhraseId: "contrast-1",
    phraseId: "phrase-3",
    text: "keep going",
    normalizedText: "keep going",
    translation: "继续",
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

const buildHook = (focusRelationTab: "similar" | "contrast" = "similar") => {
  const setFocusIds: string[] = [];
  const result = renderHook(() =>
    useFocusDetailController({
      phraseByNormalized: new Map(rows.map((row) => [row.normalizedText, row])),
      expressionRows: rows,
      focusSimilarItems: [
        {
          key: "saved:similar-1",
          text: "wrap it up",
          differenceLabel: "更偏收尾",
          kind: "library-similar" as const,
          savedItem: rows[1],
        },
        {
          key: "ai:wind-down",
          text: "wind down",
          differenceLabel: "更偏慢慢停下来",
          kind: "suggested-similar" as const,
          savedItem: null,
        },
      ],
      focusContrastItems: [
        {
          key: "contrast:keep-going",
          text: "keep going",
          differenceLabel: "继续推进",
          kind: "contrast" as const,
          savedItem: rows[2],
        },
      ],
      focusRelationTab,
      resolveFocusMainExpressionIdForRow: (userPhraseId: string) =>
        userPhraseId === "similar-1" ? "main-1" : userPhraseId,
      onSetFocusExpressionId: (userPhraseId: string) => {
        setFocusIds.push(userPhraseId);
      },
    }),
  );

  return {
    ...result,
    setFocusIds,
  };
};

test("useFocusDetailController 会打开详情并为已保存项切换主表达", () => {
  const { result, setFocusIds } = buildHook();

  act(() => {
    result.current.openFocusDetail({
      text: "wrap it up",
      kind: "library-similar",
    });
  });

  assert.equal(result.current.focusDetailOpen, true);
  assert.equal(result.current.focusDetail?.text, "wrap it up");
  assert.equal(result.current.focusDetail?.savedItem?.userPhraseId, "similar-1");
  assert.equal(result.current.focusDetailTab, "similar");
  assert.equal(result.current.focusDetailTrail.length, 1);
  assert.deepEqual(setFocusIds, ["main-1"]);
});

test("useFocusDetailController 会在兄弟项之间循环切换，并追加 trail", () => {
  const { result } = buildHook();

  act(() => {
    result.current.openFocusDetail({
      text: "wrap it up",
      kind: "library-similar",
    });
  });
  act(() => {
    result.current.openFocusSiblingDetail(1);
  });

  assert.equal(result.current.focusDetail?.text, "wind down");
  assert.equal(result.current.focusDetail?.savedItem, null);
  assert.equal(result.current.focusDetailTrail.length, 2);
  assert.equal(result.current.focusDetailTrail[1]?.text, "wind down");
});

test("useFocusDetailController 会按 trail 回退并恢复对应 tab", () => {
  const { result, setFocusIds } = buildHook("contrast");

  act(() => {
    result.current.openFocusDetail({
      text: "call it a day",
      kind: "current",
      initialTab: "info",
    });
  });
  act(() => {
    result.current.openFocusDetail({
      text: "keep going",
      kind: "contrast",
      chainMode: "append",
    });
  });
  act(() => {
    result.current.reopenFocusTrailItem(0);
  });

  assert.equal(result.current.focusDetail?.text, "call it a day");
  assert.equal(result.current.focusDetailTab, "info");
  assert.equal(result.current.focusDetailTrail.length, 1);
  assert.equal(setFocusIds.at(-1), "main-1");
});
