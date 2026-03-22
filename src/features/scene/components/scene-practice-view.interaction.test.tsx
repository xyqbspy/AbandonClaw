import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScenePracticeView } from "./scene-practice-view";
import { sceneViewLabels } from "./scene-view-labels";
import { PracticeSet } from "@/lib/types/learning-flow";

afterEach(() => {
  cleanup();
});

const practiceSet: PracticeSet = {
  id: "practice-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Coffee Chat",
  sourceType: "original",
  exercises: [
    {
      id: "exercise-1",
      type: "typing",
      inputMode: "typing",
      sceneId: "scene-1",
      sentenceId: "sentence-1",
      prompt: "Use call it a day",
      answer: { text: "I should call it a day." },
    },
  ],
  status: "generated",
  createdAt: "2026-03-21T00:00:00.000Z",
};

test("ScenePracticeView 点击答案按钮会触发切换回调", () => {
  let toggledId = "";

  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onToggleAnswer={(exerciseId) => {
        toggledId = exerciseId;
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
  assert.equal(toggledId, "exercise-1");
});

test("ScenePracticeView 在答案已显示时会渲染答案文本和 Hide Answer", () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{ "exercise-1": true }}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getByText("I should call it a day."));
  assert.ok(screen.getByRole("button", { name: "Hide Answer" }));
});

test("ScenePracticeView 在来源为 variant 时会展示变体与原场景说明", () => {
  render(
    <ScenePracticeView
      practiceSet={{
        ...practiceSet,
        sourceType: "variant",
        sourceVariantId: "variant-1",
        sourceVariantTitle: "Coffee Chat Variant 1",
      }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getByText(/Coffee Chat Variant 1/));
  assert.ok(screen.getByText(/Coffee Chat/));
});

test("ScenePracticeView 在空态下会禁用删除和完成按钮", () => {
  let deleteCount = 0;
  let completeCount = 0;

  render(
    <ScenePracticeView
      practiceSet={null}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => {
        deleteCount += 1;
      }}
      onComplete={() => {
        completeCount += 1;
      }}
      onToggleAnswer={() => undefined}
    />,
  );

  const deleteButton = screen.getByRole("button", { name: sceneViewLabels.practice.delete });
  const completeButton = screen.getByRole("button", { name: sceneViewLabels.practice.complete });

  assert.equal(deleteButton.hasAttribute("disabled"), true);
  assert.equal(completeButton.hasAttribute("disabled"), true);
  assert.ok(screen.getByText(sceneViewLabels.practice.empty));

  fireEvent.click(deleteButton);
  fireEvent.click(completeButton);

  assert.equal(deleteCount, 0);
  assert.equal(completeCount, 0);
});

test("ScenePracticeView 在练习已完成时会禁用完成按钮", () => {
  render(
    <ScenePracticeView
      practiceSet={{ ...practiceSet, status: "completed" }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.equal(
    screen.getByRole("button", { name: sceneViewLabels.practice.complete }).hasAttribute("disabled"),
    true,
  );
});
