import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FocusDetailSheet } from "./focus-detail-sheet";

afterEach(() => {
  cleanup();
});

const labels = {
  title: "表达详情",
  backToCurrent: "返回",
  findRelations: "查找关系",
  prev: "上一条",
  next: "下一条",
  detailMoreActions: "更多操作",
  detailOpenAsMain: "设为本簇主表达",
  moveIntoCluster: "移入当前表达簇",
  detachClusterMember: "设置为独立主表达",
  addThisExpression: "加入表达库",
  confirmCancel: "取消",
  confirmContinue: "继续",
  detailOpenAsMainConfirmTitle: "确认设为主表达？",
  detailOpenAsMainConfirmDesc: "会把当前表达设为本簇主表达。",
  detachClusterMemberConfirmTitle: "确认独立？",
  detachClusterMemberConfirmDesc: "会拆出当前表达。",
  detailCandidateBadge: "候选",
  noTranslation: "暂无翻译",
  detailLoading: "加载中",
  detailTabInfo: "详情",
  detailTabSavedSimilar: "同类",
  detailTabContrast: "对照",
  commonUsage: "常见用法",
  typicalScenarioLabel: "典型场景",
  semanticFocusLabel: "语义重点",
  reviewStage: "复习阶段",
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

test("FocusDetailSheet 会触发查找关系和主按钮动作", () => {
  let findCount = 0;
  let primaryCount = 0;

  render(
    <FocusDetailSheet
      open
      detail={{
        text: "burn yourself out",
        kind: "current",
        savedItem: createSavedItem(),
      }}
      detailTab="info"
      detailLoading={false}
      detailActionsOpen={false}
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
      savingFocusCandidate={false}
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
      onSecondaryAction={() => undefined}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "查找关系" }));
  fireEvent.click(screen.getByRole("button", { name: "开始复习" }));

  assert.equal(findCount, 1);
  assert.equal(primaryCount, 1);
});

test("FocusDetailSheet 对未保存表达会走加入表达库动作，并在保存中禁用按钮", () => {
  let secondaryCount = 0;

  const { rerender } = render(
    <FocusDetailSheet
      open
      detail={{
        text: "burn yourself out",
        kind: "suggested-similar",
        savedItem: null,
      }}
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
      savingFocusCandidate={false}
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
      onSecondaryAction={() => {
        secondaryCount += 1;
      }}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "加入表达库" }));
  assert.equal(secondaryCount, 1);

  rerender(
    <FocusDetailSheet
      open
      detail={{
        text: "burn yourself out",
        kind: "suggested-similar",
        savedItem: null,
      }}
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
      savingFocusCandidate
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
      onSecondaryAction={() => {
        secondaryCount += 1;
      }}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  assert.equal(screen.getByRole("button", { name: "加入表达库" }).hasAttribute("disabled"), true);
});

test("FocusDetailSheet 会处理返回、兄弟导航和查找关系禁用态", () => {
  let backCount = 0;
  let prevCount = 0;
  let nextCount = 0;
  let findCount = 0;

  render(
    <FocusDetailSheet
      open
      detail={{
        text: "burn yourself out",
        kind: "current",
        savedItem: createSavedItem(),
      }}
      detailTab="info"
      detailLoading={false}
      detailActionsOpen={false}
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
      savingFocusCandidate={false}
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
      onSecondaryAction={() => undefined}
      onSpeak={() => undefined}
      onTabChange={() => undefined}
      onOpenSimilarRow={() => undefined}
      onOpenContrastRow={() => undefined}
      onCloseConfirm={() => undefined}
      onConfirm={() => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "返回" }));
  fireEvent.click(screen.getByRole("button", { name: "上一条" }));
  fireEvent.click(screen.getByRole("button", { name: "下一条" }));

  const findButton = screen.getByRole("button", { name: "查找关系..." });
  assert.equal(findButton.hasAttribute("disabled"), true);
  fireEvent.click(findButton);

  assert.equal(backCount, 1);
  assert.equal(prevCount, 1);
  assert.equal(nextCount, 1);
  assert.equal(findCount, 0);
});

test("FocusDetailSheet 会在确认弹层打开时处理遮罩、取消和提交态", () => {
  let closeCount = 0;
  let confirmCount = 0;

  render(
    <FocusDetailSheet
      open
      detail={{
        text: "burn yourself out",
        kind: "current",
        savedItem: createSavedItem(),
      }}
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
      savingFocusCandidate={false}
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
      onSecondaryAction={() => undefined}
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

  assert.ok(screen.getByText("确认独立？"));
  assert.ok(screen.getAllByText("burn yourself out").length >= 1);
  assert.ok(screen.getAllByText("把自己耗尽").length >= 1);

  fireEvent.click(screen.getByRole("button", { name: "关闭确认弹窗" }));
  fireEvent.click(screen.getByRole("button", { name: "取消" }));

  const confirmButton = screen.getByRole("button", { name: "继续..." });
  assert.equal(confirmButton.hasAttribute("disabled"), true);
  fireEvent.click(confirmButton);

  assert.equal(closeCount, 2);
  assert.equal(confirmCount, 0);
});
