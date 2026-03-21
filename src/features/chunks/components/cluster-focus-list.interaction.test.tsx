import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClusterFocusList } from "./cluster-focus-list";
import { FocusPreviewItem } from "./types";
import { UserPhraseItemResponse, UserPhraseRelationItemResponse } from "@/lib/utils/phrases-api";

afterEach(() => {
  cleanup();
});

const labels = {
  loading: "加载中",
  title: "主表达",
  expand: "展开",
  collapse: "收起",
  noTranslation: "暂无翻译",
  similarTab: "同类表达",
  openCurrentDetail: "查看详情",
};

function createRow(overrides: Partial<UserPhraseItemResponse> = {}): UserPhraseItemResponse {
  return {
    userPhraseId: overrides.userPhraseId ?? "phrase-1",
    phraseId: overrides.phraseId ?? "raw-1",
    text: overrides.text ?? "burn yourself out",
    normalizedText: overrides.normalizedText ?? "burn yourself out",
    translation: overrides.translation ?? "把自己耗尽",
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
  };
}

test("ClusterFocusList 未就绪时会显示加载态", () => {
  render(
    <ClusterFocusList
      ready={false}
      rows={[]}
      currentFocusExpressionId={null}
      expandedFocusMainId={null}
      clusterMembersByClusterId={new Map()}
      savedRelationRowsBySourceId={{}}
      currentFocusSimilarItems={[]}
      labels={labels}
      appleSurfaceClassName="surface"
      onToggleMain={() => undefined}
      onToggleExpanded={() => undefined}
      onOpenMainDetail={() => undefined}
      onOpenMainSimilarTab={() => undefined}
      onOpenPreviewItem={() => undefined}
    />,
  );

  assert.ok(screen.getByText("加载中"));
});

test("ClusterFocusList 会展开当前主表达并处理详情与预览交互", () => {
  const toggledMainIds: string[] = [];
  const toggledExpandedIds: string[] = [];
  const openedDetailIds: string[] = [];
  const openedSimilarTabIds: string[] = [];
  const openedPreviewKeys: string[] = [];
  const mainRow = createRow({
    userPhraseId: "main-1",
    phraseId: "p1",
    text: "burn yourself out",
    normalizedText: "burn yourself out",
    expressionClusterId: "cluster-1",
    expressionClusterRole: "main",
    expressionClusterMainUserPhraseId: "main-1",
  });
  const clusterMember = createRow({
    userPhraseId: "sub-1",
    phraseId: "p2",
    text: "wear yourself out",
    normalizedText: "wear yourself out",
    translation: "把自己拖垮",
    expressionClusterId: "cluster-1",
    expressionClusterRole: "variant",
    expressionClusterMainUserPhraseId: "main-1",
  });
  const relationItem = createRow({
    userPhraseId: "rel-1",
    phraseId: "p3",
    text: "run yourself down",
    normalizedText: "run yourself down",
    translation: "把自己累垮",
  });
  const relationRows: UserPhraseRelationItemResponse[] = [
    {
      sourceUserPhraseId: "main-1",
      relationType: "similar",
      item: relationItem,
    },
  ];

  render(
    <ClusterFocusList
      ready
      rows={[mainRow]}
      currentFocusExpressionId={null}
      expandedFocusMainId="main-1"
      clusterMembersByClusterId={new Map([["cluster-1", [mainRow, clusterMember]]])}
      savedRelationRowsBySourceId={{ "main-1": relationRows }}
      currentFocusSimilarItems={[]}
      labels={labels}
      appleSurfaceClassName="surface"
      onToggleMain={(userPhraseId) => toggledMainIds.push(userPhraseId)}
      onToggleExpanded={(userPhraseId) => toggledExpandedIds.push(userPhraseId)}
      onOpenMainDetail={(row) => openedDetailIds.push(row.userPhraseId)}
      onOpenMainSimilarTab={(row) => openedSimilarTabIds.push(row.userPhraseId)}
      onOpenPreviewItem={(_, item) => openedPreviewKeys.push(item.key)}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "收起" }));
  fireEvent.click(screen.getByRole("button", { name: /burn yourself out/ }));
  fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
  fireEvent.click(screen.getByRole("button", { name: /wear yourself out/ }));
  fireEvent.click(screen.getByRole("button", { name: /run yourself down/ }));

  assert.deepEqual(toggledMainIds, ["main-1"]);
  assert.deepEqual(toggledExpandedIds, ["main-1"]);
  assert.deepEqual(openedDetailIds, ["main-1"]);
  assert.deepEqual(openedSimilarTabIds, ["main-1"]);
  assert.deepEqual(openedPreviewKeys, ["cluster:sub-1", "relation-similar:rel-1"]);
});

test("ClusterFocusList 当前聚焦主表达会优先展示当前相似项", () => {
  const openedPreviewKeys: string[] = [];
  const mainRow = createRow({
    userPhraseId: "main-1",
    phraseId: "p1",
    text: "burn yourself out",
    normalizedText: "burn yourself out",
    translation: null,
  });
  const currentFocusSimilarItems: FocusPreviewItem[] = [
    {
      key: "focus:1",
      text: "wear yourself out",
      kind: "suggested-similar",
      differenceLabel: "语气更口语",
      savedItem: createRow({
        userPhraseId: "sub-1",
        phraseId: "p2",
        text: "wear yourself out",
        normalizedText: "wear yourself out",
        translation: "把自己拖垮",
      }),
    },
    {
      key: "focus:2",
      text: "wear yourself out",
      kind: "suggested-similar",
      differenceLabel: "重复项",
      savedItem: createRow({
        userPhraseId: "sub-2",
        phraseId: "p3",
        text: "wear yourself out",
        normalizedText: "wear yourself out",
        translation: "把自己拖垮",
      }),
    },
  ];

  render(
    <ClusterFocusList
      ready
      rows={[mainRow]}
      currentFocusExpressionId="main-1"
      expandedFocusMainId="main-1"
      clusterMembersByClusterId={new Map()}
      savedRelationRowsBySourceId={{}}
      currentFocusSimilarItems={currentFocusSimilarItems}
      labels={labels}
      appleSurfaceClassName="surface"
      onToggleMain={() => undefined}
      onToggleExpanded={() => undefined}
      onOpenMainDetail={() => undefined}
      onOpenMainSimilarTab={() => undefined}
      onOpenPreviewItem={(_, item) => openedPreviewKeys.push(item.key)}
    />,
  );

  assert.equal(screen.getAllByText("wear yourself out").length, 2);

  fireEvent.click(screen.getAllByRole("button", { name: /wear yourself out/ })[0]);
  assert.deepEqual(openedPreviewKeys, ["focus:1"]);
});

test("ClusterFocusList 对非当前主表达会去重并限制 preview 数量", () => {
  const mainRow = createRow({
    userPhraseId: "main-1",
    text: "burn yourself out",
    normalizedText: "burn yourself out",
    expressionClusterId: "cluster-1",
    expressionClusterRole: "main",
    expressionClusterMainUserPhraseId: "main-1",
  });
  const clusterMembers = [
    mainRow,
    createRow({ userPhraseId: "sub-1", text: "wear yourself out", normalizedText: "wear yourself out" }),
    createRow({ userPhraseId: "sub-2", text: "run yourself down", normalizedText: "run yourself down" }),
    createRow({ userPhraseId: "sub-3", text: "push yourself too hard", normalizedText: "push yourself too hard" }),
    createRow({ userPhraseId: "sub-4", text: "overwork yourself", normalizedText: "overwork yourself" }),
    createRow({ userPhraseId: "sub-5", text: "drive yourself into the ground", normalizedText: "drive yourself into the ground" }),
  ];
  const relationRows: UserPhraseRelationItemResponse[] = [
    {
      sourceUserPhraseId: "main-1",
      relationType: "similar",
      item: createRow({
        userPhraseId: "rel-1",
        text: "wear yourself out",
        normalizedText: "wear yourself out",
      }),
    },
    {
      sourceUserPhraseId: "main-1",
      relationType: "similar",
      item: createRow({
        userPhraseId: "rel-2",
        text: "use yourself up",
        normalizedText: "use yourself up",
      }),
    },
    {
      sourceUserPhraseId: "main-1",
      relationType: "similar",
      item: createRow({
        userPhraseId: "rel-3",
        text: "stretch yourself thin",
        normalizedText: "stretch yourself thin",
      }),
    },
  ];

  render(
    <ClusterFocusList
      ready
      rows={[mainRow]}
      currentFocusExpressionId={null}
      expandedFocusMainId="main-1"
      clusterMembersByClusterId={new Map([["cluster-1", clusterMembers]])}
      savedRelationRowsBySourceId={{ "main-1": relationRows }}
      currentFocusSimilarItems={[]}
      labels={labels}
      appleSurfaceClassName="surface"
      onToggleMain={() => undefined}
      onToggleExpanded={() => undefined}
      onOpenMainDetail={() => undefined}
      onOpenMainSimilarTab={() => undefined}
      onOpenPreviewItem={() => undefined}
    />,
  );

  assert.equal(screen.queryAllByText("wear yourself out").length, 1);
  assert.equal(screen.queryByText("stretch yourself thin"), null);
  assert.equal(screen.getAllByRole("button").filter((button) => button.textContent?.includes("yourself") || button.textContent?.includes("overwork")).length >= 6, true);
});

test("ClusterFocusList 收起态会使用展开标签，并且主卡片点击只打开详情", () => {
  const mainRow = createRow({
    userPhraseId: "main-1",
    expressionClusterId: "cluster-1",
    expressionClusterRole: "main",
    expressionClusterMainUserPhraseId: "main-1",
  });
  const openedDetailIds: string[] = [];

  render(
    <ClusterFocusList
      ready
      rows={[mainRow]}
      currentFocusExpressionId={null}
      expandedFocusMainId={null}
      clusterMembersByClusterId={new Map([["cluster-1", [mainRow]]])}
      savedRelationRowsBySourceId={{}}
      currentFocusSimilarItems={[]}
      labels={labels}
      appleSurfaceClassName="surface"
      onToggleMain={() => undefined}
      onToggleExpanded={() => undefined}
      onOpenMainDetail={(row) => openedDetailIds.push(row.userPhraseId)}
      onOpenMainSimilarTab={() => undefined}
      onOpenPreviewItem={() => undefined}
    />,
  );

  const expandButton = screen.getByRole("button", { name: "展开" });
  assert.ok(expandButton);

  fireEvent.click(screen.getByRole("button", { name: /burn yourself out/ }));
  assert.deepEqual(openedDetailIds, ["main-1"]);
});
