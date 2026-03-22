import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import { useFocusAssist } from "./use-focus-assist";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

afterEach(() => {
  cleanup();
});

type FocusAssistDeps = NonNullable<Parameters<typeof useFocusAssist>[0]["deps"]>;

const expressionRows: UserPhraseItemResponse[] = [
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
    sourceSentenceText: "I should call it a day.",
    sourceChunkText: null,
    expressionClusterId: "cluster-1",
    expressionClusterRole: "main",
    expressionClusterMainUserPhraseId: "p1",
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

test("useFocusAssist 会加载主表达 assist 数据", async () => {
  const deps: FocusAssistDeps = {
    generateManualExpressionAssistFromApi: async () => ({
      version: "v1",
      inputItem: {
        text: "call it a day",
        translation: "今天先到这里",
        usageNote: "表示先结束",
        examples: [],
        semanticFocus: "结束动作",
        typicalScenario: "工作收尾",
      },
      similarExpressions: [],
      contrastExpressions: [],
    }),
    savePhraseFromApi: async () => {
      throw new Error("should not run");
    },
    enrichSimilarExpressionFromApi: async () => ({
      userPhraseId: "x",
      status: "done",
    }),
  };

  const { result } = renderHook(() =>
    useFocusAssist({
      expressionRows,
      deps,
    }),
  );

  await act(async () => {
    await result.current.loadFocusAssist(expressionRows[0]);
  });

  await waitFor(() => {
    assert.equal(result.current.focusAssistLoading, false);
    assert.equal(result.current.focusAssistData?.inputItem.translation, "今天先到这里");
  });
});

test("useFocusAssist 会保存候选并执行后续回调", async () => {
  const savedPayloads: Array<Parameters<FocusAssistDeps["savePhraseFromApi"]>[0]> = [];
  const callbackPayloads: Array<{
    savedUserPhraseId: string;
    kind: "similar" | "contrast";
  }> = [];

  const deps: FocusAssistDeps = {
    generateManualExpressionAssistFromApi: async () => ({
      version: "v1",
      inputItem: {
        text: "",
        translation: "",
        usageNote: "",
        examples: [],
        semanticFocus: "",
        typicalScenario: "",
      },
      similarExpressions: [],
      contrastExpressions: [],
    }),
    savePhraseFromApi: async (payload) => {
      savedPayloads.push(payload);
      return {
        created: true,
        phrase: { id: "phrase-2", normalized_text: "wrap it up", display_text: "wrap it up" },
        userPhrase: { id: "saved-2" },
        expressionClusterId: "cluster-1",
      };
    },
    enrichSimilarExpressionFromApi: async () => ({
      userPhraseId: "saved-2",
      status: "done",
    }),
  };

  const { result } = renderHook(() =>
    useFocusAssist({
      expressionRows,
      deps,
      onCandidateSaved: async (payload) => {
        callbackPayloads.push({
          savedUserPhraseId: payload.savedUserPhraseId,
          kind: payload.kind,
        });
      },
    }),
  );

  await act(async () => {
    await result.current.saveFocusCandidate(
      expressionRows[0],
      {
        text: "wrap it up",
        differenceLabel: "更偏收尾",
      },
      "similar",
    );
  });

  assert.equal(result.current.savingFocusCandidateKey, null);
  assert.equal(savedPayloads[0]?.relationType, "similar");
  assert.equal(savedPayloads[0]?.expressionClusterId, "cluster-1");
  assert.deepEqual(callbackPayloads, [{ savedUserPhraseId: "saved-2", kind: "similar" }]);
});

test("useFocusAssist 在失败时会回调错误并清理 loading key", async () => {
  const messages: string[] = [];
  const deps: FocusAssistDeps = {
    generateManualExpressionAssistFromApi: async () => {
      throw new Error("boom");
    },
    savePhraseFromApi: async () => {
      throw new Error("save failed");
    },
    enrichSimilarExpressionFromApi: async () => ({
      userPhraseId: "x",
      status: "done",
    }),
  };

  const { result } = renderHook(() =>
    useFocusAssist({
      expressionRows,
      deps,
      onLoadFailed: (message) => messages.push(message),
    }),
  );

  await act(async () => {
    await result.current.loadFocusAssist(expressionRows[0]);
    await result.current.saveFocusCandidate(
      expressionRows[0],
      {
        text: "wrap it up",
        differenceLabel: "更偏收尾",
      },
      "similar",
    );
  });

  assert.equal(result.current.focusAssistLoading, false);
  assert.equal(result.current.savingFocusCandidateKey, null);
  assert.deepEqual(messages, ["boom", "save failed"]);
});
