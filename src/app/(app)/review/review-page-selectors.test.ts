import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFallbackExampleSentence,
  mergePrioritizedReviewItems,
  resolveReviewHints,
  resolveReviewSourceLabel,
  toDueItemFromSavedPhrase,
} from "./review-page-selectors";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { DueReviewItemResponse } from "@/lib/utils/review-api";

const createPhrase = (
  overrides: Partial<UserPhraseItemResponse> = {},
): UserPhraseItemResponse => ({
  userPhraseId: overrides.userPhraseId ?? "phrase-1",
  phraseId: overrides.phraseId ?? "phrase-1",
  text: overrides.text ?? "call it a day",
  normalizedText: overrides.normalizedText ?? "call it a day",
  translation: overrides.translation ?? "今天先到这里",
  usageNote: overrides.usageNote ?? null,
  difficulty: overrides.difficulty ?? null,
  tags: overrides.tags ?? [],
  sourceSceneSlug: overrides.sourceSceneSlug ?? null,
  sourceType: overrides.sourceType ?? "manual",
  sourceNote: overrides.sourceNote ?? null,
  sourceSentenceIndex: overrides.sourceSentenceIndex ?? null,
  sourceSentenceText: overrides.sourceSentenceText ?? null,
  sourceChunkText: overrides.sourceChunkText ?? null,
  expressionClusterId: overrides.expressionClusterId ?? null,
  expressionClusterRole: overrides.expressionClusterRole ?? null,
  expressionClusterMainUserPhraseId: overrides.expressionClusterMainUserPhraseId ?? null,
  aiEnrichmentStatus: overrides.aiEnrichmentStatus ?? null,
  semanticFocus: overrides.semanticFocus ?? null,
  typicalScenario: overrides.typicalScenario ?? null,
  exampleSentences: overrides.exampleSentences ?? [],
  aiEnrichmentError: overrides.aiEnrichmentError ?? null,
  learningItemType: overrides.learningItemType ?? "expression",
  savedAt: overrides.savedAt ?? "2026-03-21T00:00:00.000Z",
  lastSeenAt: overrides.lastSeenAt ?? "2026-03-21T00:00:00.000Z",
  reviewStatus: overrides.reviewStatus ?? "saved",
  reviewCount: overrides.reviewCount ?? 0,
  correctCount: overrides.correctCount ?? 0,
  incorrectCount: overrides.incorrectCount ?? 0,
  lastReviewedAt: overrides.lastReviewedAt ?? null,
  nextReviewAt: overrides.nextReviewAt ?? null,
  masteredAt: overrides.masteredAt ?? null,
});

const createDueItem = (
  overrides: Partial<DueReviewItemResponse> = {},
): DueReviewItemResponse => ({
  userPhraseId: overrides.userPhraseId ?? "phrase-1",
  phraseId: overrides.phraseId ?? "phrase-1",
  text: overrides.text ?? "call it a day",
  translation: overrides.translation ?? "今天先到这里",
  usageNote: overrides.usageNote ?? null,
  sourceSceneSlug: overrides.sourceSceneSlug ?? null,
  sourceSentenceText: overrides.sourceSentenceText ?? null,
  expressionClusterId: overrides.expressionClusterId ?? null,
  reviewStatus: overrides.reviewStatus ?? "saved",
  reviewCount: overrides.reviewCount ?? 0,
  correctCount: overrides.correctCount ?? 0,
  incorrectCount: overrides.incorrectCount ?? 0,
  nextReviewAt: overrides.nextReviewAt ?? null,
});

test("toDueItemFromSavedPhrase 只转换可复习状态，并保留关键字段", () => {
  const saved = toDueItemFromSavedPhrase(
    createPhrase({
      userPhraseId: "p1",
      reviewStatus: "reviewing",
      sourceSentenceText: "I should call it a day.",
    }),
  );
  const archived = toDueItemFromSavedPhrase(
    createPhrase({
      userPhraseId: "p2",
      reviewStatus: "archived",
    }),
  );

  assert.equal(saved?.userPhraseId, "p1");
  assert.equal(saved?.sourceSentenceText, "I should call it a day.");
  assert.equal(archived, null);
});

test("mergePrioritizedReviewItems 会优先插入 session 项，并避免重复", () => {
  const dueRows = [
    createDueItem({ userPhraseId: "due-1", text: "burn out" }),
    createDueItem({ userPhraseId: "due-2", text: "call it a day" }),
  ];
  const phraseRows = [
    createPhrase({ userPhraseId: "saved-1", text: "barely slept", reviewStatus: "saved" }),
    createPhrase({ userPhraseId: "due-2", text: "call it a day", reviewStatus: "saved" }),
  ];

  const merged = mergePrioritizedReviewItems({
    prioritizedIds: ["saved-1", "due-2"],
    dueRows,
    phraseRows,
  });

  assert.deepEqual(
    merged.map((item) => item.userPhraseId),
    ["saved-1", "due-2", "due-1"],
  );
});

test("review selector 会返回正确的来源文案和提示文案", () => {
  assert.equal(
    resolveReviewSourceLabel({
      isSessionReview: true,
      sessionSource: "expression-map-single",
      labels: {
        fromExpressionLibrary: "来自表达库",
        fromExpressionMap: "来自表达地图",
        fromTodayTask: "来自今日任务",
        fromSelected: "来自你的选中表达",
      },
    }),
    "来自表达地图",
  );

  assert.deepEqual(
    resolveReviewHints({
      isSessionReview: true,
      sessionSource: "expression-library-manual-add",
      labels: {
        defaultHint: "默认提示",
        sessionHint: "session 提示",
        manualSessionHint: "手动添加提示",
        trainingHintSubtle: "普通轻提示",
        manualTrainingHintSubtle: "手动添加轻提示",
      },
    }),
    {
      primaryHint: "手动添加提示",
      trainingHintSubtle: "手动添加轻提示",
    },
  );
});

test("buildFallbackExampleSentence 会生成稳定的回退参考句", () => {
  assert.equal(
    buildFallbackExampleSentence("call it a day"),
    'I can use "call it a day" in a real sentence.',
  );
});
