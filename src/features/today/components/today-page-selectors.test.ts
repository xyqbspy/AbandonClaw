import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTodayTasks,
  getRecommendedScenes,
  resolveContinueLearning,
} from "./today-page-selectors";
import { LearningDashboardResponse } from "@/lib/utils/learning-api";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

const dashboard: LearningDashboardResponse = {
  overview: {
    streakDays: 3,
    completedScenesCount: 5,
    inProgressScenesCount: 2,
    savedPhraseCount: 20,
    recentStudyMinutes: 40,
    reviewAccuracy: 88,
  },
  continueLearning: null,
  todayTasks: {
    sceneTask: { done: false, continueSceneSlug: null },
    reviewTask: { done: false, reviewItemsCompleted: 2, dueReviewCount: 6 },
    outputTask: { done: true, phrasesSavedToday: 4 },
  },
};

const scenes: SceneListItemResponse[] = [
  {
    id: "scene-1",
    slug: "coffee-chat",
    title: "Coffee Chat",
    subtitle: "At the cafe",
    difficulty: "Intermediate",
    estimatedMinutes: 9,
    sentenceCount: 8,
    sceneType: "dialogue",
    sourceType: "builtin",
    createdAt: "2026-03-21T00:00:00.000Z",
    variantLinks: [],
    learningStatus: "in_progress",
    progressPercent: 30,
    lastViewedAt: "2026-03-21T00:00:00.000Z",
  },
  {
    id: "scene-2",
    slug: "office-small-talk",
    title: "Office Small Talk",
    subtitle: "At work",
    difficulty: "Intermediate",
    estimatedMinutes: 7,
    sentenceCount: 6,
    sceneType: "dialogue",
    sourceType: "builtin",
    createdAt: "2026-03-20T00:00:00.000Z",
    variantLinks: [],
    learningStatus: "not_started",
    progressPercent: 10,
    lastViewedAt: "2026-03-20T00:00:00.000Z",
  },
];

test("resolveContinueLearning 会优先用 dashboard，否则回退到首个场景", () => {
  const fallback = resolveContinueLearning(dashboard, scenes);
  assert.equal(fallback?.sceneSlug, "coffee-chat");
  assert.equal(fallback?.savedPhraseCount, 0);

  const direct = resolveContinueLearning(
    {
      ...dashboard,
      continueLearning: {
        sceneSlug: "direct-scene",
        title: "Direct Scene",
        subtitle: "From dashboard",
        progressPercent: 60,
        masteryStage: "focus",
        masteryPercent: 35,
        lastViewedAt: "2026-03-21T00:00:00.000Z",
        lastSentenceIndex: 3,
        estimatedMinutes: 11,
        savedPhraseCount: 6,
      },
    },
    scenes,
  );
  assert.equal(direct?.sceneSlug, "direct-scene");
});

test("buildTodayTasks 会生成稳定的三类任务", () => {
  const continueLearning = resolveContinueLearning(dashboard, scenes);
  const tasks = buildTodayTasks({
    dashboard,
    continueLearning,
    labels: {
      taskSceneTitle: "完成一个场景学习",
      taskSceneDesc: "选择一个场景开始学习，读完主场景后可直接完成。",
      taskReviewTitle: "进行一次短时复习",
      taskOutputTitle: "沉淀表达",
    },
  });

  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].actionHref, "/scene/coffee-chat");
  assert.equal(tasks[0].status, "up_next");
  assert.equal(tasks[1].status, "done");
  assert.equal(tasks[2].status, "locked");
  assert.match(tasks[0].description, /Coffee Chat/);
  assert.match(tasks[0].description, /完成本轮场景学习/);
  assert.match(tasks[1].description, /先完成一个场景学习/);
  assert.match(tasks[2].description, /先完成今天的场景输入/);
});

test("getRecommendedScenes 会按顺序截取推荐场景", () => {
  assert.deepEqual(
    getRecommendedScenes(scenes, 1).map((scene) => scene.slug),
    ["coffee-chat"],
  );
});
