import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import type { Lesson } from "@/lib/types";
import type { PracticeMode, PracticeSet } from "@/lib/types/learning-flow";
import type {
  SceneLearningProgressResponse,
  ScenePracticeSnapshotResponse,
} from "@/lib/utils/learning-api";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const baseLesson: Lesson = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sections: [],
  explanations: [],
};

const practiceSet: PracticeSet = {
  id: "practice-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Scene 1",
  sourceType: "original",
  exercises: [],
  status: "generated",
  createdAt: "2026-03-22T00:00:00.000Z",
};

const buildLearningState = (practicedSentenceCount: number): SceneLearningProgressResponse => ({
  progress: {
    id: "progress-1",
    sceneId: "scene-1",
    status: "in_progress",
    progressPercent: 20,
    masteryStage: "listening",
    masteryPercent: 20,
    focusedExpressionCount: 0,
    practicedSentenceCount,
    completedSentenceCount: practicedSentenceCount,
    scenePracticeCount: 0,
    variantUnlockedAt: null,
    lastSentenceIndex: null,
    lastVariantIndex: null,
    startedAt: "2026-03-22T00:00:00.000Z",
    lastViewedAt: "2026-03-22T00:00:00.000Z",
    completedAt: null,
    lastPracticedAt: "2026-03-22T00:00:00.000Z",
    totalStudySeconds: 0,
    todayStudySeconds: 0,
    savedPhraseCount: 0,
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
  session: {
    id: "session-1",
    sceneId: "scene-1",
    currentStep: "practice_sentence",
    selectedBlockId: null,
    fullPlayCount: 0,
    openedExpressionCount: 0,
    practicedSentenceCount,
    completedSentenceCount: practicedSentenceCount,
    scenePracticeCompleted: false,
    isDone: false,
    startedAt: "2026-03-22T00:00:00.000Z",
    endedAt: null,
    lastActiveAt: "2026-03-22T00:00:00.000Z",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
});

const buildPracticeRun = (completedModes: PracticeMode[]) => ({
  id: "practice-run-1",
  sceneId: "scene-1",
  sessionId: "session-1",
  practiceSetId: practiceSet.id,
  sourceType: "original" as const,
  sourceVariantId: null,
  status: "in_progress" as const,
  currentMode: completedModes.at(-1) ?? "cloze",
  completedModes,
  startedAt: "2026-03-22T00:00:00.000Z",
  completedAt: null,
  lastActiveAt: "2026-03-22T00:00:00.000Z",
  createdAt: "2026-03-22T00:00:00.000Z",
  updatedAt: "2026-03-22T00:00:00.000Z",
});

const buildPracticeSnapshot = (): ScenePracticeSnapshotResponse => ({
  run: null,
  latestAttempt: null,
  summary: {
    completedModeCount: 0,
    totalAttemptCount: 0,
    correctAttemptCount: 0,
    latestAssessmentLevel: null,
  },
});

const milestoneCalls: Array<{ step: string; title: string }> = [];
const snapshotCacheCalls: Array<{ slug: string; practiceSetId: string }> = [];
const savePracticeSetCalls: string[] = [];
const startPracticeRunCalls: string[] = [];
const attemptCalls: string[] = [];
const modeCompleteCalls: string[] = [];
const completePracticeCalls: string[] = [];
const learningStateCalls: SceneLearningProgressResponse[] = [];
const markPracticeCompleteCalls: string[] = [];

const mockedModules = {
  "@/lib/cache/scene-runtime-cache": {
    setScenePracticeSnapshotCache: async (slug: string, practiceSetId: string) => {
      snapshotCacheCalls.push({ slug, practiceSetId });
    },
  },
  "@/lib/utils/learning-api": {
    saveScenePracticeSetFromApi: async (slug: string, payload: { practiceSet: PracticeSet }) => {
      savePracticeSetCalls.push(slug);
      return { practiceSet: payload.practiceSet };
    },
    startScenePracticeRunFromApi: async (
      slug: string,
      payload: { practiceSetId: string; mode: PracticeMode },
    ) => {
      startPracticeRunCalls.push(slug);
      return {
        run: buildPracticeRun([payload.mode]),
        learningState: buildLearningState(1),
      };
    },
    recordScenePracticeAttemptFromApi: async (
      slug: string,
      payload: { practiceSetId: string; exerciseId: string; isCorrect: boolean },
    ) => {
      attemptCalls.push(slug);
      return {
        run: buildPracticeRun(["cloze"]),
        attempt: {
          id: "attempt-1",
          runId: "practice-run-1",
          sceneId: "scene-1",
          sessionId: "session-1",
          practiceSetId: payload.practiceSetId,
          mode: "cloze" as const,
          exerciseId: payload.exerciseId,
          sentenceId: null,
          userAnswer: "answer",
          assessmentLevel: "complete" as const,
          isCorrect: payload.isCorrect,
          attemptIndex: 1,
          metadata: null,
          createdAt: "2026-03-22T00:00:00.000Z",
        },
        learningState: buildLearningState(2),
      };
    },
    markScenePracticeModeCompleteFromApi: async (slug: string) => {
      modeCompleteCalls.push(slug);
      return {
        run: buildPracticeRun(["cloze", "guided_recall"]),
      };
    },
    completeScenePracticeRunFromApi: async (slug: string) => {
      completePracticeCalls.push(slug);
      return {
        run: buildPracticeRun(["cloze", "guided_recall"]),
      };
    },
  },
  "./scene-detail-notify": {
    notifySceneMilestone: (step: string, title: string) => {
      milestoneCalls.push({ step, title });
    },
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let useScenePracticeRunLifecycleModule:
  | typeof import("./use-scene-practice-run-lifecycle").useScenePracticeRunLifecycle
  | null = null;

function getUseScenePracticeRunLifecycle() {
  if (!useScenePracticeRunLifecycleModule) {
    const modulePath = localRequire.resolve("./use-scene-practice-run-lifecycle");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./use-scene-practice-run-lifecycle") as typeof import("./use-scene-practice-run-lifecycle");
    useScenePracticeRunLifecycleModule = imported.useScenePracticeRunLifecycle;
  }
  return useScenePracticeRunLifecycleModule;
}

afterEach(() => {
  cleanup();
  milestoneCalls.length = 0;
  snapshotCacheCalls.length = 0;
  savePracticeSetCalls.length = 0;
  startPracticeRunCalls.length = 0;
  attemptCalls.length = 0;
  modeCompleteCalls.length = 0;
  completePracticeCalls.length = 0;
  learningStateCalls.length = 0;
  markPracticeCompleteCalls.length = 0;
  useScenePracticeRunLifecycleModule = null;
});

test("useScenePracticeRunLifecycle 会去重并写回练习快照", async () => {
  const useScenePracticeRunLifecycle = getUseScenePracticeRunLifecycle();
  let snapshot: ScenePracticeSnapshotResponse | null = buildPracticeSnapshot();

  const setPracticeSnapshot = (
    update: React.SetStateAction<ScenePracticeSnapshotResponse | null>,
  ) => {
    snapshot =
      typeof update === "function"
        ? (update as (current: ScenePracticeSnapshotResponse | null) => ScenePracticeSnapshotResponse | null)(snapshot)
        : update;
  };

  const { result } = renderHook(() =>
    useScenePracticeRunLifecycle({
      baseLesson,
      latestPracticeSet: practiceSet,
      practicedSentenceCount: 0,
      scenePracticeCompleted: false,
      setPracticeSnapshot,
      handleLearningStateChange: (nextState) => {
        learningStateCalls.push(nextState);
      },
      handleMarkPracticeComplete: () => {
        markPracticeCompleteCalls.push("mark");
      },
    }),
  );

  const payload = {
    practiceSetId: practiceSet.id,
    mode: "cloze" as const,
    sourceType: "original" as const,
  };

  act(() => {
    result.current.handlePracticeRunStart(payload);
    result.current.handlePracticeRunStart(payload);
  });

  await waitFor(() => assert.equal(startPracticeRunCalls.length, 1));

  assert.equal(savePracticeSetCalls.length, 1);
  assert.equal(snapshot?.run?.practiceSetId, practiceSet.id);
  // start 路径只写 run，不动 summary（用 ?? 保留 current.summary）。
  // 初始 summary.completedModeCount = 0，start 后仍应为 0。
  // mode complete 路径才会把 completedModeCount 更新为 completedModes.length。
  assert.equal(snapshot?.summary.completedModeCount, 0);
  assert.equal(snapshotCacheCalls.length, 1);
  assert.deepEqual(milestoneCalls, [{ step: "practice_sentence", title: "Scene 1" }]);
  assert.equal(learningStateCalls.length, 1);
  assert.equal(completePracticeCalls.length, 0);
});

test("useScenePracticeRunLifecycle 会累积 attempt 并保留 mode complete summary", async () => {
  const useScenePracticeRunLifecycle = getUseScenePracticeRunLifecycle();
  let snapshot: ScenePracticeSnapshotResponse | null = buildPracticeSnapshot();

  const setPracticeSnapshot = (
    update: React.SetStateAction<ScenePracticeSnapshotResponse | null>,
  ) => {
    snapshot =
      typeof update === "function"
        ? (update as (current: ScenePracticeSnapshotResponse | null) => ScenePracticeSnapshotResponse | null)(snapshot)
        : update;
  };

  const { result } = renderHook(() =>
    useScenePracticeRunLifecycle({
      baseLesson,
      latestPracticeSet: practiceSet,
      practicedSentenceCount: 2,
      scenePracticeCompleted: false,
      setPracticeSnapshot,
      handleLearningStateChange: (nextState) => {
        learningStateCalls.push(nextState);
      },
      handleMarkPracticeComplete: () => {
        markPracticeCompleteCalls.push("mark");
      },
    }),
  );

  act(() => {
    result.current.handlePracticeAttempt({
      practiceSetId: practiceSet.id,
      mode: "cloze",
      sourceType: "original",
      exerciseId: "exercise-1",
      userAnswer: "answer",
      assessmentLevel: "complete",
      isCorrect: true,
    });
  });

  await waitFor(() => assert.equal(attemptCalls.length, 1));
  assert.equal(snapshot?.summary.totalAttemptCount, 1);
  assert.equal(snapshot?.summary.correctAttemptCount, 1);
  assert.equal(snapshot?.latestAttempt?.id, "attempt-1");
  assert.equal(learningStateCalls.length, 1);

  act(() => {
    result.current.handlePracticeModeComplete({
      practiceSetId: practiceSet.id,
      mode: "cloze",
      nextMode: "guided_recall",
    });
  });

  await waitFor(() => assert.equal(modeCompleteCalls.length, 1));
  assert.equal(snapshot?.summary.completedModeCount, 2);
  assert.equal(snapshot?.summary.totalAttemptCount, 1);
  assert.equal(snapshot?.latestAttempt?.id, "attempt-1");
});

test("useScenePracticeRunLifecycle 在没有练习集时会直接完成并通知里程碑", () => {
  const useScenePracticeRunLifecycle = getUseScenePracticeRunLifecycle();

  const { result } = renderHook(() =>
    useScenePracticeRunLifecycle({
      baseLesson,
      latestPracticeSet: null,
      practicedSentenceCount: 0,
      scenePracticeCompleted: false,
      setPracticeSnapshot: () => undefined,
      handleLearningStateChange: () => undefined,
      handleMarkPracticeComplete: () => {
        markPracticeCompleteCalls.push("mark");
      },
    }),
  );

  act(() => {
    result.current.handlePracticeComplete();
  });

  assert.equal(completePracticeCalls.length, 0);
  assert.deepEqual(markPracticeCompleteCalls, ["mark"]);
  assert.deepEqual(milestoneCalls, [{ step: "scene_practice", title: "Scene 1" }]);
});

