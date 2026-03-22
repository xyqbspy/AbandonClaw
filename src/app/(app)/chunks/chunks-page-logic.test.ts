import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFocusDetailClosePayload,
  buildFocusDetailOpenRowAction,
  buildSavedFocusDetailState,
  buildFocusDetailSecondaryActionInput,
  buildClusterFilterChange,
  buildChunksHref,
  buildChunksRouteHref,
  buildChunksSummary,
  buildFocusDetailSheetState,
  buildFocusDetailTabChangeState,
  buildManualSheetState,
  buildGeneratedSimilarSheetState,
  buildMoveIntoClusterOpenChangeState,
  buildMoveIntoClusterSheetState,
  getClusterIdFromSearchParams,
  parseChunksRouteState,
  resolveClusterFilterExpressionLabel,
  resolveFocusExpressionId,
  shouldReplaceChunksRoute,
} from "./chunks-page-logic";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

const labels = {
  loading: "加载中...",
  total: "共",
  items: "条",
};

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

test("parseChunksRouteState 会从 URL 解析 query/review/content/cluster", () => {
  const searchParams = new URLSearchParams(
    "query=burned%20out&review=reviewing&content=sentence&cluster=cluster-1",
  );

  assert.deepEqual(parseChunksRouteState(searchParams), {
    query: "burned out",
    reviewFilter: "reviewing",
    contentFilter: "sentence",
    clusterId: "cluster-1",
  });

  assert.deepEqual(parseChunksRouteState(new URLSearchParams("review=oops&content=oops")), {
    query: "",
    reviewFilter: "all",
    contentFilter: "expression",
    clusterId: "",
  });
});

test("chunks route helper 会稳定读写 cluster 查询参数", () => {
  const searchParams = new URLSearchParams("foo=1&cluster=abc");

  assert.equal(getClusterIdFromSearchParams(searchParams), "abc");
  assert.equal(
    buildChunksHref({
      searchParams,
      clusterId: "cluster-2",
    }),
    "/chunks?foo=1&cluster=cluster-2",
  );
  assert.equal(
    buildChunksHref({
      searchParams,
      clusterId: "",
    }),
    "/chunks?foo=1",
  );
});

test("buildChunksRouteHref 和 shouldReplaceChunksRoute 会稳定同步 query/filter 状态", () => {
  const searchParams = new URLSearchParams("foo=1");

  assert.equal(
    buildChunksRouteHref({
      searchParams,
      query: " burned out ",
      reviewFilter: "reviewing",
      contentFilter: "sentence",
      clusterId: "cluster-1",
    }),
    "/chunks?foo=1&query=burned+out&review=reviewing&content=sentence&cluster=cluster-1",
  );

  assert.deepEqual(
    shouldReplaceChunksRoute({
      searchParams,
      query: "",
      reviewFilter: "all",
      contentFilter: "expression",
      clusterId: "",
    }),
    {
      nextHref: "/chunks?foo=1",
      shouldReplace: false,
    },
  );
});

test("buildChunksSummary 会按 loading 状态输出摘要", () => {
  assert.equal(buildChunksSummary({ loading: true, total: 8, labels }), "加载中...");
  assert.equal(buildChunksSummary({ loading: false, total: 8, labels }), "共 8 条");
});

test("buildClusterFilterChange 会同时产出路由和筛选重置意图", () => {
  const searchParams = new URLSearchParams("foo=1&query=burned+out&review=reviewing");

  assert.deepEqual(
    buildClusterFilterChange({
      searchParams,
      clusterId: " cluster-2 ",
    }),
    {
      nextClusterId: "cluster-2",
      nextHref: "/chunks?foo=1&query=burned+out&review=reviewing&cluster=cluster-2",
      shouldResetFilters: true,
    },
  );

  assert.deepEqual(
    buildClusterFilterChange({
      searchParams,
      clusterId: "",
    }),
    {
      nextClusterId: "",
      nextHref: "/chunks?foo=1&query=burned+out&review=reviewing",
      shouldResetFilters: false,
    },
  );
});

test("resolveClusterFilterExpressionLabel 会只从表达项里找筛选标题", () => {
  const phrases = [
    createPhrase({
      userPhraseId: "p1",
      text: "call it a day",
      expressionClusterId: "cluster-1",
      learningItemType: "expression",
    }),
    createPhrase({
      userPhraseId: "p2",
      text: "I should call it a day.",
      expressionClusterId: "cluster-1",
      learningItemType: "sentence",
    }),
  ];

  assert.equal(
    resolveClusterFilterExpressionLabel({
      expressionClusterFilterId: "cluster-1",
      phrases,
    }),
    "call it a day",
  );
  assert.equal(
    resolveClusterFilterExpressionLabel({
      expressionClusterFilterId: "missing",
      phrases,
    }),
    "",
  );
});

test("resolveFocusExpressionId 会在过滤或焦点失效时回退到第一个主表达", () => {
  const resolveFocusMainExpressionIdForRow = (userPhraseId: string) =>
    userPhraseId === "child-1" ? "main-1" : userPhraseId;

  assert.equal(
    resolveFocusExpressionId({
      contentFilter: "sentence",
      focusExpressionId: "main-1",
      focusMainExpressionIds: ["main-1", "main-2"],
      resolveFocusMainExpressionId: resolveFocusMainExpressionIdForRow,
    }),
    "",
  );

  assert.equal(
    resolveFocusExpressionId({
      contentFilter: "expression",
      focusExpressionId: "child-1",
      focusMainExpressionIds: ["main-1", "main-2"],
      resolveFocusMainExpressionId: resolveFocusMainExpressionIdForRow,
    }),
    "main-1",
  );

  assert.equal(
    resolveFocusExpressionId({
      contentFilter: "expression",
      focusExpressionId: "missing",
      focusMainExpressionIds: ["main-1", "main-2"],
      resolveFocusMainExpressionId: resolveFocusMainExpressionIdForRow,
    }),
    "main-1",
  );
});

test("buildFocusDetailSheetState 会稳定输出详情面板派生状态", () => {
  const focusExpression = createPhrase({
    userPhraseId: "main-1",
    text: "call it a day",
  });

  assert.deepEqual(
    buildFocusDetailSheetState({
      focusDetail: {
        text: "Wrap It Up",
        differenceLabel: "接近收尾",
        kind: "library-similar",
        savedItem: null,
        assistItem: null,
      },
      focusDetailTrailLength: 2,
      focusRelationTab: "similar",
      focusSimilarCount: 3,
      focusContrastCount: 1,
      canShowFindRelations: true,
      focusExpression,
      savingFocusCandidateKey: "similar:wrap it up",
      playingText: "Wrap It Up",
      ttsPlaybackText: null,
      detailSpeakText: "Wrap It Up",
    }),
    {
      trailLength: 2,
      canShowSiblingNav: true,
      canShowFindRelations: true,
      savingFocusCandidate: true,
      isDetailSpeaking: true,
    },
  );

  assert.deepEqual(
    buildFocusDetailSheetState({
      focusDetail: {
        text: "call it a day",
        differenceLabel: null,
        kind: "current",
        savedItem: focusExpression,
        assistItem: null,
      },
      focusDetailTrailLength: 1,
      focusRelationTab: "contrast",
      focusSimilarCount: 2,
      focusContrastCount: 4,
      canShowFindRelations: false,
      focusExpression,
      savingFocusCandidateKey: null,
      playingText: null,
      ttsPlaybackText: "other",
      detailSpeakText: "call it a day",
    }),
    {
      trailLength: 1,
      canShowSiblingNav: false,
      canShowFindRelations: false,
      savingFocusCandidate: false,
      isDetailSpeaking: false,
    },
  );
});

test("focus detail 页面 helper 会稳定返回关闭、tab 切换和行打开参数", () => {
  assert.deepEqual(buildFocusDetailClosePayload(), {
    open: false,
    actionsOpen: false,
    trail: [],
    tab: "info",
  });

  assert.deepEqual(
    buildFocusDetailTabChangeState({
      nextTab: "similar",
      focusRelationTab: "contrast",
    }),
    {
      nextTab: "similar",
      nextRelationTab: "similar",
    },
  );

  assert.deepEqual(
    buildFocusDetailOpenRowAction({
      row: { text: "wrap it up" },
      kind: "library-similar",
    }),
    {
      nextRelationTab: "similar",
      detailInput: {
        text: "wrap it up",
        differenceLabel: null,
        kind: "library-similar",
        chainMode: "append",
      },
    },
  );

  assert.deepEqual(
    buildFocusDetailOpenRowAction({
      row: { text: "keep going" },
      kind: "contrast",
    }),
    {
      nextRelationTab: "contrast",
      detailInput: {
        text: "keep going",
        differenceLabel: null,
        kind: "contrast",
        chainMode: "append",
      },
    },
  );
});

test("buildFocusDetailSecondaryActionInput 会稳定生成保存候选参数", () => {
  const focusExpression = createPhrase({
    userPhraseId: "main-1",
    text: "call it a day",
  });

  assert.equal(
    buildFocusDetailSecondaryActionInput({
      focusExpression: null,
      focusDetail: null,
      defaultDifferenceLabel: "相关说法",
    }),
    null,
  );

  assert.deepEqual(
    buildFocusDetailSecondaryActionInput({
      focusExpression,
      focusDetail: {
        text: "wrap it up",
        differenceLabel: null,
        kind: "library-similar",
        savedItem: null,
        assistItem: null,
      },
      defaultDifferenceLabel: "相关说法",
    }),
    {
      focusExpression,
      candidate: {
        text: "wrap it up",
        differenceLabel: "相关说法",
      },
      relationKind: "similar",
    },
  );

  assert.deepEqual(
    buildFocusDetailSecondaryActionInput({
      focusExpression,
      focusDetail: {
        text: "keep going",
        differenceLabel: "继续推进",
        kind: "contrast",
        savedItem: null,
        assistItem: null,
      },
      defaultDifferenceLabel: "相关说法",
    }),
    {
      focusExpression,
      candidate: {
        text: "keep going",
        differenceLabel: "继续推进",
      },
      relationKind: "contrast",
    },
  );
});

test("move-into-cluster 页面 helper 会稳定输出 props 和 open-change 状态", () => {
  const focusExpression = createPhrase({
    userPhraseId: "main-1",
    text: "call it a day",
  });
  const groups = [
    {
      key: "g1",
      title: "group 1",
      description: "",
      candidates: [],
      isCluster: false,
    },
  ];

  assert.deepEqual(
    buildMoveIntoClusterSheetState({
      focusExpression,
      groups,
      expandedGroups: { g1: true },
      selectedMap: { a: true },
      submitting: true,
      appleButtonClassName: "btn",
      labels: {
        close: "关闭",
        title: "移入表达簇",
        description: "desc",
        currentMain: "当前主表达：",
        empty: "empty",
        selectGroup: "整组选择",
        selectedGroup: "已整组选择",
        coveredByMain: "被主表达覆盖",
        submit: "确认移入",
        mainExpression: "主表达",
        subExpression: "子表达",
      },
    }),
    {
      focusExpression,
      groups,
      expandedGroups: { g1: true },
      selectedMap: { a: true },
      submitting: true,
      appleButtonClassName: "btn",
      labels: {
        close: "关闭",
        title: "移入表达簇",
        description: "desc",
        currentMain: "当前主表达：",
        empty: "empty",
        selectGroup: "整组选择",
        selectedGroup: "已整组选择",
        coveredByMain: "被主表达覆盖",
        submit: "确认移入",
        mainExpression: "主表达",
        subExpression: "子表达",
        selected: "已选",
        unselected: "未选",
        covered: "已覆盖",
      },
    },
  );

  assert.deepEqual(buildMoveIntoClusterOpenChangeState(true), {
    open: true,
    shouldResetSelection: false,
  });
  assert.deepEqual(buildMoveIntoClusterOpenChangeState(false), {
    open: false,
    shouldResetSelection: true,
  });
});

test("buildManualSheetState 会稳定输出录入弹层标题和按钮状态", () => {
  assert.deepEqual(
    buildManualSheetState({
      manualItemType: "expression",
      manualExpressionAssist: { inputItem: { text: "call it a day" } },
      savingManual: false,
      savingManualSentence: false,
      labels: {
        title: "添加学习内容",
        description: "desc",
        itemTypeLabel: "记录类型",
        saveSentence: "保存句子",
        saveSelectedExpressions: "保存勾选表达",
        saveToLibrary: "保存到表达库",
        saveAndReview: "保存并加入复习",
      },
    }),
    {
      title: "添加学习内容",
      description: "desc",
      itemTypeLabel: "记录类型",
      isSaving: false,
      footerGridClassName: "grid-cols-2",
      primaryActionLabel: "保存勾选表达",
      secondaryActionLabel: "保存并加入复习",
      showSecondaryAction: true,
    },
  );

  assert.deepEqual(
    buildManualSheetState({
      manualItemType: "sentence",
      manualExpressionAssist: null,
      savingManual: false,
      savingManualSentence: true,
      labels: {
        title: "添加学习内容",
        description: "desc",
        itemTypeLabel: "记录类型",
        saveSentence: "保存句子",
        saveSelectedExpressions: "保存勾选表达",
        saveToLibrary: "保存到表达库",
        saveAndReview: "保存并加入复习",
      },
    }),
    {
      title: "添加学习内容",
      description: "desc",
      itemTypeLabel: "记录类型",
      isSaving: true,
      footerGridClassName: "grid-cols-1",
      primaryActionLabel: "保存句子...",
      secondaryActionLabel: "保存并加入复习...",
      showSecondaryAction: false,
    },
  );
});

test("buildGeneratedSimilarSheetState 会稳定输出候选弹层状态", () => {
  assert.deepEqual(
    buildGeneratedSimilarSheetState({
      similarSeedExpression: { text: "call it a day" },
      generatingSimilarForId: null,
      generatedSimilarCandidates: [{ text: "wrap it up" }],
      savingSelectedSimilar: false,
      labels: {
        title: "生成同类表达",
        description: "desc",
        centerExpression: "中心表达",
        generating: "正在生成候选",
        empty: "暂无候选",
        close: "关闭",
        submit: "加入表达库",
      },
    }),
    {
      title: "生成同类表达",
      description: "desc",
      centerExpressionLabel: "中心表达",
      generatingLabel: "正在生成候选...",
      emptyLabel: "暂无候选",
      closeLabel: "关闭",
      submitLabel: "加入表达库",
      showSeedExpression: true,
      showGenerating: false,
      showEmpty: false,
      showCandidates: true,
      submitDisabled: false,
    },
  );

  assert.deepEqual(
    buildGeneratedSimilarSheetState({
      similarSeedExpression: null,
      generatingSimilarForId: "p1",
      generatedSimilarCandidates: [],
      savingSelectedSimilar: true,
      labels: {
        title: "生成同类表达",
        description: "desc",
        centerExpression: "中心表达",
        generating: "正在生成候选",
        empty: "暂无候选",
        close: "关闭",
        submit: "加入表达库",
      },
    }),
    {
      title: "生成同类表达",
      description: "desc",
      centerExpressionLabel: "中心表达",
      generatingLabel: "正在生成候选...",
      emptyLabel: "暂无候选",
      closeLabel: "关闭",
      submitLabel: "加入表达库...",
      showSeedExpression: false,
      showGenerating: true,
      showEmpty: false,
      showCandidates: false,
      submitDisabled: true,
    },
  );
});
