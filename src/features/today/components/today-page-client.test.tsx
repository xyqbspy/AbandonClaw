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
    translation: "把自己熬垮",
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
    getLearningDashboardCache: async () => ({ found: false, isExpired: false, record: null }),
    setLearningDashboardCache: async () => undefined,
  },
  "@/lib/cache/phrase-list-cache": {
    getPhraseListCache: async () => ({
      found: true,
      isExpired: false,
      record: {
        data: {
          rows: recentPhraseRows,
        },
      },
    }),
    setPhraseListCache: async () => undefined,
  },
  "@/lib/cache/scene-list-cache": {
    getSceneListCache: async () => ({
      found: true,
      isExpired: false,
      record: {
        data: [],
      },
    }),
    setSceneListCache: async () => undefined,
  },
  "@/lib/utils/learning-api": {
    getLearningDashboardFromApi: async () => ({
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
        },
        reviewTask: { done: false, reviewItemsCompleted: 0, dueReviewCount: 2 },
        outputTask: { done: false, phrasesSavedToday: 1 },
      },
    }),
  },
  "@/lib/utils/phrases-api": {
    getMyPhrasesFromApi: async () => ({
      rows: recentPhraseRows,
      total: recentPhraseRows.length,
      page: 1,
      limit: 3,
    }),
  },
  "@/lib/utils/review-session": {
    startReviewSession: () => undefined,
  },
  "@/lib/utils/scene-resource-actions": {
    warmupContinueLearningScene: () => undefined,
  },
  "@/lib/utils/scenes-api": {
    getScenesFromApi: async () => [],
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
});

test("TodayPageClient 会优先展示最近表达预览", async () => {
  const TodayPageClient = getTodayPageClient();

  render(<TodayPageClient displayName="xyqbspy" />);

  await waitFor(() => {
    screen.getByText("burn yourself out", { exact: false });
    screen.getByText("把自己熬垮");
  });

  assert.equal(routerPushCalls.length, 0);
});
