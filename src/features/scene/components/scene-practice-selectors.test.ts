import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBestSentenceAssessment,
  didSentenceReachCompleteMilestone,
} from "./scene-practice-selectors";

test("deriveBestSentenceAssessment 会按同一句的最高里程碑聚合", () => {
  const assessment = deriveBestSentenceAssessment({
    exercises: [
      { id: "exercise-1", sentenceId: "sentence-1" },
      { id: "exercise-2", sentenceId: "sentence-1" },
      { id: "exercise-3", sentenceId: "sentence-2" },
    ],
    assessmentMap: {
      "exercise-1": "keyword",
      "exercise-2": "complete",
      "exercise-3": "structure",
    },
    sentenceId: "sentence-1",
    fallbackExerciseId: "exercise-1",
  });

  assert.equal(assessment, "complete");
});

test("didSentenceReachCompleteMilestone 只会在首次达到 complete 时返回 true", () => {
  assert.equal(
    didSentenceReachCompleteMilestone({
      previous: "structure",
      next: "complete",
    }),
    true,
  );

  assert.equal(
    didSentenceReachCompleteMilestone({
      previous: "complete",
      next: "complete",
    }),
    false,
  );
});
