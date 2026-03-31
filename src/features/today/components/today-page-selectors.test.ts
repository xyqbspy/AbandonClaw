import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { LearningDashboardResponse } from "@/lib/utils/learning-api";
import { savePracticeSet, saveVariantSet } from "@/lib/utils/scene-learning-flow-storage";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

import {
  buildTodayTasks,
  getContinueLearningCardState,
  getContinueLearningHelperText,
  getContinueLearningHref,
  getContinueLearningStepLabel,
  getRecommendedScenes,
  resolveContinueLearning,
  resolveContinueLearningState,
  resolveTodayLearningSnapshot,
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
      completedSentenceCount: 0,
    },
    reviewTask: {
      done: false,
      reviewItemsCompleted: 2,
      dueReviewCount: 6,
      confidentOutputCountToday: 0,
      fullOutputCountToday: 0,
    },
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

test("resolveContinueLearning 优先使用 dashboard continue，否则回退到首个场景", () => {
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
        completedSentenceCount: 0,
      },
    },
    scenes,
  );
  assert.equal(direct?.sceneSlug, "direct-scene");
});

test("today continue helper 会区分句子练习与整段练习", () => {
  const sentencePractice = resolveContinueLearning(
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
        completedSentenceCount: 0,
      },
    },
    scenes,
  );

  assert.equal(getContinueLearningStepLabel(sentencePractice), "进入句子练习");
  assert.match(getContinueLearningHelperText(sentencePractice), /至少先把一句推进到完整复现/);

  const scenePractice = resolveContinueLearning(
    {
      ...dashboard,
      continueLearning: {
        sceneSlug: "direct-scene",
        title: "Direct Scene",
        subtitle: "From dashboard",
        progressPercent: 80,
        masteryStage: "scene_practice",
        masteryPercent: 80,
        currentStep: "scene_practice",
        lastViewedAt: "2026-03-21T00:00:00.000Z",
        lastSentenceIndex: 3,
        estimatedMinutes: 11,
        savedPhraseCount: 6,
        completedSentenceCount: 1,
      },
    },
    scenes,
  );

  assert.equal(getContinueLearningStepLabel(scenePractice), "继续整段练习");
  assert.match(getContinueLearningHelperText(scenePractice), /把这一轮题型完整做完/);
});

test("today continue helper 会优先读取 sceneTask 的训练状态", () => {
  const continueLearning = resolveContinueLearning(dashboard, scenes);
  const taskScene = {
    done: false,
    continueSceneSlug: "coffee-chat",
    currentStep: "focus_expression" as const,
    masteryStage: "focus" as const,
    progressPercent: 35,
    completedSentenceCount: 0,
  };

  assert.equal(getContinueLearningStepLabel(continueLearning, taskScene), "看重点表达");
  assert.match(getContinueLearningHelperText(continueLearning, taskScene), /35%/);
});

test("continue learning card 等待数据时不会回退成开始新场景", () => {
  const cardState = getContinueLearningCardState({
    continueLearning: null,
    sceneTask: dashboard.todayTasks.sceneTask,
    isPending: true,
    emptyTitle: "从一个场景开始今天的输入",
    emptyDesc: "你还没有进行中的场景，先选一个真实语境开始。",
  });

  assert.equal(cardState.isPending, true);
  assert.equal(cardState.title, "正在恢复今天的学习进度");
  assert.equal(cardState.stepLabel, "正在加载");
  assert.equal(cardState.ctaLabel, "正在恢复进度...");
  assert.notEqual(cardState.stepLabel, "开始一个新场景");
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

test("buildTodayTasks 在回炉练习时不会把场景任务误判成已完成", () => {
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
        completedSentenceCount: 0,
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

test("buildTodayTasks 在回炉练习时不会把 output 和 review 重新锁住", () => {
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
        completedSentenceCount: 0,
      },
      reviewTask: {
        done: false,
        reviewItemsCompleted: 0,
        dueReviewCount: 3,
        confidentOutputCountToday: 0,
        fullOutputCountToday: 0,
      },
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

test("buildTodayTasks 会把 review 正式信号摘要写进说明文案", () => {
  const summaryDashboard: LearningDashboardResponse = {
    ...dashboard,
    todayTasks: {
      ...dashboard.todayTasks,
      reviewTask: {
        done: true,
        reviewItemsCompleted: 3,
        dueReviewCount: 0,
        confidentOutputCountToday: 2,
        fullOutputCountToday: 1,
      },
    },
  };

  const tasks = buildTodayTasks({
    dashboard: summaryDashboard,
    continueLearning: null,
    labels: {
      taskSceneTitle: "先完成一个场景输入",
      taskSceneDesc: "进入一个真实语境，先听懂、看懂，再开始训练。",
      taskReviewTitle: "最后做一轮回忆",
      taskOutputTitle: "带走 1 到 2 条表达",
    },
  });

  assert.match(tasks[2]?.description ?? "", /其中 1 条进入完整输出/);
});

test("resolveContinueLearningState 会返回 continue learning 的来源", () => {
  const dashboardSource = resolveContinueLearningState(
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
        completedSentenceCount: 0,
      },
    },
    scenes,
  );
  assert.equal(dashboardSource.source, "dashboard");

  savePracticeSet({
    id: "repeat-practice-1",
    sourceSceneId: "scene-3",
    sourceSceneTitle: "Wrap Up",
    sourceType: "original",
    exercises: [],
    status: "generated",
    createdAt: "2026-03-25T08:00:00.000Z",
  });

  const repeatSource = resolveContinueLearningState(
    {
      ...dashboard,
      continueLearning: null,
    },
    scenes,
  );
  assert.equal(repeatSource.source, "local-repeat");

  window.localStorage.clear();
  const fallbackSource = resolveContinueLearningState(dashboard, scenes);
  assert.equal(fallbackSource.source, "scene-list-fallback");
});

test("resolveTodayLearningSnapshot 会优先使用 sceneTask 的步骤和进度", () => {
  const snapshot = resolveTodayLearningSnapshot({
    dashboard: {
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
        completedSentenceCount: 0,
      },
      todayTasks: {
        ...dashboard.todayTasks,
        sceneTask: {
          done: false,
          continueSceneSlug: "direct-scene",
          currentStep: "scene_practice",
          masteryStage: "scene_practice",
          progressPercent: 80,
          completedSentenceCount: 1,
        },
      },
    },
    sceneList: scenes,
  });

  assert.equal(snapshot.continueLearningSource, "dashboard");
  assert.equal(snapshot.effectiveCurrentStep, "scene_practice");
  assert.equal(snapshot.effectiveMasteryStage, "scene_practice");
  assert.equal(snapshot.effectiveProgressPercent, 80);
});

test("getRecommendedScenes 会按顺序截取推荐场景", () => {
  assert.deepEqual(
    getRecommendedScenes(scenes, 1).map((scene) => scene.slug),
    ["coffee-chat"],
  );
});
