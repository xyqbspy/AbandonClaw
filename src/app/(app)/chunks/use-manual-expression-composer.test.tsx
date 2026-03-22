import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useManualExpressionComposer } from "./use-manual-expression-composer";

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
] as any[];

test("useManualExpressionComposer 会加载 assist 并默认勾选 base", async () => {
  const { result } = renderHook(() =>
    useManualExpressionComposer({
      expressionRows,
      deps: {
        generateManualExpressionAssistFromApi: async () => ({
          version: "v1",
          inputItem: {
            text: "call it a day",
            translation: "今天先到这里",
            usageNote: "结束",
            examples: [{ en: "I should call it a day.", zh: "该收工了" }],
            semanticFocus: "结束",
            typicalScenario: "收尾",
          },
          similarExpressions: [],
          contrastExpressions: [],
        }),
        savePhraseFromApi: async () => ({}) as any,
        enrichSimilarExpressionFromApi: async () => ({}) as any,
        savePhrasesBatchFromApi: async () => ({}) as any,
        enrichSimilarExpressionsBatchFromApi: async () => ({}) as any,
      } as never,
    }),
  );

  await act(async () => {
    await result.current.loadManualExpressionAssist("call it a day");
  });

  assert.equal(result.current.manualExpressionAssist?.inputItem.text, "call it a day");
  assert.equal(result.current.manualSelectedMap["call it a day"], true);
});

test("useManualExpressionComposer 在无 assist 时会保存基础表达并尝试 enrich", async () => {
  const partials: string[] = [];
  const saveCalls: any[] = [];
  const { result } = renderHook(() =>
    useManualExpressionComposer({
      expressionRows,
      onPartialEnrichFailed: (message) => partials.push(message),
      deps: {
        generateManualExpressionAssistFromApi: async () => ({}) as any,
        savePhraseFromApi: async (payload: any) => {
          saveCalls.push(payload);
          return { userPhrase: { id: "saved-1" } } as any;
        },
        enrichSimilarExpressionFromApi: async () => {
          throw new Error("boom");
        },
        savePhrasesBatchFromApi: async () => ({}) as any,
        enrichSimilarExpressionsBatchFromApi: async () => ({}) as any,
      } as never,
    }),
  );

  let output: any = null;
  await act(async () => {
    output = await result.current.saveManualExpression({
      text: "wrap it up",
      mode: "save",
    });
  });

  assert.equal(saveCalls[0]?.text, "wrap it up");
  assert.deepEqual(output, {
    reviewSessionExpressions: [{ userPhraseId: "saved-1", text: "wrap it up" }],
    usedAssist: false,
    mode: "save",
  });
  assert.deepEqual(partials, ["auto-enrich-failed"]);
});

test("useManualExpressionComposer 在有 assist 时会保存 base/similar/contrast 并批量 enrich", async () => {
  const batchPayloads: any[] = [];
  const { result } = renderHook(() =>
    useManualExpressionComposer({
      expressionRows,
      deps: {
        generateManualExpressionAssistFromApi: async () => ({
          version: "v1",
          inputItem: {
            text: "call it a day",
            translation: "今天先到这里",
            usageNote: "结束",
            examples: [{ en: "I should call it a day.", zh: "该收工了" }],
            semanticFocus: "结束",
            typicalScenario: "收尾",
          },
          similarExpressions: [{ text: "wrap it up", differenceLabel: "更偏收尾" }],
          contrastExpressions: [{ text: "keep going", differenceLabel: "继续推进" }],
        }),
        savePhraseFromApi: async (payload: any) => {
          if (payload.text === "call it a day") {
            return { userPhrase: { id: "base-1" }, expressionClusterId: "cluster-1" } as any;
          }
          throw new Error("unexpected single save");
        },
        enrichSimilarExpressionFromApi: async () => ({}) as any,
        savePhrasesBatchFromApi: async (payload: any) => {
          batchPayloads.push(payload);
          return {
            items: payload.items.map((_: any, index: number) => ({
              userPhrase: { id: `batch-${index + 1}` },
            })),
          } as any;
        },
        enrichSimilarExpressionsBatchFromApi: async (payload: any) => {
          batchPayloads.push({ enrich: payload });
          return {} as any;
        },
      } as never,
    }),
  );

  await act(async () => {
    await result.current.loadManualExpressionAssist("call it a day");
  });
  await act(async () => {
    result.current.toggleManualSelected("wrap it up");
    result.current.toggleManualSelected("keep going");
  });

  let output: any = null;
  await act(async () => {
    output = await result.current.saveManualExpression({
      text: "call it a day",
      mode: "save_and_review",
    });
  });

  assert.equal(output.usedAssist, true);
  assert.equal(output.mode, "save_and_review");
  assert.equal(output.reviewSessionExpressions.length, 3);
  assert.equal(batchPayloads.length, 3);
  assert.equal(batchPayloads[0].items[0].relationType, "similar");
  assert.equal(batchPayloads[1].items[0].relationType, "contrast");
  assert.equal(batchPayloads[2].enrich.items.length, 2);
});
