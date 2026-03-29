import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { LearningDashboardResponse } from "@/lib/utils/learning-api";
import { savePracticeSet, saveVariantSet } from "@/lib/utils/scene-learning-flow-storage";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

import {
  buildTodayTasks,
  getContinueLearningHelperText,
  getContinueLearningHref,
  getContinueLearningStepLabel,
  getRecommendedScenes,
  resolveContinueLearning,
} from "./today-page-selectors";

const createLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
};

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
    sceneTask: {
      done: false,
      continueSceneSlug: null,
      currentStep: null,
      masteryStage: null,
      progressPercent: 0,
    },
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
  {
    id: "scene-3",
    slug: "wrap-up",
    title: "Wrap Up",
    subtitle: "Completed scene",
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    sentenceCount: 5,
    sceneType: "dialogue",
    sourceType: "builtin",
    createdAt: "2026-03-19T00:00:00.000Z",
    variantLinks: [],
    learningStatus: "completed",
    progressPercent: 100,
    lastViewedAt: "2026-03-19T00:00:00.000Z",
  },
];

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: createLocalStorageMock(),
    },
  });
});

afterEach(() => {
  window.localStorage.clear();
});

test("resolveContinueLearning 会优先使用 dashboard，否则回退到首个场景", () => {
  const fallback = resolveContinueLearning(dashboard, scenes);
  assert.equal(fallback?.sceneSlug, "coffee-chat");
  assert.equal(fallback?.savedPhraseCount, 0);
  assert.equal(fallback?.currentStep, null);

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
        currentStep: "focus_expression",
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

test("today continue helper 会优先展示当前训练步骤", () => {
  const continueLearning = resolveContinueLearning(
    {
      ...dashboard,
      continueLearning: {
        sceneSlug: "direct-scene",
        title: "Direct Scene",
        subtitle: "From dashboard",
        progressPercent: 60,
        masteryStage: "focus",
        masteryPercent: 35,
        currentStep: "practice_sentence",
        lastViewedAt: "2026-03-21T00:00:00.000Z",
        lastSentenceIndex: 3,
        estimatedMinutes: 11,
        savedPhraseCount: 6,
      },
    },
    scenes,
  );

  assert.equal(getContinueLearningStepLabel(continueLearning), "练核心句");
  assert.match(getContinueLearningHelperText(continueLearning), /当前先练核心句/);
});

test("today continue helper 会优先读取 today sceneTask 里的训练状态", () => {
  const continueLearning = resolveContinueLearning(dashboard, scenes);
  const taskScene = {
    done: false,
    continueSceneSlug: "coffee-chat",
    currentStep: "focus_expression" as const,
    masteryStage: "focus" as const,
    progressPercent: 35,
  };

  assert.equal(getContinueLearningStepLabel(continueLearning, taskScene), "看重点表达");
  assert.match(getContinueLearningHelperText(continueLearning, taskScene), /35%/);
});

test("resolveContinueLearning 会在没有服务端 continue 时优先接住本地回炉练习", () => {
  savePracticeSet({
    id: "repeat-practice-1",
    sourceSceneId: "scene-3",
    sourceSceneTitle: "Wrap Up",
    sourceType: "original",
    exercises: [],
    status: "generated",
    createdAt: "2026-03-25T08:00:00.000Z",
  });

  const continueLearning = resolveContinueLearning(
    {
      ...dashboard,
      continueLearning: null,
    },
    scenes,
  );

  assert.equal(continueLearning?.sceneSlug, "wrap-up");
  assert.equal(continueLearning?.repeatMode, "practice");
  assert.equal(getContinueLearningStepLabel(continueLearning), "回炉练场景练习");
  assert.equal(getContinueLearningHref(continueLearning), "/scene/wrap-up?view=practice");
  assert.match(getContinueLearningHelperText(continueLearning), /直接回到场景练习|主动提取一轮/);
});

test("resolveContinueLearning 会优先选择更新的回炉变体训练", () => {
  savePracticeSet({
    id: "repeat-practice-1",
    sourceSceneId: "scene-3",
    sourceSceneTitle: "Wrap Up",
    sourceType: "original",
    exercises: [],
    status: "generated",
    createdAt: "2026-03-25T08:00:00.000Z",
  });
  saveVariantSet({
    id: "repeat-variant-1",
    sourceSceneId: "scene-3",
    sourceSceneTitle: "Wrap Up",
    reusedChunks: ["call it a day"],
    variants: [],
    status: "generated",
    createdAt: "2026-03-25T09:00:00.000Z",
  });

  const continueLearning = resolveContinueLearning(
    {
      ...dashboard,
      continueLearning: null,
    },
    scenes,
  );

  assert.equal(continueLearning?.sceneSlug, "wrap-up");
  assert.equal(continueLearning?.repeatMode, "variants");
  assert.equal(getContinueLearningStepLabel(continueLearning), "回炉练变体训练");
  assert.equal(getContinueLearningHref(continueLearning), "/scene/wrap-up?view=variants");
});

test("buildTodayTasks 会生成按学习回路编排的三类任务", () => {
  const continueLearning = resolveContinueLearning(dashboard, scenes);
  const tasks = buildTodayTasks({
    dashboard,
    continueLearning,
    labels: {
      taskSceneTitle: "先完成一个场景输入",
      taskSceneDesc: "进入一个真实语境，先听懂、看懂，再开始训练。",
      taskReviewTitle: "最后做一轮回忆",
      taskOutputTitle: "带走 1 到 2 条表达",
    },
  });

  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].actionHref, "/scene/coffee-chat");
  assert.equal(tasks[0].status, "up_next");
  assert.equal(tasks[1].status, "done");
  assert.equal(tasks[2].status, "locked");
  assert.match(tasks[0].description, /Coffee Chat/);
  assert.match(tasks[0].description, /听熟这段|先听熟场景/);
  assert.match(tasks[1].description, /今天已带走 4 条表达/);
  assert.match(tasks[2].description, /先完成场景输入和表达沉淀/);
});

test("buildTodayTasks 在回炉训练时不会把场景任务误判成已完成", () => {
  savePracticeSet({
    id: "repeat-practice-1",
    sourceSceneId: "scene-3",
    sourceSceneTitle: "Wrap Up",
    sourceType: "original",
    exercises: [],
    status: "generated",
    createdAt: "2026-03-25T08:00:00.000Z",
  });

  const repeatDashboard: LearningDashboardResponse = {
    ...dashboard,
    todayTasks: {
      ...dashboard.todayTasks,
      sceneTask: {
        done: true,
        continueSceneSlug: null,
        currentStep: null,
        masteryStage: null,
        progressPercent: 100,
      },
    },
  };

  const continueLearning = resolveContinueLearning(repeatDashboard, scenes);
  const tasks = buildTodayTasks({
    dashboard: repeatDashboard,
    continueLearning,
    labels: {
      taskSceneTitle: "先完成一个场景输入",
      taskSceneDesc: "进入一个真实语境，先听懂、看懂，再开始训练。",
      taskReviewTitle: "最后做一轮回忆",
      taskOutputTitle: "带走 1 到 2 条表达",
    },
  });

  assert.equal(tasks[0]?.done, false);
  assert.equal(tasks[0]?.status, "up_next");
  assert.match(tasks[0]?.description ?? "", /回到 Wrap Up/);
});

test("buildTodayTasks 在回炉训练时不会把 output 和 review 重新锁住", () => {
  savePracticeSet({
    id: "repeat-practice-1",
    sourceSceneId: "scene-3",
    sourceSceneTitle: "Wrap Up",
    sourceType: "original",
    exercises: [],
    status: "generated",
    createdAt: "2026-03-25T08:00:00.000Z",
  });

  const repeatDashboard: LearningDashboardResponse = {
    ...dashboard,
    todayTasks: {
      sceneTask: {
        done: false,
        continueSceneSlug: null,
        currentStep: null,
        masteryStage: null,
        progressPercent: 0,
      },
      reviewTask: { done: false, reviewItemsCompleted: 0, dueReviewCount: 3 },
      outputTask: { done: false, phrasesSavedToday: 0 },
    },
  };

  const continueLearning = resolveContinueLearning(repeatDashboard, scenes);
  const tasks = buildTodayTasks({
    dashboard: repeatDashboard,
    continueLearning,
    labels: {
      taskSceneTitle: "先完成一个场景输入",
      taskSceneDesc: "进入一个真实语境，先听懂、看懂，再开始训练。",
      taskReviewTitle: "最后做一轮回忆",
      taskOutputTitle: "带走 1 到 2 条表达",
    },
  });

  assert.equal(tasks[0]?.status, "up_next");
  assert.equal(tasks[1]?.status, "up_next");
  assert.equal(tasks[2]?.status, "available");
});

test("getRecommendedScenes 会按顺序截取推荐场景", () => {
  assert.deepEqual(
    getRecommendedScenes(scenes, 1).map((scene) => scene.slug),
    ["coffee-chat"],
  );
});
