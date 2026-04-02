import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { SceneLearningProgressResponse } from "@/lib/utils/learning-api";
import { SceneTrainingCoachFloatingEntry } from "./scene-training-coach-floating-entry";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function createTrainingState(
  overrides?: Partial<NonNullable<SceneLearningProgressResponse["session"]>>,
): SceneLearningProgressResponse {
  return {
    progress: {
      id: "progress-1",
      sceneId: "scene-1",
      status: "in_progress",
      progressPercent: 0,
      masteryStage: "listening",
      masteryPercent: 20,
      focusedExpressionCount: 0,
      practicedSentenceCount: 0,
      completedSentenceCount: 0,
      scenePracticeCount: 0,
      variantUnlockedAt: null,
      lastSentenceIndex: null,
      lastVariantIndex: null,
      startedAt: "2026-04-02T00:00:00.000Z",
      lastViewedAt: "2026-04-02T00:00:00.000Z",
      completedAt: null,
      lastPracticedAt: "2026-04-02T00:00:00.000Z",
      totalStudySeconds: 0,
      todayStudySeconds: 0,
      savedPhraseCount: 0,
      createdAt: "2026-04-02T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
    },
    session: {
      id: "session-1",
      sceneId: "scene-1",
      currentStep: "focus_expression",
      selectedBlockId: null,
      fullPlayCount: 1,
      openedExpressionCount: 0,
      practicedSentenceCount: 0,
      completedSentenceCount: 0,
      scenePracticeCompleted: false,
      isDone: false,
      startedAt: "2026-04-02T00:00:00.000Z",
      endedAt: null,
      lastActiveAt: "2026-04-02T00:00:00.000Z",
      createdAt: "2026-04-02T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
      ...overrides,
    },
  };
}

test("SceneTrainingCoachFloatingEntry 会展开训练面板并触发当前步骤动作", () => {
  let actionCount = 0;

  render(
    <SceneTrainingCoachFloatingEntry
      sceneId="scene-1"
      trainingState={createTrainingState()}
      variantUnlocked={false}
      practiceSetStatus="generated"
      practiceSnapshot={null}
      practiceModuleCount={1}
      currentStepActionLabel="继续当前步骤"
      onCurrentStepAction={() => {
        actionCount += 1;
      }}
    />,
  );

  const fab = screen.getByTestId("scene-training-fab");
  fireEvent.pointerDown(fab, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerUp(fab, { pointerId: 1, clientX: 20, clientY: 20 });

  assert.ok(screen.getByRole("button", { name: "收起训练面板" }));
  assert.ok(screen.getByText(/下一步：继续完成整段练习|下一步：/));

  fireEvent.click(screen.getByRole("button", { name: "继续当前步骤" }));

  assert.equal(actionCount, 1);
});
