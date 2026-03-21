import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { MoveIntoClusterSheet } from "./move-into-cluster-sheet";
import { MoveIntoClusterGroup } from "./types";

afterEach(() => {
  cleanup();
});

const labels = {
  close: "关闭",
  title: "移入当前表达簇",
  description: "可以一次勾选多个表达或其子表达。",
  currentMain: "当前主表达：",
  empty: "暂无可移入项",
  selectGroup: "全选",
  selectedGroup: "已全选",
  coveredByMain: "随整簇一起移入",
  submit: "确认移入",
  mainExpression: "主表达",
  subExpression: "子表达",
  selected: "已选",
  unselected: "未选",
  covered: "已覆盖",
};

function createExpression(overrides: Partial<UserPhraseItemResponse>): UserPhraseItemResponse {
  return {
    userPhraseId: "phrase-1",
    phraseId: "raw-1",
    text: "expression",
    normalizedText: "expression",
    translation: null,
    usageNote: null,
    difficulty: null,
    tags: [],
    sourceSceneSlug: null,
    sourceType: "manual",
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
    learningItemType: "expression",
    savedAt: "2026-03-21T00:00:00.000Z",
    lastSeenAt: "2026-03-21T00:00:00.000Z",
    reviewStatus: "saved",
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    masteredAt: null,
    ...overrides,
  };
}

const clusterGroup: MoveIntoClusterGroup = {
  key: "cluster-1",
  title: "figures",
  description: "",
  isCluster: true,
  candidates: [
    {
      row: createExpression({
        userPhraseId: "main-1",
        phraseId: "p1",
        text: "figures",
        normalizedText: "figures",
        translation: "果然如此",
        expressionClusterId: "cluster-1",
        expressionClusterRole: "main",
        expressionClusterMainUserPhraseId: "main-1",
      }),
      sourceClusterId: "cluster-1",
      sourceClusterMainText: "figures",
      sourceClusterMemberCount: 2,
      isSourceMain: true,
    },
    {
      row: createExpression({
        userPhraseId: "sub-1",
        phraseId: "p2",
        text: "That figures",
        normalizedText: "that figures",
        translation: "这就说得通了",
        expressionClusterId: "cluster-1",
        expressionClusterRole: "variant",
        expressionClusterMainUserPhraseId: "main-1",
      }),
      sourceClusterId: "cluster-1",
      sourceClusterMainText: "figures",
      sourceClusterMemberCount: 2,
      isSourceMain: false,
    },
  ],
};

test("MoveIntoClusterSheet 点击簇头和全选会触发对应回调", () => {
  const expanded: string[] = [];
  const selected: Array<{ key: string; selected: boolean }> = [];

  render(
    <MoveIntoClusterSheet
      open
      focusExpression={{ text: "burn yourself out" }}
      groups={[clusterGroup]}
      expandedGroups={{}}
      selectedMap={{}}
      submitting={false}
      appleButtonClassName="btn"
      labels={labels}
      onOpenChange={() => undefined}
      onToggleGroupExpand={(groupKey) => expanded.push(groupKey)}
      onToggleGroupSelect={(group, isSelected) => {
        selected.push({ key: group.key, selected: isSelected });
      }}
      onToggleCandidate={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /figures/ }));
  fireEvent.click(screen.getByRole("button", { name: labels.selectGroup }));

  assert.deepEqual(expanded, ["cluster-1"]);
  assert.deepEqual(selected, [{ key: "cluster-1", selected: false }]);
});

test("MoveIntoClusterSheet 展开后点击子表达会触发单项切换", () => {
  const toggled: Array<{ key: string; id: string; selected: boolean }> = [];

  render(
    <MoveIntoClusterSheet
      open
      focusExpression={{ text: "burn yourself out" }}
      groups={[clusterGroup]}
      expandedGroups={{ "cluster-1": true }}
      selectedMap={{}}
      submitting={false}
      appleButtonClassName="btn"
      labels={labels}
      onOpenChange={() => undefined}
      onToggleGroupExpand={() => undefined}
      onToggleGroupSelect={() => undefined}
      onToggleCandidate={(group, candidate, isSelected) => {
        toggled.push({ key: group.key, id: candidate.row.userPhraseId, selected: isSelected });
      }}
      onSubmit={() => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /That figures/ }));

  assert.deepEqual(toggled, [{ key: "cluster-1", id: "sub-1", selected: false }]);
});

test("MoveIntoClusterSheet 主表达已选时显示已全选并禁用子表达", () => {
  const toggled: string[] = [];

  render(
    <MoveIntoClusterSheet
      open
      focusExpression={{ text: "burn yourself out" }}
      groups={[clusterGroup]}
      expandedGroups={{ "cluster-1": true }}
      selectedMap={{ "main-1": true }}
      submitting={false}
      appleButtonClassName="btn"
      labels={labels}
      onOpenChange={() => undefined}
      onToggleGroupExpand={() => undefined}
      onToggleGroupSelect={() => undefined}
      onToggleCandidate={(_, candidate) => {
        toggled.push(candidate.row.userPhraseId);
      }}
      onSubmit={() => undefined}
    />,
  );

  assert.ok(screen.getByRole("button", { name: labels.selectedGroup }));
  assert.ok(screen.getAllByText(labels.coveredByMain).length >= 1);

  const childButton = screen.getByRole("button", {
    name: /That figures.*这就说得通了.*子表达.*已覆盖/,
  });
  assert.equal(childButton.hasAttribute("disabled"), true);

  fireEvent.click(childButton);
  assert.deepEqual(toggled, []);
});

test("MoveIntoClusterSheet 底部关闭和确认移入会触发回调", () => {
  let closed = false;
  let submitted = false;

  render(
    <MoveIntoClusterSheet
      open
      focusExpression={{ text: "burn yourself out" }}
      groups={[]}
      expandedGroups={{}}
      selectedMap={{}}
      submitting={false}
      appleButtonClassName="btn"
      labels={labels}
      onOpenChange={(open) => {
        closed = open === false;
      }}
      onToggleGroupExpand={() => undefined}
      onToggleGroupSelect={() => undefined}
      onToggleCandidate={() => undefined}
      onSubmit={() => {
        submitted = true;
      }}
    />,
  );

  fireEvent.click(screen.getAllByRole("button", { name: labels.close })[0]);
  fireEvent.click(screen.getByRole("button", { name: labels.submit }));

  assert.equal(closed, true);
  assert.equal(submitted, true);
});
