import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

let dueRequestCount = 0;
let summaryRequestCount = 0;
let clearReviewPageCacheCalls = 0;
const setReviewPageCacheCalls: Array<{
  payload: {
    rows: Array<{ userPhraseId: string }>;
    total: number;
    summary: {
      dueReviewCount: number;
      reviewedTodayCount: number;
      reviewAccuracy: number | null;
      masteredPhraseCount: number;
    };
  };
  limit: number | undefined;
}> = [];
let startScenePracticeRunCalls = 0;
let recordScenePracticeAttemptCalls = 0;
let markScenePracticeModeCompleteCalls = 0;
let completeScenePracticeRunCalls = 0;
let startScenePracticeRunError: Error | null = null;
let currentScenePracticeRows: Array<{
  sceneSlug: string;
  sceneTitle: string;
  exerciseId: string;
  sentenceId: string | null;
  sourceMode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
  recommendedMode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
  assessmentLevel: "incorrect" | "keyword" | "structure" | "complete";
  expectedAnswer: string | null;
  promptText: string | null;
  displayText: string | null;
  hint: string | null;
  latestAnswer: string;
  reviewedAt: string;
}> = [];

const mockedModules = {
  sonner: {
    toast: {
      error: () => undefined,
      success: () => undefined,
    },
  },
  "@/lib/cache/review-page-cache": {
    clearAllReviewPageCache: async () => {
      clearReviewPageCacheCalls += 1;
    },
    getReviewPageCache: async () => ({ found: false, record: null, isExpired: false }),
    setReviewPageCache: async (payload, limit) => {
      setReviewPageCacheCalls.push({ payload, limit });
    },
  },
  "@/lib/utils/review-api": {
    getDueReviewItemsFromApi: async () => {
      dueRequestCount += 1;
      return {
        rows: [
          {
            userPhraseId: "p1",
            phraseId: "phrase-1",
            text: "call it a day",
            translation: "结束工作",
            usageNote: null,
            sourceSceneSlug: null,
            sourceSentenceText: null,
            expressionClusterId: null,
            reviewStatus: "saved",
            reviewCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            nextReviewAt: null,
          },
        ],
        total: 1,
        scenePracticeRows: currentScenePracticeRows,
      };
    },
    getReviewSummaryFromApi: async () => {
      summaryRequestCount += 1;
      return {
        dueReviewCount: 1,
        reviewedTodayCount: 0,
        reviewAccuracy: null,
        masteredPhraseCount: 0,
      };
    },
    submitPhraseReviewFromApi: async () => ({
      item: null,
      summary: {
        dueReviewCount: 0,
        reviewedTodayCount: 1,
        reviewAccuracy: 100,
        masteredPhraseCount: 0,
      },
    }),
  },
  "@/lib/utils/phrases-api": {
    getMyPhrasesFromApi: async () => ({ rows: [], total: 0, page: 1, limit: 100 }),
  },
  "@/lib/utils/review-session": {
    readReviewSession: () => null,
  },
  "@/lib/utils/learning-api": {
    completeScenePracticeRunFromApi: async () => {
      completeScenePracticeRunCalls += 1;
    },
    markScenePracticeModeCompleteFromApi: async () => {
      markScenePracticeModeCompleteCalls += 1;
    },
    recordScenePracticeAttemptFromApi: async () => {
      recordScenePracticeAttemptCalls += 1;
    },
    startScenePracticeRunFromApi: async () => {
      startScenePracticeRunCalls += 1;
      if (startScenePracticeRunError) throw startScenePracticeRunError;
      currentScenePracticeRows = [];
    },
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let ReviewPageModule: React.ComponentType | null = null;

function getReviewPage() {
  if (!ReviewPageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: React.ComponentType;
    };
    ReviewPageModule = imported.default;
  }
  return ReviewPageModule;
}

afterEach(() => {
  cleanup();
  dueRequestCount = 0;
  summaryRequestCount = 0;
  clearReviewPageCacheCalls = 0;
  setReviewPageCacheCalls.length = 0;
  startScenePracticeRunCalls = 0;
  recordScenePracticeAttemptCalls = 0;
  markScenePracticeModeCompleteCalls = 0;
  completeScenePracticeRunCalls = 0;
  startScenePracticeRunError = null;
  currentScenePracticeRows = [];
  ReviewPageModule = null;
});

test("ReviewPage 会处理尾斜杠路径的下拉刷新并强制重新拉取数据", async () => {
  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await waitFor(() => {
    assert.equal(dueRequestCount, 1);
    assert.equal(summaryRequestCount, 1);
  });

  const refreshDetail = {
    pathname: "/review/",
    handled: false,
  };
  window.dispatchEvent(new CustomEvent("app:pull-refresh", { detail: refreshDetail }));

  await waitFor(() => {
    assert.equal(refreshDetail.handled, true);
    assert.equal(clearReviewPageCacheCalls, 1);
    assert.equal(dueRequestCount, 2);
    assert.equal(summaryRequestCount, 2);
  });
});

test("ReviewPage 场景内联练习提交成功后会清缓存并重新拉取数据", async () => {
  currentScenePracticeRows = [
    {
      sceneSlug: "coffee-chat",
      sceneTitle: "Coffee Chat",
      exerciseId: "exercise-1",
      sentenceId: "sentence-1",
      sourceMode: "cloze",
      recommendedMode: "cloze",
      assessmentLevel: "complete",
      expectedAnswer: "call it a day",
      promptText: "补全句子",
      displayText: "Let's ____.",
      hint: "结束今天的工作",
      latestAnswer: "",
      reviewedAt: "2026-03-30T00:00:00.000Z",
    },
  ];

  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await screen.findByText("场景练习待复习");

  fireEvent.change(screen.getByPlaceholderText("直接在这里复现这句或补全表达"), {
    target: { value: "call it a day" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查这次复现" }));

  await waitFor(() => {
    assert.equal(startScenePracticeRunCalls, 1);
    assert.equal(recordScenePracticeAttemptCalls, 1);
    assert.equal(markScenePracticeModeCompleteCalls, 1);
    assert.equal(completeScenePracticeRunCalls, 1);
    assert.equal(clearReviewPageCacheCalls, 1);
    assert.equal(dueRequestCount, 2);
    assert.equal(summaryRequestCount, 2);
  });
});

test("ReviewPage 普通复习提交后会把最新列表和 summary 回写到缓存", async () => {
  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await waitFor(() => {
    assert.equal(dueRequestCount, 1);
    assert.equal(summaryRequestCount, 1);
  });

  setReviewPageCacheCalls.length = 0;

  fireEvent.click(screen.getByRole("button", { name: "会用了" }));

  await waitFor(() => {
    assert.equal(setReviewPageCacheCalls.length, 1);
    assert.deepEqual(setReviewPageCacheCalls[0]?.payload.rows, []);
    assert.equal(setReviewPageCacheCalls[0]?.payload.total, 0);
    assert.equal(setReviewPageCacheCalls[0]?.payload.summary.reviewedTodayCount, 1);
    assert.equal(setReviewPageCacheCalls[0]?.payload.summary.reviewAccuracy, 100);
    assert.equal(setReviewPageCacheCalls[0]?.limit, 20);
  });
});

test("ReviewPage 场景内联练习提交失败时不会误清缓存或重新拉取数据", async () => {
  startScenePracticeRunError = new Error("start failed");
  currentScenePracticeRows = [
    {
      sceneSlug: "coffee-chat",
      sceneTitle: "Coffee Chat",
      exerciseId: "exercise-1",
      sentenceId: "sentence-1",
      sourceMode: "cloze",
      recommendedMode: "cloze",
      assessmentLevel: "complete",
      expectedAnswer: "call it a day",
      promptText: "补全句子",
      displayText: "Let's ____.",
      hint: "结束今天的工作",
      latestAnswer: "",
      reviewedAt: "2026-03-30T00:00:00.000Z",
    },
  ];

  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await screen.findByText("场景练习待复习");
  clearReviewPageCacheCalls = 0;
  dueRequestCount = 1;
  summaryRequestCount = 1;

  fireEvent.change(screen.getByPlaceholderText("直接在这里复现这句或补全表达"), {
    target: { value: "call it a day" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查这次复现" }));

  await waitFor(() => {
    assert.equal(startScenePracticeRunCalls, 1);
    assert.equal(recordScenePracticeAttemptCalls, 0);
    assert.equal(markScenePracticeModeCompleteCalls, 0);
    assert.equal(completeScenePracticeRunCalls, 0);
    assert.equal(clearReviewPageCacheCalls, 0);
    assert.equal(dueRequestCount, 1);
    assert.equal(summaryRequestCount, 1);
  });
});
