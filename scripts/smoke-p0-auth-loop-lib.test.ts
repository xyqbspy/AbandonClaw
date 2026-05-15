import assert from "node:assert/strict";
import test from "node:test";
import {
  extractFirstSceneChunk,
  getStarterSlugFromDashboard,
  isAdminAccessDeniedResult,
} from "./smoke-p0-auth-loop-lib";

test("extractFirstSceneChunk 会从 scene lesson 中取出第一个 builtin chunk", () => {
  const chunk = extractFirstSceneChunk({
    sections: [
      {
        blocks: [
          {
            id: "block-1",
            sentences: [
              {
                text: "Hello there",
                chunks: [
                  {
                    text: "Hello there",
                    translation: "你好呀",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(chunk, {
    text: "Hello there",
    translation: "你好呀",
    sentenceText: "Hello there",
    sentenceIndex: 0,
    blockId: "block-1",
  });
});

test("getStarterSlugFromDashboard 读取 starter recommendation scene slug", () => {
  assert.equal(
    getStarterSlugFromDashboard({
      overview: {
        streakDays: 0,
        completedScenesCount: 0,
        inProgressScenesCount: 0,
        savedPhraseCount: 0,
        recentStudyMinutes: 0,
        reviewAccuracy: null,
      },
      continueLearning: null,
      todayTasks: {
        sceneTask: {
          done: false,
          continueSceneSlug: null,
          currentStep: null,
          masteryStage: null,
          progressPercent: 0,
          completedSentenceCount: 0,
        },
        reviewTask: {
          done: false,
          reviewItemsCompleted: 0,
          dueReviewCount: 0,
          confidentOutputCountToday: 0,
          fullOutputCountToday: 0,
          variantRewriteCountToday: 0,
          targetCoverageCountToday: 0,
          targetCoverageMissCountToday: 0,
        },
        outputTask: {
          done: false,
          phrasesSavedToday: 0,
        },
      },
      starterRecommendation: {
        type: "start_starter",
        scene: {
          id: "scene-1",
          slug: "daily-greeting",
          title: "Daily Greeting",
          description: null,
          level: "L0",
          category: "daily_life",
          estimatedMinutes: 5,
          learningGoal: null,
          progressPercent: 0,
        },
        title: "今天从这里开始",
        reason: "reason",
        ctaLabel: "start",
        href: "/scene/daily-greeting",
      },
    }),
    "daily-greeting",
  );
});

test("isAdminAccessDeniedResult accepts redirect or 403 only", () => {
  assert.equal(
    isAdminAccessDeniedResult({
      status: 302,
      durationMs: 10,
      ok: false,
      requestId: "req-redirect",
      headers: { location: "/" },
      bodyText: "",
      bodyJson: null,
    }),
    true,
  );
  assert.equal(
    isAdminAccessDeniedResult({
      status: 403,
      durationMs: 10,
      ok: false,
      requestId: "req-forbidden",
      headers: {},
      bodyText: "",
      bodyJson: null,
    }),
    true,
  );
  assert.equal(
    isAdminAccessDeniedResult({
      status: 200,
      durationMs: 10,
      ok: true,
      requestId: "req-ok",
      headers: {},
      bodyText: "",
      bodyJson: null,
    }),
    false,
  );
});
