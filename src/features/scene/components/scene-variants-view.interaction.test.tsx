import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Lesson } from "@/lib/types";
import { VariantSet } from "@/lib/types/learning-flow";
import { SceneVariantsView } from "./scene-variants-view";

afterEach(() => {
  cleanup();
});

const labels = {
  back: "返回",
  complete: "完成学习",
  repeat: "再练变体训练",
  deleteSet: "删除变体",
  sourceScenePrefix: "来源场景：",
  variantsHint: "把这些核心表达迁移到相似语境里继续练习。",
  reusedChunksTitle: "核心表达",
  openMap: "查看表达地图",
  loadingMap: "生成中",
  empty: "还没有可查看的变体集。",
  statusPrefix: "状态：",
  open: "打开",
  delete: "删除",
};

function createLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: overrides.id ?? "lesson-1",
    slug: overrides.slug ?? "coffee-chat",
    title: overrides.title ?? "Coffee Chat",
    subtitle: overrides.subtitle,
    description: overrides.description,
    difficulty: overrides.difficulty ?? "Beginner",
    estimatedMinutes: overrides.estimatedMinutes ?? 5,
    completionRate: overrides.completionRate ?? 0,
    tags: overrides.tags ?? [],
    sceneType: overrides.sceneType ?? "dialogue",
    sections: overrides.sections ?? [
      {
        id: "section-1",
        title: "Section 1",
        summary: "两个人在咖啡店寒暄。",
        blocks: [],
      },
    ],
    explanations: overrides.explanations ?? [],
    sourceType: overrides.sourceType,
  };
}

const baseLesson = createLesson();

const variantSet: VariantSet = {
  id: "variant-set-1",
  sourceSceneId: "lesson-1",
  sourceSceneTitle: "Coffee Chat",
  reusedChunks: ["call it a day", "burn out"],
  variants: [
    {
      id: "variant-item-1",
      lesson: createLesson({
        id: "variant-1",
        slug: "coffee-chat-variant-1",
        title: "Coffee Chat Variant 1",
        subtitle: "first variant",
        sourceType: "variant",
      }),
      status: "viewed",
    },
  ],
  status: "generated",
  createdAt: "2026-03-22T00:00:00.000Z",
};

test("SceneVariantsView 会触发返回、完成、地图、chunk、打开和删除变体回调", () => {
  const events: string[] = [];

  render(
    <SceneVariantsView
      baseLesson={baseLesson}
      variantSet={variantSet}
      expressionMapLoading={false}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={labels}
      onBack={() => events.push("back")}
      onComplete={() => events.push("complete")}
      onDeleteSet={() => events.push("delete-set")}
      onOpenExpressionMap={() => events.push("open-map")}
      onOpenChunk={(chunk) => events.push(`chunk:${chunk}`)}
      onOpenVariant={(variantId) => events.push(`open:${variantId}`)}
      onDeleteVariant={(variantId) => events.push(`delete:${variantId}`)}
      toVariantTitle={(title) => `标题:${title}`}
      toVariantStatusLabel={(status) => `状态值:${status}`}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: labels.back }));
  fireEvent.click(screen.getByRole("button", { name: labels.complete }));
  fireEvent.click(screen.getByRole("button", { name: labels.deleteSet }));
  fireEvent.click(screen.getByRole("button", { name: labels.openMap }));
  fireEvent.click(screen.getByRole("button", { name: "call it a day" }));
  fireEvent.click(screen.getByRole("button", { name: labels.open }));
  fireEvent.click(screen.getByRole("button", { name: labels.delete }));

  assert.ok(screen.getByText("标题:Coffee Chat Variant 1"));
  assert.ok(screen.getByText("状态：状态值:viewed"));
  assert.deepEqual(events, [
    "back",
    "complete",
    "delete-set",
    "open-map",
    "chunk:call it a day",
    "open:variant-item-1",
    "delete:variant-item-1",
  ]);
});

test("SceneVariantsView 在无变体集或地图加载时会正确禁用主操作", () => {
  render(
    <SceneVariantsView
      baseLesson={baseLesson}
      variantSet={null}
      expressionMapLoading={true}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={labels}
      onBack={() => undefined}
      onComplete={() => undefined}
      onDeleteSet={() => undefined}
      onOpenExpressionMap={() => undefined}
      onOpenChunk={() => undefined}
      onOpenVariant={() => undefined}
      onDeleteVariant={() => undefined}
      toVariantTitle={(title) => title}
      toVariantStatusLabel={(status) => status}
    />,
  );

  assert.equal(screen.getByRole("button", { name: labels.complete }).hasAttribute("disabled"), true);
  assert.equal(screen.getByRole("button", { name: labels.deleteSet }).hasAttribute("disabled"), true);
  assert.equal(screen.getByRole("button", { name: labels.loadingMap }).hasAttribute("disabled"), true);
  assert.ok(screen.getByText(labels.empty));
});

test("SceneVariantsView 在变体集已完成时会禁用完成按钮", () => {
  render(
    <SceneVariantsView
      baseLesson={baseLesson}
      variantSet={{ ...variantSet, status: "completed" }}
      expressionMapLoading={false}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={labels}
      onBack={() => undefined}
      onComplete={() => undefined}
      onDeleteSet={() => undefined}
      onOpenExpressionMap={() => undefined}
      onOpenChunk={() => undefined}
      onOpenVariant={() => undefined}
      onDeleteVariant={() => undefined}
      toVariantTitle={(title) => title}
      toVariantStatusLabel={(status) => status}
    />,
  );

  assert.equal(screen.getByRole("button", { name: labels.complete }).hasAttribute("disabled"), true);
});

test("SceneVariantsView 在变体集已完成时会显示再练入口", () => {
  const events: string[] = [];

  render(
    <SceneVariantsView
      baseLesson={baseLesson}
      variantSet={{
        ...variantSet,
        status: "completed",
        variants: [
          {
            ...variantSet.variants[0],
            status: "completed",
          },
        ],
      }}
      expressionMapLoading={false}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={labels}
      onBack={() => undefined}
      onComplete={() => events.push("complete")}
      onRepeatVariants={() => events.push("repeat")}
      onDeleteSet={() => undefined}
      onOpenExpressionMap={() => undefined}
      onOpenChunk={() => undefined}
      onOpenVariant={() => undefined}
      onDeleteVariant={() => undefined}
      toVariantTitle={(title) => title}
      toVariantStatusLabel={(status) => status}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: labels.repeat }));

  assert.deepEqual(events, ["repeat"]);
  assert.equal(screen.queryByRole("button", { name: labels.complete }), null);
});
