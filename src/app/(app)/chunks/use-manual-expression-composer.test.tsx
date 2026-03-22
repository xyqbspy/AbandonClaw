import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useManualExpressionComposer } from "./use-manual-expression-composer";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

afterEach(() => {
  cleanup();
});

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
        savePhraseFromApi: async () => ({
          created: true,
          phrase: { id: "phrase-1", normalized_text: "call it a day", display_text: "call it a day" },
          userPhrase: { id: "saved-1" },
          expressionClusterId: null,
        }),
        enrichSimilarExpressionFromApi: async () => ({ userPhraseId: "saved-1", status: "done" as const }),
        savePhrasesBatchFromApi: async () => ({ items: [] }),
        enrichSimilarExpressionsBatchFromApi: async () => ({ items: [] }),
      },
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
  const saveCalls: Array<{ text?: string }> = [];
  const { result } = renderHook(() =>
    useManualExpressionComposer({
      expressionRows,
      onPartialEnrichFailed: (message) => partials.push(message),
      deps: {
        generateManualExpressionAssistFromApi: async () => ({
          version: "v1",
          inputItem: {
            text: "unused",
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
          saveCalls.push(payload);
          return {
            created: true,
            phrase: { id: "phrase-2", normalized_text: "wrap it up", display_text: "wrap it up" },
            userPhrase: { id: "saved-1" },
            expressionClusterId: null,
          };
        },
        enrichSimilarExpressionFromApi: async () => {
          throw new Error("boom");
        },
        savePhrasesBatchFromApi: async () => ({ items: [] }),
        enrichSimilarExpressionsBatchFromApi: async () => ({ items: [] }),
      },
    }),
  );

  let output:
    | {
        reviewSessionExpressions: Array<{ userPhraseId: string; text: string }>;
        usedAssist: boolean;
        mode: "save" | "save_and_review";
      }
    | {
        reviewSessionExpressions: Array<{ userPhraseId: string; text: string }>;
        usedAssist: true;
        mode: "save" | "save_and_review";
        emptySelection: true;
      }
    | null = null;
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
  const batchPayloads: unknown[] = [];
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
        savePhraseFromApi: async (payload) => {
          if (payload.text === "call it a day") {
            return {
              created: true,
              phrase: { id: "phrase-1", normalized_text: "call it a day", display_text: "call it a day" },
              userPhrase: { id: "base-1" },
              expressionClusterId: "cluster-1",
            };
          }
          throw new Error("unexpected single save");
        },
        enrichSimilarExpressionFromApi: async () => ({ userPhraseId: "base-1", status: "done" as const }),
        savePhrasesBatchFromApi: async (payload) => {
          batchPayloads.push(payload);
          return {
            items: payload.items.map((_: unknown, index: number) => ({
              created: true,
              phrase: { id: `phrase-${index + 2}`, normalized_text: `item-${index + 1}`, display_text: `item-${index + 1}` },
              userPhrase: { id: `batch-${index + 1}` },
              expressionClusterId: "cluster-1",
            })),
          };
        },
        enrichSimilarExpressionsBatchFromApi: async (payload) => {
          batchPayloads.push({ enrich: payload });
          return {
            items: [
              { userPhraseId: "batch-1", status: "done" as const },
              { userPhraseId: "batch-2", status: "done" as const },
            ],
          };
        },
      },
    }),
  );

  await act(async () => {
    await result.current.loadManualExpressionAssist("call it a day");
  });
  await act(async () => {
    result.current.toggleManualSelected("wrap it up");
    result.current.toggleManualSelected("keep going");
  });

  let output:
    | {
        reviewSessionExpressions: Array<{ userPhraseId: string; text: string }>;
        usedAssist: boolean;
        mode: "save" | "save_and_review";
      }
    | {
        reviewSessionExpressions: Array<{ userPhraseId: string; text: string }>;
        usedAssist: true;
        mode: "save" | "save_and_review";
        emptySelection: true;
      }
    | null = null;
  await act(async () => {
    output = await result.current.saveManualExpression({
      text: "call it a day",
      mode: "save_and_review",
    });
  });

  assert.deepEqual(output, {
    reviewSessionExpressions: [
      { userPhraseId: "base-1", text: "call it a day" },
      { userPhraseId: "batch-1", text: "wrap it up" },
      { userPhraseId: "batch-1", text: "keep going" },
    ],
    usedAssist: true,
    mode: "save_and_review",
  });
  assert.equal(batchPayloads.length, 3);
  assert.equal((batchPayloads[0] as { items: Array<{ relationType?: string }> }).items[0]?.relationType, "similar");
  assert.equal((batchPayloads[1] as { items: Array<{ relationType?: string }> }).items[0]?.relationType, "contrast");
  assert.equal((batchPayloads[2] as { enrich: { items: unknown[] } }).enrich.items.length, 2);
});
