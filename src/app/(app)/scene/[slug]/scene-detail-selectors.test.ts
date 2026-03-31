import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveSceneTrainingCompletedMap,
  deriveSceneTrainingState,
} from "./scene-detail-selectors";

test("deriveSceneTrainingCompletedMap 会把进入句子练习和完成整段练习区分开", () => {
  const enteredSentencePractice = deriveSceneTrainingCompletedMap({
    session: {
      id: "session-1",
      sceneId: "scene-1",
      currentStep: "practice_sentence",
      selectedBlockId: null,
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
      scenePracticeCompleted: false,
      isDone: false,
      startedAt: "2026-03-31T00:00:00.000Z",
      endedAt: null,
      lastActiveAt: "2026-03-31T00:00:00.000Z",
      createdAt: "2026-03-31T00:00:00.000Z",
      updatedAt: "2026-03-31T00:00:00.000Z",
    },
    practiceSetStatus: "generated",
    practiceSnapshot: null,
    variantUnlocked: false,
  });

  assert.equal(enteredSentencePractice.practice_sentence, true);
  assert.equal(enteredSentencePractice.scene_practice, false);
  assert.equal(enteredSentencePractice.done, false);

  const completedScenePractice = deriveSceneTrainingCompletedMap({
    session: {
      id: "session-1",
      sceneId: "scene-1",
      currentStep: "scene_practice",
      selectedBlockId: null,
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
      scenePracticeCompleted: true,
      isDone: false,
      startedAt: "2026-03-31T00:00:00.000Z",
      endedAt: null,
      lastActiveAt: "2026-03-31T00:00:00.000Z",
      createdAt: "2026-03-31T00:00:00.000Z",
      updatedAt: "2026-03-31T00:00:00.000Z",
    },
    practiceSetStatus: "completed",
    practiceSnapshot: {
      run: null,
      latestAttempt: null,
      summary: {
        completedModeCount: 4,
        totalAttemptCount: 12,
        correctAttemptCount: 10,
        latestAssessmentLevel: "complete",
      },
    },
    variantUnlocked: false,
  });

  assert.equal(completedScenePractice.practice_sentence, true);
  assert.equal(completedScenePractice.scene_practice, true);
  assert.equal(completedScenePractice.done, false);
});

test("deriveSceneTrainingState 会在进入句子练习后把当前步骤推进到整段练习", () => {
  const state = deriveSceneTrainingState({
    listen: true,
    focus_expression: true,
    practice_sentence: true,
    scene_practice: false,
    done: false,
  });

  assert.equal(state.currentStep, "scene_practice");
  assert.equal(state.stepStates[2]?.status, "current");
  assert.equal(state.progressPercent, 50);
});
