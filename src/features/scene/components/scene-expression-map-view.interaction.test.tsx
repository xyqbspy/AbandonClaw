import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExpressionCluster } from "@/lib/types/expression-map";
import { SceneExpressionMapView } from "./scene-expression-map-view";

afterEach(() => {
  cleanup();
});

const labels = {
  back: "返回变体页",
  description: "表达簇会把当前场景与变体中的相关说法归在一起。",
  empty: "暂无表达簇。先生成变体后再查看表达地图。",
  sourceSceneCountPrefix: "出现场景数：",
};

const clusters: ExpressionCluster[] = [
  {
    id: "cluster-1",
    anchor: "call it a day",
    meaning: "结束今天的工作",
    expressions: ["call it a day", "wrap it up"],
    sourceSceneIds: ["scene-1", "scene-2"],
    nodes: [],
  },
];

test("SceneExpressionMapView 会处理返回、错误和表达项点击", () => {
  const events: Array<{ expression: string; relatedChunks: string[] } | "back"> = [];

  render(
    <SceneExpressionMapView
      clusters={clusters}
      error="加载失败"
      appleButtonSmClassName="btn"
      labels={labels}
      onBack={() => events.push("back")}
      onOpenExpressionDetail={(expression, relatedChunks) => {
        events.push({ expression, relatedChunks });
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: labels.back }));
  fireEvent.click(screen.getByRole("button", { name: "wrap it up" }));

  assert.ok(screen.getByText(labels.description));
  assert.ok(screen.getByText("加载失败"));
  assert.equal(screen.getAllByText("call it a day").length >= 2, true);
  assert.ok(screen.getByText("出现场景数：2"));
  assert.deepEqual(events, [
    "back",
    { expression: "wrap it up", relatedChunks: ["call it a day", "wrap it up"] },
  ]);
});

test("SceneExpressionMapView 在空态下会渲染 empty 文案且不渲染表达按钮", () => {
  render(
    <SceneExpressionMapView
      clusters={[]}
      error={null}
      appleButtonSmClassName="btn"
      labels={labels}
      onBack={() => undefined}
      onOpenExpressionDetail={() => undefined}
    />,
  );

  assert.ok(screen.getByText(labels.empty));
  assert.equal(screen.queryByRole("button", { name: "call it a day" }), null);
});

test("SceneExpressionMapView 会渲染透传的 chunk detail sheet", () => {
  render(
    <SceneExpressionMapView
      clusters={clusters}
      error={null}
      appleButtonSmClassName="btn"
      labels={labels}
      onBack={() => undefined}
      onOpenExpressionDetail={() => undefined}
      chunkDetailSheet={<div>detail sheet placeholder</div>}
    />,
  );

  assert.ok(screen.getByText("detail sheet placeholder"));
});

