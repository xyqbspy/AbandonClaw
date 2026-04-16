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
const toastSuccessCalls: Array<{ message?: string; description?: string }> = [];
const clientEventCalls: Array<{ name: string; payload: Record<string, unknown> }> = [];
const setReviewPageCacheCalls: Array<{
  payload: {
    rows: Array<{ userPhraseId: string }>;
    total: number;
    summary: {
      dueReviewCount: number;
        reviewedTodayCount: number;
        reviewAccuracy: number | null;
        masteredPhraseCount: number;
        confidentOutputCountToday: number;
        fullOutputCountToday: number;
      };
  };
  limit: number | undefined;
}> = [];
const submitPhraseReviewPayloads: Array<Record<string, unknown>> = [];
let startScenePracticeRunCalls = 0;
let recordScenePracticeAttemptCalls = 0;
let markScenePracticeModeCompleteCalls = 0;
let completeScenePracticeRunCalls = 0;
let startScenePracticeRunError: Error | null = null;
let currentDueRows: Array<{
  userPhraseId: string;
  phraseId: string;
  text: string;
  translation: string | null;
  usageNote: string | null;
  sourceSceneSlug: string | null;
  sourceSceneAvailable: boolean;
  sourceSentenceText: string | null;
  expressionClusterId: string | null;
  reviewStatus: "saved" | "reviewing" | "mastered" | "archived";
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewAt: string | null;
  recognitionState: "recognized" | "unknown" | null;
  outputConfidence: "high" | "low" | null;
  fullOutputStatus: "completed" | "not_started" | null;
  schedulingFocus: "low_output_confidence" | "missing_full_output" | "recognition_only" | null;
}> = [
  {
    userPhraseId: "p1",
    phraseId: "phrase-1",
    text: "call it a day",
    translation: "收工",
    usageNote: null,
    sourceSceneSlug: null,
    sourceSceneAvailable: false,
    sourceSentenceText: null,
    expressionClusterId: null,
    reviewStatus: "saved",
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    nextReviewAt: null,
    recognitionState: null,
    outputConfidence: null,
    fullOutputStatus: null,
    schedulingFocus: null,
  },
];
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
let currentSummary = {
  dueReviewCount: 1,
  reviewedTodayCount: 0,
  reviewAccuracy: null as number | null,
  masteredPhraseCount: 0,
  confidentOutputCountToday: 0,
  fullOutputCountToday: 0,
};

const mockedModules = {
  sonner: {
    toast: {
      error: () => undefined,
      success: (message?: string, options?: { description?: string }) => {
        toastSuccessCalls.push({ message, description: options?.description });
      },
    },
  },
  "@/lib/utils/client-events": {
    recordClientEvent: (name: string, payload: Record<string, unknown>) => {
      clientEventCalls.push({ name, payload });
    },
  },
  "@/lib/cache/review-page-cache": {
    clearAllReviewPageCache: async () => {
      clearReviewPageCacheCalls += 1;
    },
    getReviewPageCache: async () => ({ found: false, record: null, isExpired: false }),
    setReviewPageCache: async (
      payload: {
        rows: Array<{ userPhraseId: string }>;
        total: number;
        summary: {
          dueReviewCount: number;
          reviewedTodayCount: number;
          reviewAccuracy: number | null;
          masteredPhraseCount: number;
          confidentOutputCountToday: number;
          fullOutputCountToday: number;
        };
      },
      limit?: number,
    ) => {
      setReviewPageCacheCalls.push({ payload, limit });
    },
  },
  "@/lib/utils/review-api": {
    getDueReviewItemsFromApi: async () => {
      dueRequestCount += 1;
      return {
        rows: currentDueRows,
        total: currentDueRows.length,
        scenePracticeRows: currentScenePracticeRows,
      };
    },
    getReviewSummaryFromApi: async () => {
      summaryRequestCount += 1;
      return currentSummary;
    },
    submitPhraseReviewFromApi: async (payload: Record<string, unknown>) => {
      submitPhraseReviewPayloads.push(payload);
      return {
      item: null,
      summary: {
        dueReviewCount: 0,
        reviewedTodayCount: 1,
        reviewAccuracy: 100,
        masteredPhraseCount: 0,
        confidentOutputCountToday: 1,
        fullOutputCountToday: 1,
      },
    };
    },
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
  toastSuccessCalls.length = 0;
  clientEventCalls.length = 0;
  setReviewPageCacheCalls.length = 0;
  submitPhraseReviewPayloads.length = 0;
  startScenePracticeRunCalls = 0;
  recordScenePracticeAttemptCalls = 0;
  markScenePracticeModeCompleteCalls = 0;
  completeScenePracticeRunCalls = 0;
  startScenePracticeRunError = null;
  currentDueRows = [
    {
      userPhraseId: "p1",
      phraseId: "phrase-1",
      text: "call it a day",
      translation: "收工",
      usageNote: null,
      sourceSceneSlug: null,
      sourceSceneAvailable: false,
      sourceSentenceText: null,
      expressionClusterId: null,
      reviewStatus: "saved",
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      nextReviewAt: null,
      recognitionState: null,
      outputConfidence: null,
      fullOutputStatus: null,
      schedulingFocus: null,
    },
  ];
  currentScenePracticeRows = [];
  currentSummary = {
    dueReviewCount: 1,
    reviewedTodayCount: 0,
    reviewAccuracy: null,
    masteredPhraseCount: 0,
    confidentOutputCountToday: 0,
    fullOutputCountToday: 0,
  };
  ReviewPageModule = null;
});

test("ReviewPage 普通表达有可访问来源场景时展示跳转入口", async () => {
  currentDueRows = [
    {
      userPhraseId: "p-scene",
      phraseId: "phrase-scene",
      text: "call it a day",
      translation: "收工",
      usageNote: null,
      sourceSceneSlug: "coffee-chat",
      sourceSceneAvailable: true,
      sourceSentenceText: "Let's call it a day.",
      expressionClusterId: null,
      reviewStatus: "saved",
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      nextReviewAt: null,
      recognitionState: null,
      outputConfidence: null,
      fullOutputStatus: null,
      schedulingFocus: null,
    },
  ];

  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await screen.findByRole("button", { name: "查看原场景" });
  assert.equal(screen.queryByText("来源场景已不可用"), null);
});

test("ReviewPage 普通表达来源场景失效时只展示降级提示", async () => {
  currentDueRows = [
    {
      userPhraseId: "p-missing-scene",
      phraseId: "phrase-missing-scene",
      text: "call it a day",
      translation: "收工",
      usageNote: null,
      sourceSceneSlug: "missing-scene",
      sourceSceneAvailable: false,
      sourceSentenceText: "Let's call it a day.",
      expressionClusterId: null,
      reviewStatus: "saved",
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      nextReviewAt: null,
      recognitionState: null,
      outputConfidence: null,
      fullOutputStatus: null,
      schedulingFocus: null,
    },
  ];

  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await screen.findByText("来源场景已不可用");
  assert.ok(screen.getByText("这条表达仍可继续复习，但原始场景当前已无法访问。"));
  assert.equal(screen.queryByRole("button", { name: "查看原场景" }), null);
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

test("ReviewPage 普通表达复习会按微回忆 -> 熟悉度 -> 改写 -> 输出 -> feedback 推进并写回缓存", async () => {
  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await screen.findByRole("button", { name: "进入熟悉度判断" });

  fireEvent.click(screen.getByRole("button", { name: "进入熟悉度判断" }));
  await screen.findByRole("button", { name: "眼熟，能认出来" });
  assert.ok(screen.getByText("STEP 2. 熟悉度判断"));

  fireEvent.click(screen.getByRole("button", { name: "眼熟，能认出来" }));
  fireEvent.click(screen.getByRole("button", { name: "能主动说出来" }));
  fireEvent.click(screen.getByRole("button", { name: "继续做变体改写" }));

  await screen.findByPlaceholderText("根据改写提示，先写一个局部变体。这里先保留为本地草稿，后续再补正式评估。");
  fireEvent.change(screen.getByPlaceholderText("根据改写提示，先写一个局部变体。这里先保留为本地草稿，后续再补正式评估。"), {
    target: { value: "Don't push yourself too hard today." },
  });
  fireEvent.click(screen.getByRole("button", { name: "继续进入完整输出" }));

  await screen.findByPlaceholderText("不用填空，直接写出一整句或两整句。这里先保留为本地草稿，后续再补 chunks 命中率和自然度分析。");
  fireEvent.change(
    screen.getByPlaceholderText("不用填空，直接写出一整句或两整句。这里先保留为本地草稿，后续再补 chunks 命中率和自然度分析。"),
    {
      target: { value: "We should call it a day now. Let's pick it up again tomorrow." },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "进入复习判断" }));

  await screen.findByRole("button", { name: "能用出来" });
  fireEvent.click(screen.getByRole("button", { name: "能用出来" }));

  await waitFor(() => {
    assert.equal(setReviewPageCacheCalls.length, 2);
    const latest = setReviewPageCacheCalls.at(-1);
    assert.deepEqual(latest?.payload.rows, []);
    assert.equal(latest?.payload.summary.reviewedTodayCount, 1);
    assert.equal(latest?.payload.summary.reviewAccuracy, 100);
    assert.equal(latest?.payload.summary.confidentOutputCountToday, 1);
    assert.equal(latest?.payload.summary.fullOutputCountToday, 1);
    assert.equal(latest?.limit, 20);
    assert.equal(submitPhraseReviewPayloads.length, 1);
    assert.equal(submitPhraseReviewPayloads[0]?.recognitionState, "recognized");
    assert.equal(submitPhraseReviewPayloads[0]?.outputConfidence, "high");
    assert.equal(submitPhraseReviewPayloads[0]?.fullOutputStatus, "completed");
    assert.equal(toastSuccessCalls.at(-1)?.message, "已记录这次复习结果。 今天这轮回忆先收住了。");
    assert.equal(toastSuccessCalls.at(-1)?.description, "已完成 1 条，可以回到 today 继续推进场景。");
    assert.equal(clientEventCalls.at(-1)?.name, "review_submitted");
    assert.equal(clientEventCalls.at(-1)?.payload.reviewResult, "good");
  });
});

test("ReviewPage 会展示正式信号带来的调度提示", async () => {
  currentDueRows = [
    {
      userPhraseId: "p-priority",
      phraseId: "phrase-priority",
      text: "call it a day",
      translation: "收工",
      usageNote: null,
      sourceSceneSlug: null,
      sourceSceneAvailable: false,
      sourceSentenceText: null,
      expressionClusterId: null,
      reviewStatus: "reviewing",
      reviewCount: 2,
      correctCount: 1,
      incorrectCount: 1,
      nextReviewAt: "2026-03-31T08:00:00.000Z",
      recognitionState: "recognized",
      outputConfidence: "low",
      fullOutputStatus: "not_started",
      schedulingFocus: "low_output_confidence",
    },
  ];

  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await screen.findByText("调度提示");
  assert.ok(screen.getByText("这条会优先出现，因为你上次还缺少主动输出信心。"));
});

test("ReviewPage 场景回补会进入阶段式复现并在完成后刷新列表", async () => {
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

  await screen.findByRole("button", { name: "我准备好了，进入复现" });
  fireEvent.click(screen.getByRole("button", { name: "我准备好了，进入复现" }));

  await screen.findByRole("button", { name: "检查这次复现" });
  fireEvent.change(screen.getByPlaceholderText("直接在这里补全这条表达或句子"), {
    target: { value: "call it a day" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查这次复现" }));

  await screen.findByRole("button", { name: "进入下一项复习" });
  assert.ok(screen.getByText("STEP 3. 反馈与下一步"));

  fireEvent.click(screen.getByRole("button", { name: "进入下一项复习" }));

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

test("ReviewPage 场景回补提交失败时不会误刷新列表", async () => {
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

  await screen.findByRole("button", { name: "我准备好了，进入复现" });
  fireEvent.click(screen.getByRole("button", { name: "我准备好了，进入复现" }));
  await screen.findByRole("button", { name: "检查这次复现" });
  fireEvent.change(screen.getByPlaceholderText("直接在这里补全这条表达或句子"), {
    target: { value: "call it a day" },
  });
  clearReviewPageCacheCalls = 0;
  dueRequestCount = 1;
  summaryRequestCount = 1;

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

test("ReviewPage 队列清空后会展示收束反馈并提供返回 today 入口", async () => {
  currentDueRows = [];
  currentScenePracticeRows = [];
  currentSummary = {
    dueReviewCount: 0,
    reviewedTodayCount: 2,
    reviewAccuracy: 100,
    masteredPhraseCount: 0,
    confidentOutputCountToday: 1,
    fullOutputCountToday: 1,
  };

  const ReviewPage = getReviewPage();
  render(<ReviewPage />);

  await screen.findByText("这轮回忆先收住了");
  screen.getByText(/今天已完成\s*2\s*条回忆/);
  screen.getByRole("button", { name: "返回 today" });
});
