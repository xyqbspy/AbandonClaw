import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { ChunksListView } from "./chunks-list-view";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  globalThis.window = dom.window as unknown as typeof globalThis & Window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
}

afterEach(() => {
  cleanup();
});

const labels = {
  sentenceUnit: "句子",
  expressionUnit: "表达",
  learningInfoPending: "学习信息补全中",
  learningInfoFailed: "学习信息补全失败",
  noTranslation: "暂无翻译",
  usageHint: "使用提示",
  sentenceSource: "来源场景",
  sentenceSourceFallback: "暂无来源",
  sentenceUnitHint: "句子会带出其中表达",
  sentenceExpressions: "句中表达",
  sentenceExpressionsHint: "可直接保存为表达",
  sentenceSavedExpression: "已记录",
  sentenceSaveExpression: "记录",
  sentenceNoExpressions: "暂无表达",
  reviewStage: "复习阶段",
  similarExpressions: "相关表达",
  translationLabel: "释义",
  sourceSentence: "例句",
  speakSentence: "朗读",
  noSourceSentence: "暂无例句",
  semanticFocusLabel: "语义重点",
  semanticFocusPending: "生成中",
  diffRelated: "暂无补充",
  typicalScenarioLabel: "典型场景",
  typicalScenarioPending: "生成中",
  hideSimilar: "收起",
  showSimilar: "展开",
  viewAllSimilar: "查看整组",
  similarEmpty: "暂无相关表达",
  generatingSimilar: "生成中",
  findMoreSimilar: "找更多相关表达",
  manualRecorded: "手动录入",
  sourceNoteDisplay: "备注",
  collapseDetail: "收起详情",
  expandDetail: "展开详情",
  inThisSentence: "在这句话里",
  commonUsage: "常见用法",
  sentenceRecordExpression: "记录句中表达",
  mapUnavailable: "暂无表达地图",
  mapPending: "打开中",
  openMap: "查看表达地图",
  sourceScene: "来源场景",
  retryEnrichment: "重试补全",
  learningInfoPendingHint: "稍后会补全更多信息",
};

function createPhrase(overrides: Partial<UserPhraseItemResponse> = {}): UserPhraseItemResponse {
  return {
    userPhraseId: overrides.userPhraseId ?? "phrase-1",
    phraseId: overrides.phraseId ?? "raw-1",
    text: overrides.text ?? "burn yourself out",
    normalizedText: overrides.normalizedText ?? "burn yourself out",
    translation: overrides.translation ?? "把自己耗尽",
    usageNote: overrides.usageNote ?? "表示持续消耗精力直到状态很差。",
    difficulty: overrides.difficulty ?? null,
    tags: overrides.tags ?? [],
    sourceSceneSlug: overrides.sourceSceneSlug ?? "coffee-chat",
    sourceType: overrides.sourceType ?? "manual",
    sourceNote: overrides.sourceNote ?? "来源备注",
    sourceSentenceIndex: overrides.sourceSentenceIndex ?? null,
    sourceSentenceText: overrides.sourceSentenceText ?? "Don't burn yourself out this week.",
    sourceChunkText: overrides.sourceChunkText ?? null,
    expressionClusterId: overrides.expressionClusterId ?? "cluster-1",
    expressionClusterRole: overrides.expressionClusterRole ?? "main",
    expressionClusterMainUserPhraseId: overrides.expressionClusterMainUserPhraseId ?? "phrase-1",
    aiEnrichmentStatus: overrides.aiEnrichmentStatus ?? "done",
    semanticFocus: overrides.semanticFocus ?? "强调过度消耗",
    typicalScenario: overrides.typicalScenario ?? "工作强度过高时",
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
  };
}

test("ChunksListView 会保留卡片展开、相似项展开和句子记录操作", () => {
  const toggledCardIds: string[] = [];
  const toggledSimilarIds: string[] = [];
  let openedComposerCount = 0;

  const mainExpression = createPhrase({
    userPhraseId: "expr-1",
    text: "burn yourself out",
    normalizedText: "burn yourself out",
    expressionClusterId: "cluster-1",
    expressionClusterRole: "main",
    expressionClusterMainUserPhraseId: "expr-1",
    sourceType: "manual",
  });
  const siblingExpression = createPhrase({
    userPhraseId: "expr-2",
    phraseId: "raw-2",
    text: "wear yourself out",
    normalizedText: "wear yourself out",
    translation: "把自己拖垮",
    expressionClusterId: "cluster-1",
    expressionClusterRole: "variant",
    expressionClusterMainUserPhraseId: "expr-1",
    sourceType: "manual",
  });
  const sentenceRow = createPhrase({
    userPhraseId: "sentence-1",
    phraseId: "sentence-raw-1",
    text: "Don't burn yourself out this week.",
    normalizedText: "don't burn yourself out this week.",
    translation: "这周别把自己累垮。",
    learningItemType: "sentence",
    expressionClusterId: null,
    expressionClusterRole: null,
    expressionClusterMainUserPhraseId: null,
    sourceType: "scene",
    sourceSceneSlug: "coffee-chat",
  });

  const view = render(
    <ChunksListView
      phrases={[mainExpression, sentenceRow]}
      clusterMembersByClusterId={new Map([["cluster-1", [mainExpression, siblingExpression]]])}
      expandedSimilarIds={{ "expr-1": true }}
      expandedCardIds={{ "expr-1": true, "sentence-1": true }}
      expandedIds={{}}
      savedSentenceExpressionKeys={{}}
      retryingEnrichmentIds={{}}
      reviewStatusLabel={{ saved: "已保存", reviewing: "复习中", mastered: "已掌握", archived: "已归档" }}
      savingSentenceExpressionKey={null}
      generatingSimilarForId={null}
      mapOpeningForId={null}
      openingSourceSceneSlug={null}
      playingText={null}
      ttsPlaybackText={null}
      ttsLoadingText={null}
      appleButtonClassName="btn"
      appleSurfaceClassName=""
      labels={labels}
      toggleCardExpanded={(userPhraseId) => toggledCardIds.push(userPhraseId)}
      toggleSimilarExpanded={(userPhraseId) => toggledSimilarIds.push(userPhraseId)}
      toggleExpanded={() => undefined}
      getUsageHint={() => "表示过度投入导致身心耗尽"}
      getReviewActionHint={() => "先听再复习"}
      getPrimaryActionLabel={() => "开始复习"}
      buildDifferenceNote={(center, target) => `${target} 比 ${center} 更口语`}
      extractExpressionsFromSentenceItem={() => ["burn yourself out"]}
      renderExampleSentenceCards={() => <div>例句卡片</div>}
      renderSentenceWithExpressionHighlight={(sentence) => sentence}
      handlePronounceSentence={() => undefined}
      saveExpressionFromSentence={async () => undefined}
      openExpressionComposerFromSentence={() => {
        openedComposerCount += 1;
      }}
      startReviewFromCard={() => undefined}
      openExpressionMap={async () => undefined}
      openSourceScene={() => undefined}
      retryAiEnrichment={async () => undefined}
      applyClusterFilter={() => undefined}
      openGenerateSimilarSheet={async () => undefined}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: "burn yourself out" }));
  fireEvent.click(view.getByRole("button", { name: "burn yourself out" }));
  fireEvent.click(view.getByRole("button", { name: "相关表达 收起" }));
  fireEvent.click(view.getByRole("button", { name: "记录句中表达" }));

  assert.deepEqual(toggledCardIds, ["expr-1", "expr-1"]);
  assert.deepEqual(toggledSimilarIds, ["expr-1"]);
  assert.equal(openedComposerCount, 1);
  assert.ok(view.getByText("wear yourself out"));
});
