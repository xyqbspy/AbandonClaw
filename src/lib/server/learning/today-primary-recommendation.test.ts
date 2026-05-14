import assert from "node:assert/strict";
import test from "node:test";

import type { SceneListItem } from "@/lib/server/scene/service";

import { getTodayPrimaryRecommendation } from "./today-primary-recommendation";

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
