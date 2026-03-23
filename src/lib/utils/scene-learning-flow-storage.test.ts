import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { PracticeSet } from "@/lib/types/learning-flow";
import {
  getLatestPracticeSet,
  markPracticeSetCompleted,
  savePracticeSet,
  updatePracticeSetSession,
} from "./scene-learning-flow-storage";

const practiceSet: PracticeSet = {
  id: "practice-storage-1",
  sourceSceneId: "scene-storage-1",
  sourceSceneTitle: "Storage Scene",
  sourceType: "original",
  exercises: [
    {
      id: "exercise-1",
      type: "chunk_cloze",
      inputMode: "typing",
      sceneId: "scene-storage-1",
      sentenceId: "sentence-1",
      chunkId: "chunk-1",
      prompt: "补全句子中的表达",
      answer: {
        text: "call it a day",
        acceptedAnswers: ["call it a day"],
      },
      cloze: {
        displayText: "I should ____ now.",
      },
    },
  ],
  status: "generated",
  createdAt: "2026-03-23T08:00:00.000Z",
};

afterEach(() => {
  window.localStorage.clear();
});

test("scene learning flow storage 会持久化练习过程", () => {
  savePracticeSet(practiceSet);

  updatePracticeSetSession(practiceSet.sourceSceneId, practiceSet.id, {
    activeExerciseIndex: 0,
    answerMap: { "exercise-1": "call it a day" },
    resultMap: { "exercise-1": "correct" },
    attemptCountMap: { "exercise-1": 2 },
    incorrectCountMap: { "exercise-1": 1 },
    updatedAt: "2026-03-23T08:05:00.000Z",
  });

  const latestPracticeSet = getLatestPracticeSet(practiceSet.sourceSceneId);
  assert.ok(latestPracticeSet);
  assert.equal(latestPracticeSet.sessionState?.answerMap["exercise-1"], "call it a day");
  assert.equal(latestPracticeSet.sessionState?.attemptCountMap["exercise-1"], 2);
  assert.equal(latestPracticeSet.sessionState?.incorrectCountMap["exercise-1"], 1);
});

test("scene learning flow storage 在标记完成时会清空练习过程", () => {
  savePracticeSet(practiceSet);

  updatePracticeSetSession(practiceSet.sourceSceneId, practiceSet.id, {
    activeExerciseIndex: 0,
    answerMap: { "exercise-1": "call it a day" },
    resultMap: { "exercise-1": "correct" },
    attemptCountMap: { "exercise-1": 1 },
    incorrectCountMap: {},
    updatedAt: "2026-03-23T08:06:00.000Z",
  });

  markPracticeSetCompleted(practiceSet.sourceSceneId, practiceSet.id);

  const latestPracticeSet = getLatestPracticeSet(practiceSet.sourceSceneId);
  assert.ok(latestPracticeSet);
  assert.equal(latestPracticeSet.status, "completed");
  assert.equal(latestPracticeSet.sessionState, undefined);
});
