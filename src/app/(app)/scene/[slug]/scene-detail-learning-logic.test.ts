import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSceneLearningUpdatePayload,
  resolveSceneNetworkStrategy,
  shouldFlushSceneLearningDelta,
} from "./scene-detail-learning-logic";

test("resolveSceneNetworkStrategy 会区分新鲜缓存、过期缓存和无缓存场景", () => {
  assert.deepEqual(
    resolveSceneNetworkStrategy({
      cacheFound: false,
      cacheExpired: false,
    }),
    {
      shouldUseCacheFallback: false,
      shouldFetchNetwork: true,
    },
  );

  assert.deepEqual(
    resolveSceneNetworkStrategy({
      cacheFound: true,
      cacheExpired: false,
    }),
    {
      shouldUseCacheFallback: true,
      shouldFetchNetwork: false,
    },
  );

  assert.deepEqual(
    resolveSceneNetworkStrategy({
      cacheFound: true,
      cacheExpired: true,
    }),
    {
      shouldUseCacheFallback: true,
      shouldFetchNetwork: true,
    },
  );
});

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
