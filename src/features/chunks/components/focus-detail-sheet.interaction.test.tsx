import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { FocusDetailSheet } from "./focus-detail-sheet";

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
  title: "表达详情",
  backToCurrent: "返回",
  findRelations: "查找同类 / 对照表达",
  prev: "上一条",
  next: "下一条",
  detailMoreActions: "更多操作",
  detailOpenAsMain: "设为本簇主表达",
  moveIntoCluster: "移入当前表达簇",
  detachClusterMember: "设为独立主表达",
  addThisExpression: "加入表达库",
  addingThisExpression: "加入中...",
  addedThisExpression: "已加入",
  completeAssist: "完成",
  confirmCancel: "取消",
  confirmContinue: "继续",
  detailOpenAsMainConfirmTitle: "设为主表达？",
  detailOpenAsMainConfirmDesc: "会把该表达设为当前表达簇的主表达。",
  detachClusterMemberConfirmTitle: "确认独立？",
  detachClusterMemberConfirmDesc: "会把当前表达拆出为独立表达。",
  detailCandidateBadge: "AI 候选",
  noTranslation: "暂无翻译",
  detailLoading: "正在加载表达详情...",
  detailTabInfo: "详情",
  detailTabSavedSimilar: "同类表达",
  detailTabContrast: "对照表达",
  commonUsage: "常见用法",
  typicalScenarioLabel: "典型场景",
  semanticFocusLabel: "语义重点",
  reviewStage: "当前阶段",
  usageHintFallback: "暂无用法提示",
  typicalScenarioPending: "待补充场景",
  semanticFocusPending: "待补充语义重点",
  sourceSentence: "来源句子",
  noSourceSentence: "暂无来源句子",
  detailSimilarHint: "同类提示",
  focusEmptySimilar: "暂无同类",
  detailContrastHint: "对照提示",
  noContrastExpressions: "暂无对照",
  speakSentence: "朗读",
};

function createSavedItem() {
  return {
    userPhraseId: "phrase-1",
    phraseId: "p1",
    text: "burn yourself out",
    normalizedText: "burn yourself out",
    translation: "把自己耗尽",
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

test("FocusDetailSheet 会通过更多操作触发查找关系并保留主操作", () => {
  let findCount = 0;
  let primaryCount = 0;

  const view = render(
    <FocusDetailSheet
      open
      detail={{ text: "burn yourself out", kind: "current", savedItem: createSavedItem() }}
      detailTab="info"
      detailLoading={false}
      detailActionsOpen
      detailConfirmAction={null}
      trailLength={1}
      canShowSiblingNav={false}
      canShowFindRelations
      focusAssistLoading={false}
      movingIntoCluster={false}
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster={false}
      canSetStandaloneMain={false}
      primaryActionLabel="开始复习"
      appleButtonClassName="btn"
      activeAssistItem={null}
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
      onOpenChange={() => undefined}
      onReopenPrevTrail={() => undefined}
      onFindRelations={() => {
        findCount += 1;
      }}
      onOpenPrevSibling={() => undefined}
      onOpenNextSibling={() => undefined}
      onSetDetailActionsOpen={() => undefined}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => undefined}
      onRequestSetStandaloneMain={() => undefined}
      onPrimaryAction={() => {
        primaryCount += 1;
      }}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: "查找同类 / 对照表达" }));
  fireEvent.click(view.getByRole("button", { name: "开始复习" }));

  assert.equal(findCount, 1);
  assert.equal(primaryCount, 1);
});

test("FocusDetailSheet 对未保存表达不会在页脚显示加入按钮", () => {
  const view = render(
    <FocusDetailSheet
      open
      detail={{ text: "burn yourself out", kind: "suggested-similar", savedItem: null }}
      detailTab="info"
      detailLoading={false}
      detailActionsOpen={false}
      detailConfirmAction={null}
      trailLength={1}
      canShowSiblingNav={false}
      canShowFindRelations={false}
      focusAssistLoading={false}
      movingIntoCluster={false}
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster={false}
      canSetStandaloneMain={false}
      primaryActionLabel="开始复习"
      appleButtonClassName="btn"
      activeAssistItem={null}
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
      onOpenChange={() => undefined}
      onReopenPrevTrail={() => undefined}
      onFindRelations={() => undefined}
      onOpenPrevSibling={() => undefined}
      onOpenNextSibling={() => undefined}
      onSetDetailActionsOpen={() => undefined}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => undefined}
      onRequestSetStandaloneMain={() => undefined}
      onPrimaryAction={() => undefined}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  assert.equal(view.queryByRole("button", { name: "加入表达库" }), null);
});

test("FocusDetailSheet 会处理返回、兄弟导航与查找关系禁用态", () => {
  let backCount = 0;
  let prevCount = 0;
  let nextCount = 0;
  let findCount = 0;

  const view = render(
    <FocusDetailSheet
      open
      detail={{ text: "burn yourself out", kind: "current", savedItem: createSavedItem() }}
      detailTab="info"
      detailLoading={false}
      detailActionsOpen
      detailConfirmAction={null}
      trailLength={2}
      canShowSiblingNav
      canShowFindRelations
      focusAssistLoading
      movingIntoCluster={false}
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster={false}
      canSetStandaloneMain={false}
      primaryActionLabel="开始复习"
      appleButtonClassName="btn"
      activeAssistItem={null}
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
      onOpenChange={() => undefined}
      onReopenPrevTrail={() => {
        backCount += 1;
      }}
      onFindRelations={() => {
        findCount += 1;
      }}
      onOpenPrevSibling={() => {
        prevCount += 1;
      }}
      onOpenNextSibling={() => {
        nextCount += 1;
      }}
      onSetDetailActionsOpen={() => undefined}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => undefined}
      onRequestSetStandaloneMain={() => undefined}
      onPrimaryAction={() => undefined}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: "返回" }));
  fireEvent.click(view.getByRole("button", { name: "上一条" }));
  fireEvent.click(view.getByRole("button", { name: "下一条" }));

  const findButton = view.getByRole("button", { name: "查找同类 / 对照表达..." });
  assert.equal(findButton.hasAttribute("disabled"), true);
  fireEvent.click(findButton);

  assert.equal(backCount, 1);
  assert.equal(prevCount, 1);
  assert.equal(nextCount, 1);
  assert.equal(findCount, 0);
});

test("FocusDetailSheet 会显示完成按钮并触发清理操作", () => {
  let completeCount = 0;

  const view = render(
    <FocusDetailSheet
      open
      detail={{ text: "burn yourself out", kind: "current", savedItem: createSavedItem() }}
      detailTab="similar"
      detailLoading={false}
      detailActionsOpen={false}
      detailConfirmAction={null}
      trailLength={1}
      canShowSiblingNav={false}
      canShowFindRelations
      canCompleteAssist
      completeAssistDisabled={false}
      focusAssistLoading={false}
      movingIntoCluster={false}
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster={false}
      canSetStandaloneMain={false}
      primaryActionLabel="开始复习"
      appleButtonClassName="btn"
      activeAssistItem={null}
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
      onOpenChange={() => undefined}
      onReopenPrevTrail={() => undefined}
      onFindRelations={() => undefined}
      onOpenPrevSibling={() => undefined}
      onOpenNextSibling={() => undefined}
      onSetDetailActionsOpen={() => undefined}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => undefined}
      onRequestSetStandaloneMain={() => undefined}
      onCompleteAssist={() => {
        completeCount += 1;
      }}
      onPrimaryAction={() => undefined}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: "完成" }));
  assert.equal(completeCount, 1);
});

test("FocusDetailSheet 会在确认弹层打开时处理遮罩、取消和提交态", () => {
  let closeCount = 0;
  let confirmCount = 0;

  const view = render(
    <FocusDetailSheet
      open
      detail={{ text: "burn yourself out", kind: "current", savedItem: createSavedItem() }}
      detailTab="info"
      detailLoading={false}
      detailActionsOpen={false}
      detailConfirmAction="set-standalone-main"
      trailLength={1}
      canShowSiblingNav={false}
      canShowFindRelations={false}
      focusAssistLoading={false}
      movingIntoCluster={false}
      ensuringMoveTargetCluster={false}
      detachingClusterMember
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster={false}
      canSetStandaloneMain
      primaryActionLabel="开始复习"
      appleButtonClassName="btn"
      activeAssistItem={null}
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
      onOpenChange={() => undefined}
      onReopenPrevTrail={() => undefined}
      onFindRelations={() => undefined}
      onOpenPrevSibling={() => undefined}
      onOpenNextSibling={() => undefined}
      onSetDetailActionsOpen={() => undefined}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => undefined}
      onRequestSetStandaloneMain={() => undefined}
      onPrimaryAction={() => undefined}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => {
        closeCount += 1;
      }}
      onConfirm={() => {
        confirmCount += 1;
      }}
    />,
  );

  assert.ok(view.getByText("确认独立？"));
  assert.ok(view.getAllByText("burn yourself out").length >= 1);
  assert.ok(view.getAllByText("把自己耗尽").length >= 1);

  fireEvent.click(view.getByRole("button", { name: "关闭确认弹窗" }));
  fireEvent.click(view.getByRole("button", { name: "取消" }));

  const confirmButton = view.getByRole("button", { name: "继续..." });
  assert.equal(confirmButton.hasAttribute("disabled"), true);
  fireEvent.click(confirmButton);

  assert.equal(closeCount, 2);
  assert.equal(confirmCount, 0);
});
