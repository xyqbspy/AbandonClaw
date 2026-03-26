import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExpressionMapSheet } from "./expression-map-sheet";
import { ExpressionMapResponse } from "@/lib/types/expression-map";

afterEach(() => {
  cleanup();
});

const labels = {
  title: "表达地图",
  description: "查看当前表达簇中的关联表达。",
  loading: "正在生成表达地图...",
  empty: "暂无表达簇。",
  centerExpression: "中心表达",
  clusterMeaning: "簇含义",
  relatedExpressions: "相关表达",
  clusterEmpty: "该表达簇暂无其他表达",
  mapLimitedPrefix: "当前仅展示前",
  mapLimitedSuffix: "个表达",
  statusUnknown: "状态未知",
  close: "关闭",
  practiceCluster: "练习本簇",
  addCluster: "加入表达簇",
};

const data: ExpressionMapResponse = {
  version: "v1",
  sourceSceneId: "scene-1",
  clusters: [
    {
      id: "cluster-1",
      anchor: "burn yourself out",
      meaning: "过度消耗自己",
      expressions: ["burn yourself out", "wear yourself out", "run yourself down"],
      sourceSceneIds: ["scene-1"],
      nodes: [
        { id: "n1", text: "burn yourself out", sourceSceneId: "scene-1", sourceType: "original" },
      ],
    },
    {
      id: "cluster-2",
      anchor: "call it a day",
      meaning: "暂时收工",
      expressions: ["call it a day"],
      sourceSceneIds: ["scene-1"],
      nodes: [
        { id: "n2", text: "call it a day", sourceSceneId: "scene-1", sourceType: "original" },
      ],
    },
  ],
};

test("ExpressionMapSheet 会处理加载、错误和空态", () => {
  const { rerender } = render(
    <ExpressionMapSheet
      open
      loading
      error={null}
      data={null}
      activeClusterId={null}
      activeCluster={null}
      centerExpressionText=""
      displayedClusterExpressions={[]}
      expressionStatusByNormalized={new Map()}
      addingCluster={false}
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={() => ""}
      onOpenChange={() => undefined}
      onSelectCluster={() => undefined}
      onPracticeCluster={() => undefined}
      onAddCluster={() => undefined}
    />,
  );

  assert.ok(screen.getByText("正在生成表达地图..."));

  rerender(
    <ExpressionMapSheet
      open
      loading={false}
      error="加载失败"
      data={null}
      activeClusterId={null}
      activeCluster={null}
      centerExpressionText=""
      displayedClusterExpressions={[]}
      expressionStatusByNormalized={new Map()}
      addingCluster={false}
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={() => ""}
      onOpenChange={() => undefined}
      onSelectCluster={() => undefined}
      onPracticeCluster={() => undefined}
      onAddCluster={() => undefined}
    />,
  );

  assert.ok(screen.getByText("加载失败"));

  rerender(
    <ExpressionMapSheet
      open
      loading={false}
      error={null}
      data={{ version: "v1", sourceSceneId: "scene-1", clusters: [] }}
      activeClusterId={null}
      activeCluster={null}
      centerExpressionText=""
      displayedClusterExpressions={[]}
      expressionStatusByNormalized={new Map()}
      addingCluster={false}
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={() => ""}
      onOpenChange={() => undefined}
      onSelectCluster={() => undefined}
      onPracticeCluster={() => undefined}
      onAddCluster={() => undefined}
    />,
  );

  assert.ok(screen.getByText("暂无表达簇。"));
});

test("ExpressionMapSheet 会处理簇切换和底部动作", () => {
  const selectedClusterIds: string[] = [];
  let closed = false;
  let practiced = false;
  let added = false;

  render(
    <ExpressionMapSheet
      open
      loading={false}
      error={null}
      data={data}
      activeClusterId="cluster-1"
      activeCluster={data.clusters[0]}
      centerExpressionText="burn yourself out"
      displayedClusterExpressions={["wear yourself out", "run yourself down"]}
      expressionStatusByNormalized={
        new Map([
          ["wear yourself out", "已保存"],
          ["run yourself down", undefined],
        ])
      }
      addingCluster={false}
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={(centerExpression, targetExpression) => `${centerExpression} vs ${targetExpression}`}
      onOpenChange={(open) => {
        closed = open === false;
      }}
      onSelectCluster={(clusterId) => selectedClusterIds.push(clusterId)}
      onPracticeCluster={() => {
        practiced = true;
      }}
      onAddCluster={() => {
        added = true;
      }}
    />,
  );

  assert.ok(screen.getByText("中心表达"));
  assert.equal(screen.getAllByText("burn yourself out").length >= 1, true);
  assert.ok(screen.getByText("簇含义：过度消耗自己"));
  assert.ok(screen.getByText("已保存"));
  assert.ok(screen.getByText("状态未知"));
  assert.ok(screen.getByText("burn yourself out vs wear yourself out"));

  fireEvent.click(screen.getByRole("button", { name: "call it a day" }));
  fireEvent.click(screen.getAllByRole("button", { name: "关闭" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "练习本簇" }));
  fireEvent.click(screen.getByRole("button", { name: "加入表达簇" }));

  assert.deepEqual(selectedClusterIds, ["cluster-2"]);
  assert.equal(closed, true);
  assert.equal(practiced, true);
  assert.equal(added, true);
});

test("ExpressionMapSheet 加入表达簇时会保持统一 loading 文案", () => {
  render(
    <ExpressionMapSheet
      open
      loading={false}
      error={null}
      data={data}
      activeClusterId="cluster-1"
      activeCluster={data.clusters[0]}
      centerExpressionText=""
      displayedClusterExpressions={["wear yourself out"]}
      expressionStatusByNormalized={new Map()}
      addingCluster
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={() => "差异说明"}
      onOpenChange={() => undefined}
      onSelectCluster={() => undefined}
      onPracticeCluster={() => undefined}
      onAddCluster={() => undefined}
    />,
  );

  assert.ok(screen.getByRole("button", { name: "加入表达簇..." }));
  assert.equal(screen.queryByRole("button", { name: "加入表达簇...." }), null);
});

test("ExpressionMapSheet 会根据 activeCluster 更新簇内容", () => {
  const { rerender } = render(
    <ExpressionMapSheet
      open
      loading={false}
      error={null}
      data={data}
      activeClusterId="cluster-1"
      activeCluster={data.clusters[0]}
      centerExpressionText="burn yourself out"
      displayedClusterExpressions={["wear yourself out"]}
      expressionStatusByNormalized={new Map()}
      addingCluster={false}
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={() => "差异说明"}
      onOpenChange={() => undefined}
      onSelectCluster={() => undefined}
      onPracticeCluster={() => undefined}
      onAddCluster={() => undefined}
    />,
  );

  assert.ok(screen.getByText("簇含义：过度消耗自己"));
  assert.ok(screen.getByText("wear yourself out"));

  rerender(
    <ExpressionMapSheet
      open
      loading={false}
      error={null}
      data={data}
      activeClusterId="cluster-2"
      activeCluster={data.clusters[1]}
      centerExpressionText="call it a day"
      displayedClusterExpressions={[]}
      expressionStatusByNormalized={new Map()}
      addingCluster={false}
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={() => ""}
      onOpenChange={() => undefined}
      onSelectCluster={() => undefined}
      onPracticeCluster={() => undefined}
      onAddCluster={() => undefined}
    />,
  );

  assert.ok(screen.getByText("簇含义：暂时收工"));
  assert.ok(screen.getByText("该表达簇暂无其他表达"));
});

test("ExpressionMapSheet 会处理展示受限和加入中禁用态", () => {
  render(
    <ExpressionMapSheet
      open
      loading={false}
      error={null}
      data={data}
      activeClusterId="cluster-1"
      activeCluster={data.clusters[0]}
      centerExpressionText=""
      displayedClusterExpressions={["wear yourself out"]}
      expressionStatusByNormalized={new Map()}
      addingCluster
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={() => "差异说明"}
      onOpenChange={() => undefined}
      onSelectCluster={() => undefined}
      onPracticeCluster={() => undefined}
      onAddCluster={() => undefined}
    />,
  );

  assert.ok(screen.getByText("当前仅展示前 1 个表达"));
  const addButton = screen.getByRole("button", { name: "加入表达簇..." });
  assert.equal(addButton.hasAttribute("disabled"), true);
});

test("ExpressionMapSheet 在错误态下仍保留底部操作", () => {
  let practiced = false;
  let added = false;

  render(
    <ExpressionMapSheet
      open
      loading={false}
      error="加载失败"
      data={null}
      activeClusterId={null}
      activeCluster={null}
      centerExpressionText=""
      displayedClusterExpressions={[]}
      expressionStatusByNormalized={new Map()}
      addingCluster={false}
      appleButtonClassName="btn"
      labels={labels}
      buildDifferenceNote={() => ""}
      onOpenChange={() => undefined}
      onSelectCluster={() => undefined}
      onPracticeCluster={() => {
        practiced = true;
      }}
      onAddCluster={() => {
        added = true;
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "练习本簇" }));
  fireEvent.click(screen.getByRole("button", { name: "加入表达簇" }));

  assert.equal(practiced, true);
  assert.equal(added, true);
});
