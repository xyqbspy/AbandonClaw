import assert from "node:assert/strict";
import test from "node:test";
import type { SceneListItemResponse } from "@/lib/utils/scenes-api";
import {
  filterScenes,
  getPrimarySceneAction,
  getSceneActionLabel,
  getSceneCategoryLabel,
  getSceneLevelLabel,
  getSceneStatus,
  groupScenesIntoStarterPacks,
  normalizeSceneLevel,
  sortScenes,
  splitSceneTitleParts,
} from "./scene-display";

const scenes: SceneListItemResponse[] = [
  {
    id: "scene-1",
    slug: "daily-greeting",
    title: "Daily Greeting（日常问候）",
    subtitle: "学会最基础的问候、回应和结束对话",
    level: "L0",
    category: "starter",
    difficulty: "Beginner",
    estimatedMinutes: 5,
    learningGoal: "学会最基础的问候、回应和结束对话",
    sentenceCount: 8,
    sceneType: "dialogue",
    sourceType: "builtin",
    isStarter: true,
    isFeatured: true,
    sortOrder: 1,
    createdAt: "2026-05-14T00:00:00.000Z",
    variantLinks: [],
    learningStatus: "not_started",
    progressPercent: 0,
    lastViewedAt: null,
  },
  {
    id: "scene-2",
    slug: "ordering-coffee",
    title: "Ordering Coffee（点咖啡）",
    subtitle: "学会点咖啡和表达感谢",
    level: "L0",
    category: "daily_life",
    difficulty: "Beginner",
    estimatedMinutes: 5,
    learningGoal: "学会点咖啡和表达感谢",
    sentenceCount: 10,
    sceneType: "dialogue",
    sourceType: "builtin",
    isStarter: false,
    isFeatured: true,
    sortOrder: 7,
    createdAt: "2026-05-13T00:00:00.000Z",
    variantLinks: [],
    learningStatus: "in_progress",
    progressPercent: 60,
    lastViewedAt: "2026-05-14T08:00:00.000Z",
  },
  {
    id: "scene-3",
    slug: "rescheduling-a-meeting",
    title: "Rescheduling a Meeting（改时间）",
    subtitle: "学会礼貌改时间",
    level: "L1",
    category: "time_plan",
    difficulty: "Intermediate",
    estimatedMinutes: 7,
    learningGoal: "学会礼貌改时间",
    sentenceCount: 12,
    sceneType: "dialogue",
    sourceType: "builtin",
    isStarter: false,
    isFeatured: false,
    sortOrder: 14,
    createdAt: "2026-05-12T00:00:00.000Z",
    variantLinks: [],
    learningStatus: "completed",
    progressPercent: 100,
    lastViewedAt: "2026-05-13T09:00:00.000Z",
  },
  {
    id: "scene-4",
    slug: "my-custom-scene",
    title: "My Custom Scene",
    subtitle: "我的场景",
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    sentenceCount: 9,
    sceneType: "dialogue",
    sourceType: "imported",
    createdAt: "2026-05-11T00:00:00.000Z",
    variantLinks: [],
    learningStatus: "paused",
    progressPercent: 25,
    lastViewedAt: "2026-05-14T10:00:00.000Z",
  },
];

test("scene-display 会标准化 level 和标签", () => {
  assert.equal(normalizeSceneLevel("L0"), "L0");
  assert.equal(normalizeSceneLevel("L9"), "unknown");
  assert.equal(getSceneLevelLabel("L1"), "基础");
  assert.equal(getSceneLevelLabel(undefined), "未分级");
  assert.equal(getSceneCategoryLabel("daily_life"), "日常生活");
});

test("scene-display 会拆分英文标题和中文标题", () => {
  assert.deepEqual(splitSceneTitleParts("Daily Greeting（日常问候）"), {
    englishTitle: "Daily Greeting",
    chineseTitle: "日常问候",
  });
  assert.deepEqual(splitSceneTitleParts("Ordering Coffee"), {
    englishTitle: "Ordering Coffee",
    chineseTitle: "",
  });
});

test("scene-display 会按推荐排序", () => {
  const result = sortScenes(scenes, "recommended");
  assert.deepEqual(
    result.map((scene) => scene.slug),
    ["daily-greeting", "ordering-coffee", "my-custom-scene", "rescheduling-a-meeting"],
  );
});

test("scene-display 会按分类、等级、来源和搜索过滤", () => {
  const result = filterScenes(scenes, {
    category: "daily_life",
    level: "L0",
    source: "builtin",
    search: "coffee",
  });
  assert.deepEqual(result.map((scene) => scene.slug), ["ordering-coffee"]);
});

test("scene-display 会组合 starter packs 并给出首个场景", () => {
  const packs = groupScenesIntoStarterPacks(scenes);
  const startHere = packs.find((pack) => pack.id === "start-here");
  const survival = packs.find((pack) => pack.id === "everyday-survival");

  assert.equal(startHere?.totalCount, 1);
  assert.equal(startHere?.primaryScene?.slug, "daily-greeting");
  assert.equal(survival?.primaryScene?.slug, "ordering-coffee");
});

test("scene-display 会给出场景状态和动作文案", () => {
  assert.equal(getSceneStatus(scenes[1]).label, "学习中");
  assert.equal(getSceneActionLabel(scenes[1]), "继续");
  assert.equal(getSceneActionLabel(scenes[2]), "复习");
});

test("scene-display 会优先给出继续学习 CTA", () => {
  const action = getPrimarySceneAction(scenes);
  assert.equal(action.kind, "continue");
  assert.equal(action.href, "/scene/my-custom-scene");
  assert.match(action.label, /My Custom Scene/);
});

test("scene-display 底部继续 CTA 会使用继续学和英文标题", () => {
  const action = getPrimarySceneAction([
    {
      ...scenes[1],
      title: "Ordering Coffee（咖啡店点单）",
    },
  ]);

  assert.equal(action.kind, "continue");
  assert.equal(action.label, "继续学 Ordering Coffee");
});
