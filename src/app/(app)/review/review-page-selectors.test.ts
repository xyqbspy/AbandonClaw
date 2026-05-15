import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFallbackExampleSentence,
  buildReviewProgressModel,
  buildReviewTaskStageMeta,
  getReviewSchedulingReason,
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
  assert.equal(reviewing?.sourceSceneAvailable, false);
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
        sourceSceneAvailable: false,
        sourceSentenceText: null,
        expressionClusterId: null,
        reviewStatus: "saved",
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        nextReviewAt: null,
        recognitionState: null,
        outputConfidence: null,
        fullOutputStatus: null,
        variantRewriteStatus: null,
        variantRewritePromptId: null,
        fullOutputCoverage: null,
        schedulingFocus: null,
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

test("buildReviewTaskStageMeta 会为两类任务返回稳定阶段标题与进度索引", () => {
  assert.deepEqual(buildReviewTaskStageMeta({ taskKind: "phrase_review", stage: "rewrite" }), {
    stepTag: "STEP 3. 改写练习（换对象时态）",
    title: "换一个对象、时态或视角，把表达重新组织一遍",
    stepIndex: 3,
    totalSteps: 5,
  });
  assert.deepEqual(buildReviewTaskStageMeta({ taskKind: "phrase_review", stage: "practice" }), {
    stepTag: "STEP 4. 完整输出（脱稿说一遍）",
    title: "脱离填空，直接把整句或两句完整说出来",
    stepIndex: 4,
    totalSteps: 5,
  });
  assert.deepEqual(buildReviewTaskStageMeta({ taskKind: "scene_practice", stage: "feedback" }), {
    stepTag: "STEP 3. 反馈与下一步",
    title: "根据结果决定继续回场景还是进入下一题",
    stepIndex: 3,
    totalSteps: 3,
  });
  assert.deepEqual(buildReviewTaskStageMeta({ taskKind: "scene_practice", stage: "recall" }), {
    stepTag: "STEP 1. 场景回补（再现这句）",
    title: "先回忆这句该怎么接",
    stepIndex: 1,
    totalSteps: 3,
  });
  assert.deepEqual(buildReviewTaskStageMeta({ taskKind: "phrase_review", stage: "feedback" }), {
    stepTag: "STEP 5. 复习判断（标记掌握度）",
    title: "结合前面的表现，给这次复习一个明确判断",
    stepIndex: 5,
    totalSteps: 5,
  });
});

test("buildFallbackExampleSentence 会生成稳定的回退参考句", () => {
  assert.equal(
    buildFallbackExampleSentence("call it a day"),
    'I can use "call it a day" in a real sentence.',
  );
});

test("getReviewSchedulingReason 会返回稳定的调度解释", () => {
  assert.equal(
    getReviewSchedulingReason({ schedulingFocus: "low_output_confidence" }),
    "这条会优先出现，因为你上次还缺少主动输出信心。",
  );
  assert.equal(
    getReviewSchedulingReason({ schedulingFocus: "missing_target_coverage" }),
    "这条会优先出现，因为上次完整输出还没用进目标表达。",
  );
  assert.equal(
    getReviewSchedulingReason({ schedulingFocus: "missing_full_output" }),
    "这条会优先出现，因为你还没完成过完整输出。",
  );
  assert.equal(
    getReviewSchedulingReason({ schedulingFocus: "missing_variant_rewrite" }),
    "这条会优先出现，因为你还没完成迁移改写。",
  );
  assert.equal(
    getReviewSchedulingReason({ schedulingFocus: "recognition_only" }),
    "这条会优先出现，因为它还停留在识别层。",
  );
  assert.equal(getReviewSchedulingReason({ schedulingFocus: null }), null);
});
