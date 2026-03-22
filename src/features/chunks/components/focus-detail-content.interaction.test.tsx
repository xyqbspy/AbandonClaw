import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FocusDetailContent } from "./focus-detail-content";
import { FocusDetailRelatedItem } from "./focus-detail-selectors";

afterEach(() => {
  cleanup();
});

const labels = {
  speakSentence: "朗读",
  candidateBadge: "候选",
  noTranslation: "暂无翻译",
  loading: "加载中",
  enriching: "补全当前chunk...",
  tabInfo: "详情",
  tabSimilar: "同类",
  tabContrast: "对照",
  commonUsage: "常见用法",
  typicalScenario: "典型场景",
  semanticFocus: "语义重点",
  reviewStage: "复习阶段",
  usageHintFallback: "暂无用法提示",
  typicalScenarioPending: "待补充场景",
  semanticFocusPending: "待补充语义重点",
  reviewHintFallback: "准备复习",
  sourceSentence: "来源句子",
  noSourceSentence: "暂无来源句子",
  similarHint: "同类提示",
  emptySimilar: "暂无同类",
  contrastHint: "对照提示",
  emptyContrast: "暂无对照",
};

function createRow(
  overrides: Partial<{
    userPhraseId: string;
    text: string;
    translation: string | null;
  }> = {},
) {
  return {
    userPhraseId: overrides.userPhraseId ?? "row-1",
    phraseId: "phrase-1",
    text: overrides.text ?? "wear yourself out",
    normalizedText: (overrides.text ?? "wear yourself out").toLowerCase(),
    translation: overrides.translation ?? "把自己拖垮",
    usageNote: null,
    difficulty: null,
    tags: [],
    sourceSceneSlug: null,
    sourceType: "manual" as const,
    sourceNote: null,
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
    learningItemType: "expression" as const,
    savedAt: "2026-03-21T00:00:00.000Z",
    lastSeenAt: "2026-03-21T00:00:00.000Z",
    reviewStatus: "saved" as const,
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    masteredAt: null,
  };
}

function createRelatedItem(
  overrides: Partial<FocusDetailRelatedItem> = {},
): FocusDetailRelatedItem {
  const savedItem = overrides.savedItem ?? createRow({
    userPhraseId: overrides.key ?? "row-1",
    text: overrides.text ?? "wear yourself out",
    translation: overrides.translation ?? "把自己拖垮",
  });

  return {
    key: overrides.key ?? `saved:${savedItem.userPhraseId}`,
    text: overrides.text ?? savedItem.text,
    translation: overrides.translation ?? savedItem.translation,
    differenceLabel: overrides.differenceLabel ?? null,
    kind: overrides.kind ?? "library-similar",
    savedItem,
  };
}

test("FocusDetailContent 会处理朗读和 tab 切换", () => {
  const speaks: string[] = [];
  const tabChanges: string[] = [];

  render(
    <FocusDetailContent
      detail={{
        text: "burn yourself out",
        kind: "current",
        savedItem: createRow({
          userPhraseId: "saved-1",
          text: "burn yourself out",
          translation: "把自己耗尽",
        }),
      }}
      activeAssistItem={null}
      focusDetailTab="info"
      focusDetailLoading={false}
      isDetailSpeaking={false}
      detailSpeakText="burn yourself out"
      similarRows={[]}
      contrastRows={[]}
      isSavedRelatedLoading={false}
      usageHint="提醒别透支自己"
      typicalScenario="长期加班时"
      semanticFocus="过度消耗"
      reviewHint="准备复习"
      exampleCards={<div>example cards</div>}
      labels={labels}
      onSpeak={(text) => speaks.push(text)}
      onTabChange={(tab) => tabChanges.push(tab)}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: labels.speakSentence }));
  fireEvent.click(screen.getByRole("tab", { name: labels.tabSimilar }));
  fireEvent.click(screen.getByRole("tab", { name: labels.tabContrast }));

  assert.deepEqual(speaks, ["burn yourself out"]);
  assert.deepEqual(tabChanges, ["similar", "contrast"]);
});

test("FocusDetailContent 候选态会隐藏朗读入口，并在无例句时使用来源 fallback", () => {
  render(
    <FocusDetailContent
      detail={{
        text: "burn yourself out",
        differenceLabel: "和 wear yourself out 语气不同",
        kind: "suggested-similar",
        savedItem: null,
      }}
      activeAssistItem={null}
      focusDetailTab="info"
      focusDetailLoading
      isDetailSpeaking={false}
      detailSpeakText="burn yourself out"
      similarRows={[]}
      contrastRows={[]}
      isSavedRelatedLoading={false}
      usageHint=""
      typicalScenario=""
      semanticFocus=""
      reviewHint=""
      exampleCards={null}
      labels={labels}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
    />,
  );

  assert.equal(screen.queryByRole("button", { name: labels.speakSentence }), null);
  assert.ok(screen.getByText(labels.candidateBadge));
  assert.equal(screen.queryByText("example cards"), null);
});

test("FocusDetailContent 会处理同类与对照列表点击", () => {
  const similarOpened: string[] = [];
  const contrastOpened: string[] = [];
  const similarRow = createRelatedItem({
    key: "saved:similar-1",
    text: "wear yourself out",
    translation: "把自己拖垮",
    kind: "library-similar",
  });
  const contrastRow = createRelatedItem({
    key: "saved:contrast-1",
    text: "save your energy",
    translation: "留点力气",
    kind: "contrast",
  });

  const { rerender } = render(
    <FocusDetailContent
      detail={{
        text: "burn yourself out",
        kind: "current",
        savedItem: createRow({
          userPhraseId: "saved-1",
          text: "burn yourself out",
          translation: "把自己耗尽",
        }),
      }}
      activeAssistItem={null}
      focusDetailTab="similar"
      focusDetailLoading={false}
      isDetailSpeaking={false}
      detailSpeakText="burn yourself out"
      similarRows={[similarRow]}
      contrastRows={[contrastRow]}
      isSavedRelatedLoading={false}
      usageHint="提醒别透支自己"
      typicalScenario="长期加班时"
      semanticFocus="过度消耗"
      reviewHint="准备复习"
      exampleCards={<div>example cards</div>}
      labels={labels}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={(row) => similarOpened.push(row.key)}
      onOpenContrastRow={(row) => contrastOpened.push(row.key)}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /wear yourself out/ }));
  assert.deepEqual(similarOpened, ["saved:similar-1"]);

  rerender(
    <FocusDetailContent
      detail={{
        text: "burn yourself out",
        kind: "current",
        savedItem: createRow({
          userPhraseId: "saved-1",
          text: "burn yourself out",
          translation: "把自己耗尽",
        }),
      }}
      activeAssistItem={null}
      focusDetailTab="contrast"
      focusDetailLoading={false}
      isDetailSpeaking={false}
      detailSpeakText="burn yourself out"
      similarRows={[similarRow]}
      contrastRows={[contrastRow]}
      isSavedRelatedLoading={false}
      usageHint="提醒别透支自己"
      typicalScenario="长期加班时"
      semanticFocus="过度消耗"
      reviewHint="准备复习"
      exampleCards={<div>example cards</div>}
      labels={labels}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={(row) => similarOpened.push(row.key)}
      onOpenContrastRow={(row) => contrastOpened.push(row.key)}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /save your energy/ }));
  assert.deepEqual(contrastOpened, ["saved:contrast-1"]);
});

test("FocusDetailContent 在无可选项时不会错误渲染可点击行", () => {
  const { rerender } = render(
    <FocusDetailContent
      detail={{
        text: "burn yourself out",
        kind: "current",
        savedItem: createRow({
          userPhraseId: "saved-1",
          text: "burn yourself out",
          translation: "把自己耗尽",
        }),
      }}
      activeAssistItem={null}
      focusDetailTab="similar"
      focusDetailLoading={false}
      isDetailSpeaking={false}
      detailSpeakText="burn yourself out"
      similarRows={[]}
      contrastRows={[]}
      isSavedRelatedLoading
      usageHint="提醒别透支自己"
      typicalScenario="长期加班时"
      semanticFocus="过度消耗"
      reviewHint="准备复习"
      exampleCards={<div>example cards</div>}
      labels={labels}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
    />,
  );

  const similarPanel = screen.getByRole("tabpanel");
  assert.equal(within(similarPanel).queryAllByRole("button").length, 0);

  rerender(
    <FocusDetailContent
      detail={{
        text: "burn yourself out",
        kind: "current",
        savedItem: createRow({
          userPhraseId: "saved-1",
          text: "burn yourself out",
          translation: "把自己耗尽",
        }),
      }}
      activeAssistItem={null}
      focusDetailTab="contrast"
      focusDetailLoading={false}
      isDetailSpeaking={false}
      detailSpeakText="burn yourself out"
      similarRows={[]}
      contrastRows={[]}
      isSavedRelatedLoading={false}
      usageHint="提醒别透支自己"
      typicalScenario="长期加班时"
      semanticFocus="过度消耗"
      reviewHint="准备复习"
      exampleCards={<div>example cards</div>}
      labels={labels}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
    />,
  );

  const contrastPanel = screen.getByRole("tabpanel");
  assert.equal(within(contrastPanel).queryAllByRole("button").length, 0);
});

test("FocusDetailContent 补全中会显示详情占位态", () => {
  render(
    <FocusDetailContent
      detail={{
        text: "get through the day",
        kind: "current",
        savedItem: createRow({
          userPhraseId: "saved-2",
          text: "get through the day",
          translation: null,
        }),
      }}
      activeAssistItem={null}
      focusDetailTab="info"
      focusDetailLoading={false}
      retryingEnrichment
      isDetailSpeaking={false}
      detailSpeakText="get through the day"
      similarRows={[]}
      contrastRows={[]}
      isSavedRelatedLoading={false}
      usageHint=""
      typicalScenario=""
      semanticFocus=""
      reviewHint=""
      exampleCards={<div>example cards</div>}
      labels={labels}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
    />,
  );

  assert.ok(screen.getAllByText(labels.enriching).length >= 1);
  assert.ok(screen.getByLabelText("常见用法补全中"));
  assert.ok(screen.getByLabelText("例句补全中"));
  assert.equal(screen.queryByText("example cards"), null);
});
