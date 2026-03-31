import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFallbackExampleSentence,
  buildReviewProgressModel,
  buildReviewTaskStageMeta,
  mergePrioritizedReviewItems,
  resolveReviewHints,
  resolveReviewSourceLabel,
  toDueItemFromSavedPhrase,
} from "./review-page-selectors";

test("toDueItemFromSavedPhrase 只转换可复习状态", () => {
  const reviewing = toDueItemFromSavedPhrase({
    userPhraseId: "u1",
    phraseId: "p1",
    text: "call it a day",
    normalizedText: "call it a day",
    translation: "收工",
    usageNote: null,
    difficulty: null,
    tags: [],
    sourceSceneSlug: "coffee-chat",
    sourceType: "scene",
    sourceSentenceIndex: null,
    sourceSentenceText: "Let's call it a day.",
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
    savedAt: "2026-03-31T00:00:00.000Z",
    lastSeenAt: "2026-03-31T00:00:00.000Z",
    reviewStatus: "saved",
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    sourceNote: null,
    masteredAt: null,
  });
  const archived = toDueItemFromSavedPhrase({
    userPhraseId: "u2",
    phraseId: "p2",
    text: "wrap it up",
    normalizedText: "wrap it up",
    translation: "收尾",
    usageNote: null,
    difficulty: null,
    tags: [],
    sourceSceneSlug: null,
    sourceType: "manual",
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
    savedAt: "2026-03-31T00:00:00.000Z",
    lastSeenAt: "2026-03-31T00:00:00.000Z",
    reviewStatus: "archived",
    reviewCount: 1,
    correctCount: 1,
    incorrectCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    sourceNote: null,
    masteredAt: null,
  });

  assert.equal(reviewing?.text, "call it a day");
  assert.equal(archived, null);
});

test("mergePrioritizedReviewItems 会优先插入 session 项并避免重复", () => {
  const merged = mergePrioritizedReviewItems({
    prioritizedIds: ["u2", "u1"],
    dueRows: [
      {
        userPhraseId: "u1",
        phraseId: "p1",
        text: "call it a day",
        translation: "收工",
        usageNote: null,
        sourceSceneSlug: null,
        sourceSentenceText: null,
        expressionClusterId: null,
        reviewStatus: "saved",
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        nextReviewAt: null,
      },
    ],
    phraseRows: [
      {
        userPhraseId: "u2",
        phraseId: "p2",
        text: "wrap it up",
        normalizedText: "wrap it up",
        translation: "收尾",
        usageNote: null,
        difficulty: null,
        tags: [],
        sourceSceneSlug: null,
        sourceType: "manual",
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
        savedAt: "2026-03-31T00:00:00.000Z",
        lastSeenAt: "2026-03-31T00:00:00.000Z",
        reviewStatus: "saved",
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        lastReviewedAt: null,
        nextReviewAt: null,
        sourceNote: null,
        masteredAt: null,
      },
    ],
  });

  assert.deepEqual(
    merged.map((item) => item.userPhraseId),
    ["u2", "u1"],
  );
});

test("review selector 会返回正确的来源文案和提示文案", () => {
  const sourceLabel = resolveReviewSourceLabel({
    isSessionReview: true,
    sessionSource: "expression-map-cluster",
    labels: {
      fromExpressionLibrary: "表达库",
      fromExpressionMap: "表达地图",
      fromTodayTask: "今日任务",
      fromSelected: "手动选择",
    },
  });
  const hints = resolveReviewHints({
    isSessionReview: true,
    sessionSource: "expression-library-manual-add",
    labels: {
      defaultHint: "默认提示",
      sessionHint: "普通 session 提示",
      manualSessionHint: "手动添加提示",
      trainingHintSubtle: "默认训练提示",
      manualTrainingHintSubtle: "手动训练提示",
    },
  });

  assert.equal(sourceLabel, "表达地图");
  assert.deepEqual(hints, {
    primaryHint: "手动添加提示",
    trainingHintSubtle: "手动训练提示",
  });
});

test("buildReviewProgressModel 会稳定计算进度百分比和正确率文本", () => {
  const progress = buildReviewProgressModel({
    summary: {
      dueReviewCount: 3,
      reviewedTodayCount: 2,
      reviewAccuracy: 80,
      masteredPhraseCount: 4,
    },
    scenePracticeCount: 1,
  });

  assert.equal(progress.totalCount, 6);
  assert.equal(progress.completedCount, 2);
  assert.equal(progress.progressPercent, 33);
  assert.equal(progress.accuracyText, "80%");
});

test("buildReviewTaskStageMeta 会为两类任务返回稳定阶段标题", () => {
  assert.deepEqual(buildReviewTaskStageMeta({ taskKind: "phrase_review", stage: "practice" }), {
    stepTag: "STEP 2. 输出练习",
    title: "试着用自己的话造一句",
  });
  assert.deepEqual(buildReviewTaskStageMeta({ taskKind: "scene_practice", stage: "feedback" }), {
    stepTag: "STEP 3. 反馈与下一步",
    title: "根据结果决定继续回场景还是进入下一题",
  });
});

test("buildFallbackExampleSentence 会生成稳定的回退参考句", () => {
  assert.equal(
    buildFallbackExampleSentence("call it a day"),
    'I can use "call it a day" in a real sentence.',
  );
});
