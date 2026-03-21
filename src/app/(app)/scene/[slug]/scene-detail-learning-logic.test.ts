import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSceneLearningUpdatePayload,
  shouldFlushSceneLearningDelta,
} from "./scene-detail-learning-logic";

test("shouldFlushSceneLearningDelta 只在真正需要同步时返回 true", () => {
  assert.equal(
    shouldFlushSceneLearningDelta({
      hasBaseLesson: false,
      learningStarted: true,
      studySecondsDelta: 10,
      withPause: false,
    }),
    false,
  );
  assert.equal(
    shouldFlushSceneLearningDelta({
      hasBaseLesson: true,
      learningStarted: false,
      studySecondsDelta: 10,
      withPause: false,
    }),
    false,
  );
  assert.equal(
    shouldFlushSceneLearningDelta({
      hasBaseLesson: true,
      learningStarted: true,
      studySecondsDelta: 0,
      withPause: false,
    }),
    false,
  );
  assert.equal(
    shouldFlushSceneLearningDelta({
      hasBaseLesson: true,
      learningStarted: true,
      studySecondsDelta: 0,
      withPause: true,
    }),
    true,
  );
});

test("buildSceneLearningUpdatePayload 会稳定映射 viewMode 和 variant 信息", () => {
  assert.deepEqual(
    buildSceneLearningUpdatePayload({
      viewMode: "scene",
    }),
    {
      progressPercent: 20,
      lastVariantIndex: undefined,
      withPause: false,
    },
  );

  assert.deepEqual(
    buildSceneLearningUpdatePayload({
      viewMode: "variant-study",
      activeVariantId: "variant-1",
      withPause: true,
    }),
    {
      progressPercent: 65,
      lastVariantIndex: 1,
      withPause: true,
    },
  );
});
