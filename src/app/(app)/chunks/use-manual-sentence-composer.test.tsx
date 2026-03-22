import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useManualSentenceComposer } from "./use-manual-sentence-composer";

afterEach(() => {
  cleanup();
});

test("useManualSentenceComposer 会生成 assist 后保存句子", async () => {
  const saveCalls: Array<{ learningItemType?: string; sourceChunkText?: string }> = [];
  const { result } = renderHook(() =>
    useManualSentenceComposer({
      deps: {
        generateManualSentenceAssistFromApi: async () => ({
          version: "v1",
          sentenceItem: {
            text: "I should call it a day.",
            translation: "我该收工了。",
            usageNote: "表示结束",
            semanticFocus: "结束",
            typicalScenario: "工作收尾",
            extractedExpressions: ["call it a day"],
          },
        }),
        savePhraseFromApi: async (payload) => {
          saveCalls.push(payload);
          return {
            created: true,
            phrase: {
              id: "phrase-1",
              normalized_text: "i should call it a day",
              display_text: "I should call it a day.",
            },
            userPhrase: { id: "sentence-1" },
            expressionClusterId: null,
          };
        },
      },
    }),
  );

  let output: Awaited<ReturnType<typeof result.current.saveManualSentence>> = null;
  await act(async () => {
    output = await result.current.saveManualSentence("I should call it a day.");
  });

  assert.equal(saveCalls[0]?.learningItemType, "sentence");
  assert.equal(saveCalls[0]?.sourceChunkText, "call it a day");
  assert.deepEqual(output, {
    reviewSessionExpressions: [{ userPhraseId: "sentence-1", text: "I should call it a day." }],
  });
});

test("useManualSentenceComposer 在失败时会上报错误", async () => {
  const messages: string[] = [];
  const { result } = renderHook(() =>
    useManualSentenceComposer({
      onError: (message) => messages.push(message),
      deps: {
        generateManualSentenceAssistFromApi: async () => {
          throw new Error("boom");
        },
        savePhraseFromApi: async () => ({
          created: true,
          phrase: { id: "phrase-1", normalized_text: "x", display_text: "x" },
          userPhrase: { id: "saved-1" },
          expressionClusterId: null,
        }),
      },
    }),
  );

  await act(async () => {
    await result.current.saveManualSentence("I should call it a day.");
  });

  assert.deepEqual(messages, ["boom"]);
  assert.equal(result.current.savingManualSentence, false);
});
