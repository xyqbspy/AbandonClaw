import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFocusAssistCandidatePayload,
  buildGeneratedSimilarCandidatePayload,
  buildManualAssistCandidatePayload,
  buildManualBaseExpressionSavePayload,
  buildQuickAddRelatedPayload,
  CHUNKS_SOURCE_NOTES,
} from "./chunks-save-contract";
import { ManualExpressionAssistResponse, UserPhraseItemResponse } from "@/lib/utils/phrases-api";

const assist: ManualExpressionAssistResponse = {
  version: "v1",
  inputItem: {
    text: "call it a day",
    translation: "今天先到这里",
    usageNote: "表示收尾",
    examples: [{ en: "I should call it a day.", zh: "我该收工了。" }],
    semanticFocus: "收尾",
    typicalScenario: "工作收尾",
  },
  similarExpressions: [{ text: "wrap it up", differenceLabel: "更偏收尾" }],
  contrastExpressions: [{ text: "keep going", differenceLabel: "继续推进" }],
};

const focusExpression: UserPhraseItemResponse = {
  userPhraseId: "focus-1",
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
  expressionClusterId: "cluster-1",
  expressionClusterRole: "main",
  expressionClusterMainUserPhraseId: "focus-1",
  aiEnrichmentStatus: null,
  semanticFocus: null,
  typicalScenario: null,
  exampleSentences: [],
  aiEnrichmentError: null,
  learningItemType: "expression",
  savedAt: "2026-03-31T00:00:00.000Z",
  lastSeenAt: "2026-03-31T00:00:00.000Z",
  reviewStatus: "saved",
  reviewCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  lastReviewedAt: null,
  nextReviewAt: null,
  masteredAt: null,
};

test("manual assist base payload 会在需要时创建 cluster 种子", () => {
  const payload = buildManualBaseExpressionSavePayload({
    assist,
    createClusterForSimilar: true,
    baseKey: "call it a day",
  });

  assert.equal(payload.expressionClusterId, "create-cluster:call it a day");
  assert.equal(payload.translation, "今天先到这里");
  assert.equal(payload.sourceSentenceText, "I should call it a day.");
});

test("manual similar/contrast payload 会稳定区分 relation 与 cluster 语义", () => {
  const similarPayload = buildManualAssistCandidatePayload({
    assist,
    candidate: assist.similarExpressions[0],
    kind: "similar",
    expressionClusterId: "cluster-1",
    relationSourceUserPhraseId: "focus-1",
  });
  const contrastPayload = buildManualAssistCandidatePayload({
    assist,
    candidate: assist.contrastExpressions[0],
    kind: "contrast",
    relationSourceUserPhraseId: "focus-1",
  });

  assert.equal(similarPayload.sourceNote, CHUNKS_SOURCE_NOTES.manualSimilarAi);
  assert.equal(similarPayload.expressionClusterId, "cluster-1");
  assert.equal(similarPayload.relationType, "similar");
  assert.equal(contrastPayload.sourceNote, CHUNKS_SOURCE_NOTES.manualContrastAi);
  assert.equal(contrastPayload.expressionClusterId, undefined);
  assert.equal(contrastPayload.relationType, "contrast");
});

test("focus assist payload 只会让 similar 继承 cluster", () => {
  const similarPayload = buildFocusAssistCandidatePayload({
    focusItem: focusExpression,
    candidate: { text: "wrap it up", differenceLabel: "更偏收尾" },
    kind: "similar",
  });
  const contrastPayload = buildFocusAssistCandidatePayload({
    focusItem: focusExpression,
    candidate: { text: "keep going", differenceLabel: "继续推进" },
    kind: "contrast",
  });

  assert.equal(similarPayload.sourceNote, CHUNKS_SOURCE_NOTES.focusSimilarAi);
  assert.equal(similarPayload.expressionClusterId, "cluster-1");
  assert.equal(contrastPayload.sourceNote, CHUNKS_SOURCE_NOTES.focusContrastAi);
  assert.equal(contrastPayload.expressionClusterId, undefined);
});

test("generated similar 与 quick add payload 会保留固定 source note", () => {
  const generatedPayload = buildGeneratedSimilarCandidatePayload({
    candidate: { text: "call it quits", differenceLabel: "更直接" },
    seedExpression: focusExpression,
    clusterId: "cluster-1",
  });
  const quickAddPayload = buildQuickAddRelatedPayload({
    focusExpression,
    text: "get through the day",
    kind: "contrast",
  });

  assert.equal(generatedPayload.sourceNote, CHUNKS_SOURCE_NOTES.generatedSimilar);
  assert.equal(generatedPayload.relationType, "similar");
  assert.equal(quickAddPayload.sourceNote, CHUNKS_SOURCE_NOTES.quickAddContrast);
  assert.equal(quickAddPayload.relationType, "contrast");
});
