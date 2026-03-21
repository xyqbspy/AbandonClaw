import assert from "node:assert/strict";
import test from "node:test";
import { buildFocusDetailViewModel } from "./focus-detail-selectors";
import {
  ManualExpressionAssistResponse,
  UserPhraseItemResponse,
  UserPhraseRelationItemResponse,
} from "@/lib/utils/phrases-api";

const defaults = {
  usageHintFallback: "默认用法提示",
  typicalScenarioPending: "待补充场景",
  semanticFocusPending: "待补充语义重点",
  reviewHintFallback: "默认复习提示",
};

const createPhrase = (
  overrides: Partial<UserPhraseItemResponse> = {},
): UserPhraseItemResponse => ({
  userPhraseId: overrides.userPhraseId ?? "phrase-1",
  phraseId: overrides.phraseId ?? "phrase-1",
  text: overrides.text ?? "burn yourself out",
  normalizedText: overrides.normalizedText ?? "burn yourself out",
  translation: overrides.translation ?? "把自己耗尽",
  usageNote: overrides.usageNote ?? "多用于提醒过度消耗",
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

const createRelation = (
  item: UserPhraseItemResponse,
  relationType: UserPhraseRelationItemResponse["relationType"],
): UserPhraseRelationItemResponse => ({
  sourceUserPhraseId: "source-1",
  relationType,
  item,
});

const createAssistResponse = (
  overrides: Partial<ManualExpressionAssistResponse> = {},
): ManualExpressionAssistResponse => ({
  version: "v1",
  inputItem: {
    text: "burn yourself out",
    translation: "把自己耗尽",
    usageNote: "常用于提醒别过度透支",
    examples: [],
    semanticFocus: "过度消耗",
    typicalScenario: "连续加班后提醒自己",
    ...overrides.inputItem,
  },
  similarExpressions: overrides.similarExpressions ?? [],
  contrastExpressions: overrides.contrastExpressions ?? [],
});

test("buildFocusDetailViewModel 在 focusDetail 为空时返回默认值", () => {
  const viewModel = buildFocusDetailViewModel({
    focusDetail: null,
    focusExpression: null,
    focusAssistData: null,
    savedRelationCache: {},
    clusterMembersByClusterId: new Map(),
    phraseByNormalized: new Map(),
    savedRelationLoadingKey: null,
    isContrastDerivedExpression: () => false,
    getUsageHint: () => "不会被调用",
    getReviewActionHint: () => "不会被调用",
    defaults,
  });

  assert.equal(viewModel.activeAssistItem, null);
  assert.equal(viewModel.detailSpeakText, "");
  assert.deepEqual(viewModel.similarRows, []);
  assert.deepEqual(viewModel.contrastRows, []);
  assert.equal(viewModel.isSavedRelatedLoading, false);
  assert.equal(viewModel.usageHint, defaults.usageHintFallback);
  assert.equal(viewModel.typicalScenario, defaults.typicalScenarioPending);
  assert.equal(viewModel.semanticFocus, defaults.semanticFocusPending);
  assert.equal(viewModel.reviewHint, defaults.reviewHintFallback);
  assert.equal(viewModel.canShowFindRelations, false);
});

test("buildFocusDetailViewModel 会合并已保存关系与簇成员，并去重和过滤对照派生项", () => {
  const focusRow = createPhrase({
    userPhraseId: "main-1",
    text: "burn yourself out",
    normalizedText: "burn yourself out",
    expressionClusterId: "cluster-1",
    expressionClusterRole: "main",
    expressionClusterMainUserPhraseId: "main-1",
    typicalScenario: "长期透支自己时",
    semanticFocus: "消耗过度",
    reviewStatus: "reviewing",
  });
  const savedSimilar = createPhrase({
    userPhraseId: "sim-1",
    text: "overwork yourself",
    normalizedText: "overwork yourself",
  });
  const duplicateClusterSimilar = createPhrase({
    userPhraseId: "sim-2",
    text: "overwork yourself",
    normalizedText: "overwork yourself",
    expressionClusterId: "cluster-1",
    sourceNote: null,
  });
  const clusterSimilar = createPhrase({
    userPhraseId: "sim-3",
    text: "push yourself too hard",
    normalizedText: "push yourself too hard",
    expressionClusterId: "cluster-1",
    sourceNote: null,
  });
  const derivedClusterMember = createPhrase({
    userPhraseId: "derived-1",
    text: "run yourself ragged",
    normalizedText: "run yourself ragged",
    expressionClusterId: "cluster-1",
    sourceNote: "focus-contrast-ai",
  });
  const savedContrast = createPhrase({
    userPhraseId: "contrast-1",
    text: "pace yourself",
    normalizedText: "pace yourself",
  });
  const generatedContrastSaved = createPhrase({
    userPhraseId: "contrast-2",
    text: "take it easy",
    normalizedText: "take it easy",
  });

  const viewModel = buildFocusDetailViewModel({
    focusDetail: {
      text: "  burn yourself out  ",
      kind: "current",
      savedItem: focusRow,
      assistItem: null,
    },
    focusExpression: focusRow,
    focusAssistData: createAssistResponse({
      contrastExpressions: [
        { text: "take it easy", differenceLabel: "更强调放松" },
        { text: "pace yourself", differenceLabel: "更强调节奏控制" },
        { text: "missing contrast", differenceLabel: "库里不存在" },
      ],
    }),
    savedRelationCache: {
      "main-1": {
        loaded: true,
        rows: [
          createRelation(savedSimilar, "similar"),
          createRelation(savedContrast, "contrast"),
        ],
      },
    },
    clusterMembersByClusterId: new Map([
      [
        "cluster-1",
        [focusRow, duplicateClusterSimilar, clusterSimilar, derivedClusterMember],
      ],
    ]),
    phraseByNormalized: new Map([
      ["take it easy", generatedContrastSaved],
      ["pace yourself", savedContrast],
    ]),
    savedRelationLoadingKey: "main-1",
    isContrastDerivedExpression: (sourceNote) => sourceNote === "focus-contrast-ai",
    getUsageHint: (item) => `用法:${item.text}`,
    getReviewActionHint: (status) => `复习:${status}`,
    defaults,
  });

  assert.equal(viewModel.activeAssistItem?.text, "burn yourself out");
  assert.equal(viewModel.detailSpeakText, "burn yourself out");
  assert.deepEqual(
    viewModel.similarRows.map((row) => row.userPhraseId),
    ["sim-1", "sim-3"],
  );
  assert.deepEqual(
    viewModel.contrastRows.map((row) => row.userPhraseId),
    ["contrast-1", "contrast-2"],
  );
  assert.equal(viewModel.isSavedRelatedLoading, true);
  assert.equal(viewModel.usageHint, "用法:burn yourself out");
  assert.equal(viewModel.typicalScenario, "长期透支自己时");
  assert.equal(viewModel.semanticFocus, "消耗过度");
  assert.equal(viewModel.reviewHint, "复习:reviewing");
  assert.equal(viewModel.canShowFindRelations, false);
});

test("buildFocusDetailViewModel 对非当前主表达详情优先使用详情自身 assist，并走 fallback", () => {
  const detailAssistItem = {
    text: "barely slept",
    translation: "几乎没睡",
    usageNote: "描述睡得很少",
    examples: [],
    semanticFocus: "睡眠不足",
    typicalScenario: "熬夜后的抱怨",
  };

  const viewModel = buildFocusDetailViewModel({
    focusDetail: {
      text: "barely slept",
      kind: "contrast",
      savedItem: null,
      assistItem: detailAssistItem,
    },
    focusExpression: createPhrase({
      userPhraseId: "main-1",
      text: "burn yourself out",
      normalizedText: "burn yourself out",
    }),
    focusAssistData: createAssistResponse({
      inputItem: {
        text: "should not win",
        translation: "不应被采用",
        usageNote: "不应被采用",
        examples: [],
        semanticFocus: "不应被采用",
        typicalScenario: "不应被采用",
      },
    }),
    savedRelationCache: {},
    clusterMembersByClusterId: new Map(),
    phraseByNormalized: new Map(),
    savedRelationLoadingKey: null,
    isContrastDerivedExpression: () => false,
    getUsageHint: () => "不会被调用",
    getReviewActionHint: () => "不会被调用",
    defaults,
  });

  assert.equal(viewModel.activeAssistItem?.text, "barely slept");
  assert.equal(viewModel.usageHint, "描述睡得很少");
  assert.equal(viewModel.typicalScenario, "熬夜后的抱怨");
  assert.equal(viewModel.semanticFocus, "睡眠不足");
  assert.equal(viewModel.reviewHint, defaults.reviewHintFallback);
  assert.equal(viewModel.canShowFindRelations, false);
});

test("buildFocusDetailViewModel 仅在当前主表达且无 assist 结果时允许查找关系", () => {
  const focusRow = createPhrase({
    userPhraseId: "main-1",
    text: "call it a day",
    normalizedText: "call it a day",
  });

  const viewModel = buildFocusDetailViewModel({
    focusDetail: {
      text: "call it a day",
      kind: "current",
      savedItem: focusRow,
      assistItem: null,
    },
    focusExpression: focusRow,
    focusAssistData: null,
    savedRelationCache: {},
    clusterMembersByClusterId: new Map(),
    phraseByNormalized: new Map(),
    savedRelationLoadingKey: null,
    isContrastDerivedExpression: () => false,
    getUsageHint: () => "今天先到这",
    getReviewActionHint: () => "复习一次",
    defaults,
  });

  assert.equal(viewModel.canShowFindRelations, true);
  assert.equal(viewModel.isSavedRelatedLoading, false);
});
