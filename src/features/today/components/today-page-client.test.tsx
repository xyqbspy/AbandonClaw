import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const routerPushCalls: string[] = [];
const recentPhraseRows = [
  {
    userPhraseId: "phrase-1",
    phraseId: "phrase-1",
    text: "burn yourself out",
    normalizedText: "burn yourself out",
    translation: "把自己耗尽",
    usageNote: null,
    difficulty: null,
    tags: [],
    sourceSceneSlug: "staying-late-again",
    sourceType: "scene" as const,
    sourceNote: null,
    sourceSentenceIndex: null,
    sourceSentenceText: null,
    sourceChunkText: null,
    expressionClusterId: null,
    expressionClusterRole: null,
    expressionClusterMainUserPhraseId: null,
    aiEnrichmentStatus: null,
    semanticFocus: null,
    typicalScenario: null,
    exampleSentences: [],
    aiEnrichmentError: null,
    learningItemType: "expression" as const,
    savedAt: "2026-03-29T10:00:00.000Z",
    lastSeenAt: "2026-03-29T10:00:00.000Z",
    reviewStatus: "saved" as const,
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    masteredAt: null,
  },
];

const createDashboardResponse = () => ({
  overview: {
    streakDays: 3,
    completedScenesCount: 2,
    inProgressScenesCount: 1,
    savedPhraseCount: 12,
    recentStudyMinutes: 15,
    reviewAccuracy: 92,
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
      dueReviewCount: 2,
      confidentOutputCountToday: 0,
      fullOutputCountToday: 0,
      variantRewriteCountToday: 0,
      targetCoverageCountToday: 0,
      targetCoverageMissCountToday: 0,
    },
    outputTask: { done: false, phrasesSavedToday: 1 },
  },
  starterRecommendation: null,
});

const defaultDashboardCacheResult = { found: false, isExpired: false, record: null };
const defaultPhraseCacheResult = {
  found: true,
  isExpired: false,
  record: {
    data: {
      rows: recentPhraseRows,
    },
  },
};
const defaultSceneCacheResult = {
  found: true,
  isExpired: false,
  record: {
    data: [],
  },
};

let mockGetLearningDashboardCache = async () => defaultDashboardCacheResult;
let mockGetPhraseListCache = async () => defaultPhraseCacheResult;
let mockGetSceneListCache = async () => defaultSceneCacheResult;
let mockGetLearningDashboardFromApi = async () => createDashboardResponse();
let mockGetMyPhrasesFromApi = async () => ({
  rows: recentPhraseRows,
  total: recentPhraseRows.length,
  page: 1,
  limit: 3,
});
let mockGetScenesFromApi = async () => [];

const mockedModules = {
  "next/link": {
    __esModule: true,
    default: ({
      href,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...props }, children),
  },
  "next/navigation": {
    useRouter: () => ({
      push: (href: string) => {
        routerPushCalls.push(href);
      },
      refresh: () => undefined,
    }),
  },
  sonner: {
    toast: {
      error: () => undefined,
    },
  },
  "@/lib/cache/learning-dashboard-cache": {
    getLearningDashboardCache: () => mockGetLearningDashboardCache(),
    setLearningDashboardCache: async () => undefined,
  },
  "@/lib/cache/phrase-list-cache": {
    getPhraseListCache: () => mockGetPhraseListCache(),
    setPhraseListCache: async () => undefined,
  },
  "@/lib/cache/scene-list-cache": {
    getSceneListCache: () => mockGetSceneListCache(),
    setSceneListCache: async () => undefined,
  },
  "@/lib/utils/learning-api": {
    getLearningDashboardFromApi: () => mockGetLearningDashboardFromApi(),
  },
  "@/lib/utils/phrases-api": {
    getMyPhrasesFromApi: () => mockGetMyPhrasesFromApi(),
  },
  "@/lib/utils/review-session": {
    startReviewSession: () => undefined,
  },
  "@/lib/utils/scene-resource-actions": {
    warmupContinueLearningScene: () => undefined,
  },
  "@/lib/utils/scenes-api": {
    getScenesFromApi: () => mockGetScenesFromApi(),
  },
  "@/components/shared/action-loading": {
    LoadingState: ({ text }: { text: string }) => React.createElement("div", null, text),
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let TodayPageClientModule: React.ComponentType<{ displayName: string }> | null = null;

function getTodayPageClient() {
  if (!TodayPageClientModule) {
    const modulePath = localRequire.resolve("./today-page-client");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./today-page-client") as {
      TodayPageClient: React.ComponentType<{ displayName: string }>;
    };
    TodayPageClientModule = imported.TodayPageClient;
  }
  return TodayPageClientModule;
}

afterEach(() => {
  cleanup();
  routerPushCalls.length = 0;
  TodayPageClientModule = null;
  mockGetLearningDashboardCache = async () => defaultDashboardCacheResult;
  mockGetPhraseListCache = async () => defaultPhraseCacheResult;
  mockGetSceneListCache = async () => defaultSceneCacheResult;
  mockGetLearningDashboardFromApi = async () => createDashboardResponse();
  mockGetMyPhrasesFromApi = async () => ({
    rows: recentPhraseRows,
    total: recentPhraseRows.length,
    page: 1,
    limit: 3,
  });
  mockGetScenesFromApi = async () => [];
});

test("TodayPageClient compresses the expressions entry into a lightweight summary", async () => {
  const TodayPageClient = getTodayPageClient();

  render(<TodayPageClient displayName="xyqbspy" />);

  await waitFor(() => {
    screen.getByText("表达库");
    screen.getByText("12 条已保存");
  });

  assert.equal(routerPushCalls.length, 0);
});

test("TodayPageClient renders the starter recommendation as the primary card", async () => {
  mockGetLearningDashboardFromApi = async () => ({
    ...createDashboardResponse(),
    starterRecommendation: {
      type: "start_starter",
      title: "Today starts here",
      reason: "Best first step for a brand-new learner.",
      ctaLabel: "Start first scene",
      href: "/scene/daily-greeting",
      scene: {
        id: "scene-1",
        slug: "daily-greeting",
        title: "Daily Greeting",
        description: "Learn simple greetings.",
        level: "L0",
        category: "starter",
        estimatedMinutes: 5,
        learningGoal: "Master everyday greetings.",
        progressPercent: 0,
      },
      completedStarterCount: 0,
      totalStarterCount: 6,
    },
  });

  const TodayPageClient = getTodayPageClient();
  render(<TodayPageClient displayName="xyqbspy" />);

  await waitFor(() => {
    screen.getByText("Today starts here");
    screen.getByText("Daily Greeting");
    screen.getByText("Best first step for a brand-new learner.");
  });

  screen.getByRole("button", { name: "Start first scene" }).click();
  await waitFor(() => {
    assert.deepEqual(routerPushCalls, ["/scene/daily-greeting"]);
  });
});

test("TodayPageClient keeps continue learning as the primary card for existing learners", async () => {
  mockGetLearningDashboardFromApi = async () => ({
    ...createDashboardResponse(),
    continueLearning: {
      sceneSlug: "coffee-chat",
      title: "Coffee Chat",
      subtitle: "Cafe basics",
      progressPercent: 45,
      masteryStage: "focus",
      masteryPercent: 45,
      currentStep: "practice_sentence",
      lastViewedAt: "2026-05-14T10:00:00.000Z",
      lastSentenceIndex: 2,
      estimatedMinutes: 8,
      savedPhraseCount: 2,
      completedSentenceCount: 1,
    },
    starterRecommendation: {
      type: "continue",
      title: "Continue learning",
      reason: "You already made progress here.",
      ctaLabel: "Continue learning",
      href: "/scene/coffee-chat",
      scene: {
        id: "scene-2",
        slug: "coffee-chat",
        title: "Coffee Chat",
        description: "Cafe basics",
        level: "L0",
        category: "daily_life",
        estimatedMinutes: 8,
        learningGoal: "Practice cafe conversation.",
        progressPercent: 45,
      },
    },
  });

  const TodayPageClient = getTodayPageClient();
  render(<TodayPageClient displayName="xyqbspy" />);

  await waitFor(() => {
    assert.ok(screen.getAllByText("Continue learning").length >= 1);
    screen.getByText("Coffee Chat");
  });

  screen.getByRole("button", { name: "Continue learning" }).click();
  await waitFor(() => {
    assert.deepEqual(routerPushCalls, ["/scene/coffee-chat"]);
  });
});
