import assert from "node:assert/strict";
import test from "node:test";

import type { SceneListItem } from "@/lib/server/scene/service";

import {
  getNextStarterScene,
  getStarterPathScenes,
  getTodayPrimaryRecommendation,
} from "./today-primary-recommendation";

const createScene = (
  overrides: Partial<SceneListItem> & Pick<SceneListItem, "id" | "slug" | "title">,
): SceneListItem => ({
  id: overrides.id,
  slug: overrides.slug,
  title: overrides.title,
  subtitle: overrides.subtitle ?? "",
  level: Object.prototype.hasOwnProperty.call(overrides, "level") ? (overrides.level ?? null) : "L0",
  category: Object.prototype.hasOwnProperty.call(overrides, "category")
    ? (overrides.category ?? null)
    : "starter",
  subcategory: overrides.subcategory ?? null,
  difficulty: overrides.difficulty ?? "Beginner",
  estimatedMinutes: overrides.estimatedMinutes ?? 5,
  learningGoal: overrides.learningGoal ?? "Default learning goal",
  tags: overrides.tags ?? [],
  sentenceCount: overrides.sentenceCount ?? 6,
  sceneType: overrides.sceneType ?? "dialogue",
  sourceType: overrides.sourceType ?? "builtin",
  isStarter: overrides.isStarter ?? true,
  starterOrder: Object.prototype.hasOwnProperty.call(overrides, "starterOrder")
    ? (overrides.starterOrder ?? null)
    : (overrides.isStarter ?? true)
      ? (overrides.sortOrder ?? 0)
      : null,
  isFeatured: overrides.isFeatured ?? false,
  sortOrder: overrides.sortOrder ?? 0,
  createdAt: overrides.createdAt ?? "2026-05-14T00:00:00.000Z",
  variantLinks: overrides.variantLinks ?? [],
  learningStatus: overrides.learningStatus ?? "not_started",
  progressPercent: overrides.progressPercent ?? 0,
  lastViewedAt: overrides.lastViewedAt ?? null,
});

test("returns the first starter scene for a brand-new learner", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({ id: "scene-2", slug: "ask-repeat", title: "Asking Someone to Repeat", sortOrder: 2 }),
      createScene({ id: "scene-1", slug: "daily-greeting", title: "Daily Greeting", sortOrder: 1 }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "start_starter");
  assert.equal(recommendation.scene?.slug, "daily-greeting");
});

test("new learner with no progress gets daily-greeting as the starter recommendation", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-2",
        slug: "self-introduction",
        title: "Self Introduction",
        starterOrder: 102,
      }),
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        starterOrder: 101,
      }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "start_starter");
  assert.equal(recommendation.scene?.slug, "daily-greeting");
  assert.equal(recommendation.scene?.level, "L0");
  assert.equal(recommendation.scene?.category, "starter");
  assert.equal(recommendation.scene?.learningGoal, "Default learning goal");
  assert.match(recommendation.reason, /Start Here|第一个场景|第一次学习/);
  assert.equal(recommendation.href, "/scene/daily-greeting");
});

test("getNextStarterScene returns the first starter scene for a brand-new learner", () => {
  const nextStarter = getNextStarterScene({
    scenes: [
      createScene({
        id: "scene-2",
        slug: "self-intro",
        title: "Self Introduction",
        sortOrder: 1,
        starterOrder: 2,
      }),
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        sortOrder: 99,
        starterOrder: 1,
      }),
    ],
  });

  assert.equal(nextStarter?.slug, "daily-greeting");
});

test("keeps continue learning as the top recommendation", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        learningStatus: "in_progress",
        progressPercent: 40,
      }),
    ],
    continueLearning: {
      sceneSlug: "daily-greeting",
      title: "Daily Greeting",
      subtitle: "Greetings and replies",
      progressPercent: 40,
      estimatedMinutes: 5,
    },
    dueReviewCount: 3,
  });

  assert.equal(recommendation.type, "continue");
  assert.equal(recommendation.scene?.slug, "daily-greeting");
});

test("returns the next starter scene after partial starter completion", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        sortOrder: 1,
        learningStatus: "completed",
        progressPercent: 100,
      }),
      createScene({
        id: "scene-2",
        slug: "self-intro",
        title: "Self Introduction",
        sortOrder: 2,
      }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "next_starter");
  assert.equal(recommendation.scene?.slug, "self-intro");
  assert.equal(recommendation.completedStarterCount, 1);
  assert.equal(recommendation.totalStarterCount, 2);
});

test("getNextStarterScene returns the second starter after the first is completed", () => {
  const nextStarter = getNextStarterScene({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        starterOrder: 1,
        learningStatus: "completed",
        progressPercent: 100,
      }),
      createScene({
        id: "scene-2",
        slug: "self-introduction",
        title: "Self Introduction",
        starterOrder: 2,
      }),
    ],
  });

  assert.equal(nextStarter?.slug, "self-introduction");
});

test("after completing daily-greeting, dashboard recommends self-introduction", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        starterOrder: 101,
        learningStatus: "completed",
        progressPercent: 100,
      }),
      createScene({
        id: "scene-2",
        slug: "self-introduction",
        title: "Self Introduction",
        starterOrder: 102,
      }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "next_starter");
  assert.equal(recommendation.scene?.slug, "self-introduction");
  assert.equal(recommendation.href, "/scene/self-introduction");
});

test("after completing the first two starters, dashboard recommends asking-someone-to-repeat", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        starterOrder: 101,
        learningStatus: "completed",
        progressPercent: 100,
      }),
      createScene({
        id: "scene-2",
        slug: "self-introduction",
        title: "Self Introduction",
        starterOrder: 102,
        learningStatus: "completed",
        progressPercent: 100,
      }),
      createScene({
        id: "scene-3",
        slug: "asking-someone-to-repeat",
        title: "Asking Someone to Repeat",
        starterOrder: 103,
      }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "next_starter");
  assert.equal(recommendation.scene?.slug, "asking-someone-to-repeat");
  assert.equal(recommendation.completedStarterCount, 2);
  assert.equal(recommendation.totalStarterCount, 3);
});

test("dashboard recommends an in-progress starter when no continueLearning object is provided", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        starterOrder: 101,
      }),
      createScene({
        id: "scene-2",
        slug: "self-introduction",
        title: "Self Introduction",
        starterOrder: 102,
        learningStatus: "in_progress",
        progressPercent: 30,
      }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "start_starter");
  assert.equal(recommendation.scene?.slug, "self-introduction");
  assert.equal(recommendation.scene?.progressPercent, 30);
});

test("getNextStarterScene prefers an in-progress starter over an earlier not-started scene", () => {
  const nextStarter = getNextStarterScene({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        starterOrder: 1,
      }),
      createScene({
        id: "scene-2",
        slug: "self-introduction",
        title: "Self Introduction",
        starterOrder: 2,
        learningStatus: "in_progress",
        progressPercent: 30,
      }),
    ],
  });

  assert.equal(nextStarter?.slug, "self-introduction");
});

test("getNextStarterScene returns null when every starter is completed", () => {
  const nextStarter = getNextStarterScene({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        starterOrder: 1,
        learningStatus: "completed",
        progressPercent: 100,
      }),
      createScene({
        id: "scene-2",
        slug: "self-introduction",
        title: "Self Introduction",
        starterOrder: 2,
        learningStatus: "completed",
        progressPercent: 100,
      }),
    ],
  });

  assert.equal(nextStarter, null);
});

test("getStarterPathScenes excludes non-starter builtin scenes from the starter path", () => {
  const starterPath = getStarterPathScenes([
    createScene({
      id: "scene-1",
      slug: "daily-greeting",
      title: "Daily Greeting",
      starterOrder: 1,
    }),
    createScene({
      id: "scene-2",
      slug: "ordering-coffee",
      title: "Ordering Coffee",
      category: "daily_life",
      isStarter: false,
      sourceType: "builtin",
      sortOrder: 2,
      starterOrder: null,
    }),
  ]);

  assert.deepEqual(starterPath.map((scene) => scene.slug), ["daily-greeting"]);
});

test("returns the next daily path scene after all starters are complete", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        learningStatus: "completed",
        progressPercent: 100,
      }),
      createScene({
        id: "scene-2",
        slug: "ordering-coffee",
        title: "Ordering Coffee",
        category: "daily_life",
        isStarter: false,
        sortOrder: 3,
      }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "next_daily");
  assert.equal(recommendation.scene?.slug, "ordering-coffee");
});

test("returns an empty recommendation when no scenes are available", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "empty");
  assert.equal(recommendation.scene, null);
});

test("returns an empty recommendation without throwing after all starter scenes are completed", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        starterOrder: 101,
        learningStatus: "completed",
        progressPercent: 100,
      }),
      createScene({
        id: "scene-2",
        slug: "self-introduction",
        title: "Self Introduction",
        starterOrder: 102,
        learningStatus: "completed",
        progressPercent: 100,
      }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "empty");
  assert.equal(recommendation.scene, null);
  assert.equal(recommendation.completedStarterCount, undefined);
});

test("does not crash when optional scene metadata is missing", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        level: null,
        category: null,
        isStarter: true,
      }),
    ],
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(recommendation.type, "start_starter");
  assert.equal(recommendation.scene?.level, null);
  assert.equal(recommendation.scene?.category, null);
});

test("review pressure does not override continue learning", () => {
  const recommendation = getTodayPrimaryRecommendation({
    scenes: [
      createScene({
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        learningStatus: "paused",
        progressPercent: 20,
      }),
    ],
    continueLearning: {
      sceneSlug: "daily-greeting",
      title: "Daily Greeting",
      subtitle: "Greetings and replies",
      progressPercent: 20,
      estimatedMinutes: 5,
    },
    dueReviewCount: 5,
  });

  assert.equal(recommendation.type, "continue");
});
