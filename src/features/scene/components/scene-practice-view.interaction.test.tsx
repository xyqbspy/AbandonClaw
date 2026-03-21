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
