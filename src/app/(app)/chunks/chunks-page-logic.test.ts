import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClusterFilterChange,
  buildChunksHref,
  buildChunksRouteHref,
  buildChunksSummary,
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
