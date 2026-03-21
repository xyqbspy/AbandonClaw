import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SceneExpressionMapView } from "./scene-expression-map-view";
import { ScenePracticeView } from "./scene-practice-view";
import { SceneVariantsView } from "./scene-variants-view";
import { sceneViewLabels } from "./scene-view-labels";
import { Lesson } from "@/lib/types";

const noop = () => {};

const baseLesson: Lesson = {
  id: "lesson-1",
  slug: "scene-a",
  title: "Scene A",
  difficulty: "Intermediate",
  estimatedMinutes: 8,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sections: [],
  explanations: [],
};

test("ScenePracticeView 会渲染空态和基础按钮文案", () => {
  const html = renderToStaticMarkup(
    <ScenePracticeView
      practiceSet={null}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={noop}
      onDelete={noop}
      onComplete={noop}
      onToggleAnswer={noop}
    />,
  );

  assert.match(html, /返回原场景/);
  assert.match(html, /删除当前练习/);
  assert.match(html, /还没有可查看的练习集/);
});

test("SceneVariantsView 会渲染空态与核心表达标题", () => {
  const html = renderToStaticMarkup(
    <SceneVariantsView
      baseLesson={baseLesson}
      variantSet={null}
      expressionMapLoading={false}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.variants}
      onBack={noop}
      onComplete={noop}
      onDeleteSet={noop}
      onOpenExpressionMap={noop}
      onOpenChunk={noop}
      onOpenVariant={noop}
      onDeleteVariant={noop}
      toVariantTitle={(title) => title}
      toVariantStatusLabel={(status) => status}
    />,
  );

  assert.match(html, /来源场景：Scene A/);
  assert.match(html, /核心表达/);
  assert.match(html, /还没有可查看的变体集/);
});

test("SceneExpressionMapView 会渲染空态和错误文案", () => {
  const html = renderToStaticMarkup(
    <SceneExpressionMapView
      clusters={[]}
      error="地图生成失败"
      appleButtonSmClassName="btn"
      labels={sceneViewLabels.expressionMap}
      onBack={noop}
      onOpenExpressionDetail={noop}
    />,
  );

  assert.match(html, /返回变体页/);
  assert.match(html, /地图生成失败/);
  assert.match(html, /暂无表达簇/);
});
