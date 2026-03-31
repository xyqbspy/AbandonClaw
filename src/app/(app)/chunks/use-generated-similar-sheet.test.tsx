import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useGeneratedSimilarSheet } from "./use-generated-similar-sheet";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

afterEach(() => {
  cleanup();
});

type GeneratedSimilarSheetDeps = NonNullable<Parameters<typeof useGeneratedSimilarSheet>[0]["deps"]>;
type GeneratedSimilarCacheResult = Awaited<
  ReturnType<GeneratedSimilarSheetDeps["getGeneratedSimilarCache"]>
>;

const buildGeneratedSimilarCacheResult = (
  userPhraseId: string,
  candidates: Array<{ text: string; differenceLabel: string }>,
): GeneratedSimilarCacheResult => {
  const now = Date.now();
  return {
    found: true,
    isExpired: false,
    record: {
      schemaVersion: "generated-similar-cache-v1",
      key: `generated-similar:v1:${userPhraseId}`,
      type: "generated_similar",
      data: {
        userPhraseId,
        candidates,
      },
      cachedAt: now,
      lastAccessedAt: now,
      expiresAt: now + 60_000,
    },
  };
};

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
    sourceSceneSlug: "scene-1",
    sourceType: "manual",
    sourceNote: null,
    sourceSentenceIndex: null,
    sourceSentenceText: "I should call it a day.",
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

test("useGeneratedSimilarSheet 会打开并加载候选项", async () => {
  const { result } = renderHook(() =>
    useGeneratedSimilarSheet({
      expressionRows,
      normalizeSimilarLabel: (label) => label ?? "",
      onLoadCluster: async () => undefined,
      onApplyClusterFilter: () => undefined,
      deps: {
        getGeneratedSimilarCache: async () => ({ found: false, record: null, isExpired: false }),
        setGeneratedSimilarCache: async () => undefined,
        generateSimilarExpressionsFromApi: async () => ({
          version: "v1",
          candidates: [{ text: "wrap it up", differenceLabel: "更偏收尾" }],
        }),
        savePhraseFromApi: async () => ({
          created: true,
          phrase: { id: "phrase-1", normalized_text: "call it a day", display_text: "call it a day" },
          userPhrase: { id: "saved-1" },
          expressionClusterId: "cluster-1",
        }),
        savePhrasesBatchFromApi: async () => ({
          items: [],
        }),
        enrichSimilarExpressionsBatchFromApi: async () => ({
          items: [],
        }),
        setTimeoutFn: () => 1,
      },
    }),
  );

  await act(async () => {
    await result.current.openGenerateSimilarSheet(expressionRows[0]);
  });

  assert.equal(result.current.similarSheetOpen, true);
  assert.equal(result.current.generatedSimilarCandidates.length, 1);
  assert.equal(result.current.generatedSimilarCandidates[0]?.text, "wrap it up");
});

test("useGeneratedSimilarSheet 会保存选中候选并加载 cluster", async () => {
  const loaded: string[] = [];
  const filtered: string[] = [];
  const success: string[] = [];
  const batchPayloads: Array<{ items: Array<Record<string, unknown>> }> = [];
  const { result } = renderHook(() =>
    useGeneratedSimilarSheet({
      expressionRows,
      normalizeSimilarLabel: (label) => label ?? "",
      onLoadCluster: async (clusterId) => {
        loaded.push(clusterId);
      },
      onApplyClusterFilter: (clusterId, text) => {
        filtered.push(`${clusterId}:${text}`);
      },
      onSuccess: (message) => success.push(message),
      deps: {
        getGeneratedSimilarCache: async () => ({ found: false, record: null, isExpired: false }),
        setGeneratedSimilarCache: async () => undefined,
        generateSimilarExpressionsFromApi: async () => ({
          version: "v1",
          candidates: [{ text: "wrap it up", differenceLabel: "更偏收尾" }],
        }),
        savePhraseFromApi: async () => ({
          created: true,
          phrase: { id: "phrase-1", normalized_text: "call it a day", display_text: "call it a day" },
          userPhrase: { id: "saved-1" },
          expressionClusterId: "cluster-1",
        }),
        savePhrasesBatchFromApi: async (payload) => {
          batchPayloads.push(payload as { items: Array<Record<string, unknown>> });
          return {
            items: [{ created: true, phrase: { id: "phrase-2", normalized_text: "wrap it up", display_text: "wrap it up" }, userPhrase: { id: "saved-2" }, expressionClusterId: "cluster-1" }],
          };
        },
        enrichSimilarExpressionsBatchFromApi: async () => ({
          items: [{ userPhraseId: "saved-2", status: "done" as const }],
        }),
        setTimeoutFn: (callback: () => void) => {
          callback();
          return 1;
        },
      },
    }),
  );

  await act(async () => {
    await result.current.openGenerateSimilarSheet(expressionRows[0]);
  });
  act(() => {
    result.current.toggleCandidateSelected("wrap it up");
  });
  await act(async () => {
    await result.current.saveSelectedSimilarCandidates();
  });

  assert.deepEqual(loaded, ["cluster-1", "cluster-1"]);
  assert.deepEqual(filtered, ["cluster-1:call it a day"]);
  assert.deepEqual(success, ["saved"]);
  assert.equal(batchPayloads[0]?.items[0]?.sourceNote, "similar-ai-mvp");
  assert.equal(batchPayloads[0]?.items[0]?.relationType, "similar");
  assert.equal(batchPayloads[0]?.items[0]?.expressionClusterId, "cluster-1");
  assert.equal(result.current.similarSheetOpen, false);
});

test("useGeneratedSimilarSheet 在未选中候选时会提示选择", async () => {
  const messages: string[] = [];
  const { result } = renderHook(() =>
    useGeneratedSimilarSheet({
      expressionRows,
      normalizeSimilarLabel: (label) => label ?? "",
      onLoadCluster: async () => undefined,
      onApplyClusterFilter: () => undefined,
      onSelectAtLeastOne: () => messages.push("select"),
      deps: {
        getGeneratedSimilarCache: async () => ({ found: false, record: null, isExpired: false }),
        setGeneratedSimilarCache: async () => undefined,
        generateSimilarExpressionsFromApi: async () => ({
          version: "v1",
          candidates: [{ text: "wrap it up", differenceLabel: "更偏收尾" }],
        }),
        savePhraseFromApi: async () => ({
          created: true,
          phrase: { id: "phrase-1", normalized_text: "call it a day", display_text: "call it a day" },
          userPhrase: { id: "saved-1" },
          expressionClusterId: "cluster-1",
        }),
        savePhrasesBatchFromApi: async () => ({
          items: [],
        }),
        enrichSimilarExpressionsBatchFromApi: async () => ({
          items: [],
        }),
        setTimeoutFn: () => 1,
      },
    }),
  );

  await act(async () => {
    await result.current.openGenerateSimilarSheet(expressionRows[0]);
  });
  await act(async () => {
    await result.current.saveSelectedSimilarCandidates();
  });

  assert.deepEqual(messages, ["select"]);
});

test("useGeneratedSimilarSheet 会优先复用缓存候选并跳过接口请求", async () => {
  let networkCalls = 0;
  const { result } = renderHook(() =>
    useGeneratedSimilarSheet({
      expressionRows,
      normalizeSimilarLabel: (label) => label ?? "",
      onLoadCluster: async () => undefined,
      onApplyClusterFilter: () => undefined,
      deps: {
        getGeneratedSimilarCache: async () =>
          buildGeneratedSimilarCacheResult("p1", [
            { text: "call it quits", differenceLabel: "更直接" },
          ]),
        setGeneratedSimilarCache: async () => undefined,
        generateSimilarExpressionsFromApi: async () => {
          networkCalls += 1;
          return {
            version: "v1",
            candidates: [],
          };
        },
        savePhraseFromApi: async () => ({
          created: true,
          phrase: { id: "phrase-1", normalized_text: "call it a day", display_text: "call it a day" },
          userPhrase: { id: "saved-1" },
          expressionClusterId: "cluster-1",
        }),
        savePhrasesBatchFromApi: async () => ({
          items: [],
        }),
        enrichSimilarExpressionsBatchFromApi: async () => ({
          items: [],
        }),
        setTimeoutFn: () => 1,
      },
    }),
  );

  await act(async () => {
    await result.current.openGenerateSimilarSheet(expressionRows[0]);
  });

  assert.equal(networkCalls, 0);
  assert.equal(result.current.generatedSimilarCandidates[0]?.text, "call it quits");
});
