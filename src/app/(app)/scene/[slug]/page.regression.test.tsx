import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { resetSceneDetailToastDedupForTests } from "./scene-detail-notify";
import type { Lesson } from "@/lib/types";
import type { ExpressionMapResponse } from "@/lib/types/expression-map";
import type {
  PracticeSet,
  SceneGeneratedState,
  VariantSet,
} from "@/lib/types/learning-flow";
import type {
  SceneLearningProgressResponse,
  ScenePracticeSnapshotResponse,
} from "@/lib/utils/learning-api";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const baseLesson: Lesson = {
  id: "scene-1",
  slug: "test-scene",
  title: "Test Scene",
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sourceType: "builtin",
  sections: [
    {
      id: "section-1",
      title: "Section 1",
      summary: "summary",
      blocks: [],
    },
  ],
  explanations: [],
};

const practiceSet: PracticeSet = {
  id: "practice-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Test Scene",
  sourceType: "original",
  exercises: [
    {
      id: "exercise-1",
      type: "typing",
      inputMode: "typing",
      sceneId: "scene-1",
      sentenceId: "sentence-1",
      prompt: "prompt",
      answer: { text: "answer" },
    },
  ],
  status: "generated",
  createdAt: "2026-03-22T00:00:00.000Z",
};

const variantSet: VariantSet = {
  id: "variant-set-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Test Scene",
  reusedChunks: ["call it a day"],
  variants: [
    {
      id: "variant-item-1",
      lesson: {
        ...baseLesson,
        id: "variant-lesson-1",
        slug: "test-scene-variant-1",
        title: "Variant 1",
        sourceType: "variant",
      },
      status: "unviewed",
    },
  ],
  status: "generated",
  createdAt: "2026-03-22T00:00:00.000Z",
};

const buildLearningState = (overrides?: {
  progress?: Partial<SceneLearningProgressResponse["progress"]>;
  session?: Partial<NonNullable<SceneLearningProgressResponse["session"]>>;
}): SceneLearningProgressResponse => ({
  progress: {
    id: "progress-1",
    sceneId: "scene-1",
    status: "in_progress",
    progressPercent: 0,
    masteryStage: "listening",
    masteryPercent: 20,
    focusedExpressionCount: 0,
    practicedSentenceCount: 0,
    completedSentenceCount: 0,
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
    ...(overrides?.progress ?? {}),
  },
  session: {
    id: "session-1",
    sceneId: "scene-1",
    currentStep: "listen",
    selectedBlockId: null,
    fullPlayCount: 0,
    openedExpressionCount: 0,
    practicedSentenceCount: 0,
    completedSentenceCount: 0,
    scenePracticeCompleted: false,
    isDone: false,
    startedAt: "2026-03-22T00:00:00.000Z",
    endedAt: null,
    lastActiveAt: "2026-03-22T00:00:00.000Z",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
    ...(overrides?.session ?? {}),
  },
});

const buildPracticeSnapshot = (
  overrides?: Partial<ScenePracticeSnapshotResponse>,
): ScenePracticeSnapshotResponse => ({
  run: {
    id: "practice-run-1",
    sceneId: "scene-1",
    sessionId: "session-1",
    practiceSetId: "practice-1",
    sourceType: "original",
    sourceVariantId: null,
    status: "in_progress",
    currentMode: "cloze",
    completedModes: [],
    startedAt: "2026-03-22T00:00:00.000Z",
    completedAt: null,
    lastActiveAt: "2026-03-22T00:00:00.000Z",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
  latestAttempt: null,
  summary: {
    completedModeCount: 0,
    totalAttemptCount: 0,
    correctAttemptCount: 0,
    latestAssessmentLevel: null,
  },
  ...overrides,
});

let currentSearchParams = new URLSearchParams();
let currentGeneratedState: SceneGeneratedState = {
  latestPracticeSet: null,
  latestVariantSet: null,
  practiceStatus: "idle",
  variantStatus: "idle",
};
let expressionMapResult:
  | { expressionMap: ExpressionMapResponse; variantSetId: string; reused: boolean }
  | null = null;
let currentLearningState = buildLearningState();
let currentVariantRunSnapshot: {
  run: {
    id: string;
    sceneId: string;
    sessionId: string | null;
    variantSetId: string;
    activeVariantId: string | null;
    viewedVariantIds: string[];
    status: "in_progress" | "completed" | "abandoned";
    startedAt: string;
    completedAt: string | null;
    lastActiveAt: string;
    createdAt: string;
    updatedAt: string;
  } | null;
} = { run: null };
let currentPracticeSnapshot: import("@/lib/utils/learning-api").ScenePracticeSnapshotResponse | null = null;
let cachedPracticeSnapshot: ScenePracticeSnapshotResponse | null = null;
let practiceSnapshotGetCount = 0;
let currentServerPracticeSet: PracticeSet | null = null;
let practiceSetGetCount = 0;
const saveScenePracticeSetCalls: Array<{
  slug: string;
  practiceSet: PracticeSet;
  replaceExisting?: boolean;
}> = [];
let pendingPracticeGeneration:
  | {
      promise: Promise<PracticeSet>;
      resolve: (value: PracticeSet) => void;
    }
  | null = null;
let practiceGenerationFailureMessage: string | null = null;
let practiceRunStartCount = 0;
let pendingVariantGeneration:
  | {
      promise: Promise<VariantSet>;
      resolve: (value: VariantSet) => void;
    }
  | null = null;
let loadSceneDetailImpl:
  | ((args: {
      callbacks: {
        onStart: () => void;
        onHydrateLesson: (
          lesson: Lesson,
          source: "network" | "cache" | "none",
        ) => void;
        onStopLoading: () => void;
      };
    }) => Promise<void>)
  | null = null;

const routerPushCalls: string[] = [];
const deletePracticeSetCalls: Array<{ sceneId: string; practiceSetId: string }> = [];
const deleteVariantItemCalls: Array<{
  sceneId: string;
  variantSetId: string;
  variantId: string;
}> = [];
const toastMessageCalls: string[] = [];
const ensureExpressionMapCalls: Array<{
  baseLesson: Lesson | null;
  latestVariantSet: VariantSet | null;
}> = [];
const generatedPracticeCalls: Array<{ baseLesson: Lesson }> = [];
const generatedVariantCalls: Array<{ baseLesson: Lesson }> = [];
const trainingEventCalls: Array<{
  slug: string;
  payload: {
    event: string;
    selectedBlockId?: string;
  };
}> = [];

const originalConfirm = window.confirm;
const originalToastError = toast.error;
const originalToastSuccess = toast.success;
const mockToastMessage = ((message: string) => {
  toastMessageCalls.push(message);
  return 1;
}) as unknown as typeof toast.message;
toast.message = mockToastMessage;
const routerMock = {
  push: (href: string) => {
    routerPushCalls.push(href);
  },
};
const searchParamsMock = {
  get: (name: string) => currentSearchParams.get(name),
  toString: () => currentSearchParams.toString(),
};

const mockedModules = {
  "next/navigation": {
    useParams: () => ({ slug: "test-scene" }),
    useRouter: () => routerMock,
    useSearchParams: () => searchParamsMock,
  },
  "@/features/lesson/components/lesson-reader": {
    LessonReader: ({
      headerTools,
      onChunkEncounter,
      onSceneLoopPlayback,
    }: {
      headerTools?: React.ReactNode;
      onChunkEncounter?: (payload: {
        lesson: Lesson;
        sentence: { id: string; text: string };
        chunkText: string;
        blockId?: string;
        source?: "direct" | "related";
      }) => void;
      onSceneLoopPlayback?: (payload: { lesson: Lesson }) => void;
    }) => (
      <div>
        <div>lesson-reader</div>
        <button
          type="button"
          onClick={() =>
            onSceneLoopPlayback?.({
              lesson: baseLesson,
            })
          }
        >
          scene-full-play
        </button>
        <button
          type="button"
          onClick={() =>
            onChunkEncounter?.({
              lesson: baseLesson,
              sentence: { id: "sentence-1", text: "Sentence" },
              chunkText: "call it a day",
              blockId: "block-1",
              source: "direct",
            })
          }
        >
          encounter-chunk
        </button>
        <button
          type="button"
          onClick={() =>
            onChunkEncounter?.({
              lesson: baseLesson,
              sentence: { id: "sentence-1", text: "Sentence" },
              chunkText: "call it a day",
              blockId: "block-1",
              source: "related",
            })
          }
        >
          encounter-related-chunk
        </button>
        {headerTools}
      </div>
    ),
  },
  "@/features/lesson/components/selection-detail-sheet": {
    SelectionDetailSheet: () => null,
  },
  "@/features/scene/components/scene-practice-view": {
      ScenePracticeView: ({
        practiceSet,
        onBack,
        onDelete,
        onRegenerate,
        onSentenceCompleted,
        onPracticeAttempt,
        onPracticeRunStart,
      }: {
        practiceSet: PracticeSet | null;
        onBack: () => void;
        onDelete: () => void;
        onRegenerate?: () => void;
        onSentenceCompleted?: () => void;
        onPracticeAttempt?: (payload: {
          practiceSetId: string;
          mode: "cloze";
          sourceType: "original";
          exerciseId: string;
          sentenceId?: string | null;
          userAnswer: string;
          assessmentLevel: "complete";
          isCorrect: boolean;
        }) => void;
        onPracticeRunStart?: (payload: {
          practiceSetId: string;
          mode: "cloze";
          sourceType: "original";
        }) => void;
      }) => {
        React.useEffect(() => {
          if (!practiceSet || !onPracticeRunStart) return;
          onPracticeRunStart({
            practiceSetId: practiceSet.id,
            mode: "cloze",
            sourceType: "original",
          });
        }, [onPracticeRunStart, practiceSet]);

        return (
          <div>
            <div>practice-view</div>
            <button type="button" onClick={onBack}>
              back-practice
            </button>
            <button type="button" onClick={onDelete}>
              delete-practice
            </button>
            <button type="button" onClick={onRegenerate}>
              regenerate-practice
            </button>
            <button
              type="button"
              onClick={() =>
                onPracticeRunStart?.({
                  practiceSetId: "practice-1",
                  mode: "cloze",
                  sourceType: "original",
                })
              }
            >
              start-practice-run
            </button>
            <button
              type="button"
              onClick={() =>
                onPracticeAttempt?.({
                  practiceSetId: "practice-1",
                  mode: "cloze",
                  sourceType: "original",
                  exerciseId: "exercise-1",
                  sentenceId: "sentence-1",
                  userAnswer: "answer",
                  assessmentLevel: "complete",
                  isCorrect: true,
                })
              }
            >
              complete-practice-attempt
            </button>
            <button type="button" onClick={() => onSentenceCompleted?.()}>
              practice-sentence
            </button>
          </div>
        );
      },
  },
  "@/features/scene/components/scene-variants-view": {
    SceneVariantsView: ({
      onOpenExpressionMap,
      onOpenVariant,
      onDeleteVariant,
    }: {
      onOpenExpressionMap: () => void;
      onOpenVariant: (variantId: string) => void;
      onDeleteVariant: (variantId: string) => void;
    }) => (
      <div>
        <div>variants-view</div>
        <button type="button" onClick={onOpenExpressionMap}>
          open-map
        </button>
        <button type="button" onClick={() => onOpenVariant("variant-item-1")}>
          open-variant
        </button>
        <button type="button" onClick={() => onDeleteVariant("variant-item-1")}>
          delete-variant
        </button>
      </div>
    ),
  },
  "@/features/scene/components/scene-expression-map-view": {
    SceneExpressionMapView: () => <div>expression-map-view</div>,
  },
  "@/hooks/use-tts-playback-state": {
    useTtsPlaybackState: () => ({
      text: null,
      kind: null,
      chunkKey: null,
      sentenceId: null,
      mode: null,
    }),
  },
  "@/lib/cache/scene-cache": {
    clearExpiredSceneCaches: async () => undefined,
    getSceneCache: async () => ({ found: false, isExpired: false, record: null }),
    getSceneCacheSnapshotSync: () => ({ found: false, isExpired: false, record: null }),
    listRecentSceneCacheKeys: async () => [],
    normalizeSceneSlug: (slug: string) => slug,
    setSceneCache: async () => undefined,
  },
  "@/lib/cache/scene-runtime-cache": {
    getSceneLearningProgressCacheSnapshotSync: () => ({
      found: true,
      isExpired: false,
      record: {
        data: {
          state: currentLearningState,
        },
      },
    }),
    setSceneLearningProgressCache: async () => undefined,
    getScenePracticeSnapshotCache: async () =>
      cachedPracticeSnapshot
        ? {
            found: true,
            isExpired: false,
            record: {
              data: {
                snapshot: cachedPracticeSnapshot,
              },
            },
          }
        : { found: false, isExpired: false, record: null },
    setScenePracticeSnapshotCache: async () => undefined,
    getSceneVariantRunCache: async () => ({ found: false, isExpired: false, record: null }),
    setSceneVariantRunCache: async () => undefined,
    getSceneSavedPhraseTextsCache: async () => ({ found: false, isExpired: false, record: null }),
    setSceneSavedPhraseTextsCache: async () => undefined,
  },
  "@/lib/cache/scene-prefetch": {
    getPrefetchDebugState: () => ({}),
    scheduleScenePrefetch: () => undefined,
  },
  "@/lib/utils/scenes-api": {
    getScenesFromApi: async () => [],
    getSceneDetailBySlugFromApi: async () => baseLesson,
  },
  "@/lib/utils/learning-api": {
    completeSceneLearningFromApi: async () => currentLearningState,
    completeScenePracticeRunFromApi: async () => ({ run: null }),
    completeSceneVariantRunFromApi: async () => ({ run: null }),
    getScenePracticeSnapshotFromApi: async () => {
      practiceSnapshotGetCount += 1;
      return currentPracticeSnapshot;
    },
    getScenePracticeSetFromApi: async () => {
      practiceSetGetCount += 1;
      return { practiceSet: currentServerPracticeSet };
    },
    getSceneVariantRunSnapshotFromApi: async () => currentVariantRunSnapshot,
    markScenePracticeModeCompleteFromApi: async () => ({ run: null }),
    pauseSceneLearningFromApi: async () => currentLearningState,
    recordScenePracticeAttemptFromApi: async (
      _slug: string,
      payload: {
        sentenceId?: string | null;
      },
    ) => {
      currentLearningState = buildLearningState({
        progress: {
          masteryStage: "sentence_practice",
          masteryPercent: 60,
          practicedSentenceCount: 1,
          completedSentenceCount: 1,
        },
        session: {
          fullPlayCount: currentLearningState.session?.fullPlayCount ?? 1,
          openedExpressionCount: currentLearningState.session?.openedExpressionCount ?? 1,
          practicedSentenceCount: currentLearningState.session?.practicedSentenceCount ?? 1,
          completedSentenceCount: 1,
          currentStep: "scene_practice",
        },
      });
      return {
        run: {
          id: "practice-run-1",
          sceneId: "scene-1",
          sessionId: "session-1",
          practiceSetId: "practice-1",
          sourceType: "original" as const,
          sourceVariantId: null,
          status: "in_progress" as const,
          currentMode: "cloze" as const,
          completedModes: [],
          startedAt: "2026-03-22T00:00:00.000Z",
          completedAt: null,
          lastActiveAt: "2026-03-22T00:00:00.000Z",
          createdAt: "2026-03-22T00:00:00.000Z",
          updatedAt: "2026-03-22T00:00:00.000Z",
        },
        attempt: {
          id: "attempt-1",
          runId: "practice-run-1",
          sceneId: "scene-1",
          sessionId: "session-1",
          practiceSetId: "practice-1",
          mode: "cloze" as const,
          exerciseId: "exercise-1",
          sentenceId: payload.sentenceId ?? "sentence-1",
          userAnswer: "answer",
          assessmentLevel: "complete" as const,
          isCorrect: true,
          attemptIndex: 1,
          metadata: null,
          createdAt: "2026-03-22T00:00:00.000Z",
        },
        learningState: currentLearningState,
      };
    },
    startSceneLearningFromApi: async () => currentLearningState,
    saveScenePracticeSetFromApi: async (
      slug: string,
      payload: { practiceSet: PracticeSet; replaceExisting?: boolean },
    ) => {
      saveScenePracticeSetCalls.push({
        slug,
        practiceSet: payload.practiceSet,
        replaceExisting: payload.replaceExisting,
      });
      currentServerPracticeSet = payload.practiceSet;
      return { practiceSet: payload.practiceSet };
    },
    startScenePracticeRunFromApi: async () => {
      practiceRunStartCount += 1;
      currentLearningState = buildLearningState({
        progress: {
          masteryStage: "sentence_practice",
          masteryPercent: 60,
          practicedSentenceCount: 1,
        },
        session: {
          fullPlayCount: currentLearningState.session?.fullPlayCount ?? 0,
          openedExpressionCount: currentLearningState.session?.openedExpressionCount ?? 0,
          practicedSentenceCount: 1,
          currentStep: "practice_sentence",
        },
      });
      return {
        run: {
          id: "practice-run-1",
          sceneId: "scene-1",
          sessionId: "session-1",
          practiceSetId: "practice-1",
          sourceType: "original" as const,
          sourceVariantId: null,
          status: "in_progress" as const,
          currentMode: "cloze" as const,
          completedModes: [],
          startedAt: "2026-03-22T00:00:00.000Z",
          completedAt: null,
          lastActiveAt: "2026-03-22T00:00:00.000Z",
          createdAt: "2026-03-22T00:00:00.000Z",
          updatedAt: "2026-03-22T00:00:00.000Z",
        },
        learningState: currentLearningState,
      };
    },
    startSceneVariantRunFromApi: async () => ({ run: null }),
    updateSceneLearningProgressFromApi: async () => currentLearningState,
    recordSceneVariantViewFromApi: async () => ({ run: null }),
    recordSceneTrainingEventFromApi: async (
      slug: string,
      payload: {
        event: string;
        selectedBlockId?: string;
      },
    ) => {
      trainingEventCalls.push({ slug, payload });
      if (payload.event === "full_play") {
        currentLearningState = buildLearningState({
          progress: { masteryStage: "listening", masteryPercent: 20 },
          session: { fullPlayCount: 1, currentStep: "listen" },
        });
      }
      if (payload.event === "open_expression") {
        currentLearningState = buildLearningState({
          progress: {
            masteryStage: "focus",
            masteryPercent: 35,
            focusedExpressionCount: 1,
          },
          session: {
            fullPlayCount: currentLearningState.session?.fullPlayCount ?? 0,
            openedExpressionCount: 1,
            currentStep: "focus_expression",
            selectedBlockId: payload.selectedBlockId ?? null,
          },
        });
      }
      if (payload.event === "practice_sentence") {
        currentLearningState = buildLearningState({
          progress: {
            masteryStage: "sentence_practice",
            masteryPercent: 60,
            practicedSentenceCount: 1,
            completedSentenceCount: currentLearningState.progress?.completedSentenceCount ?? 0,
          },
          session: {
            fullPlayCount: currentLearningState.session?.fullPlayCount ?? 0,
            openedExpressionCount: currentLearningState.session?.openedExpressionCount ?? 0,
            practicedSentenceCount: 1,
            completedSentenceCount: currentLearningState.session?.completedSentenceCount ?? 0,
            currentStep: "practice_sentence",
          },
        });
      }
      return currentLearningState;
    },
  },
  "@/lib/utils/phrases-api": {
    getSavedNormalizedPhraseTextsFromApi: async () => [],
    savePhraseFromApi: async () => ({ created: true }),
  },
  "@/lib/utils/tts-api": {
    playChunkAudio: async () => undefined,
    playSentenceAudio: async () => undefined,
    setTtsLooping: () => undefined,
    stopTtsPlayback: () => undefined,
  },
  "./scene-detail-load-orchestrator": {
    loadSceneDetail: async ({
      callbacks,
    }: {
      callbacks: {
        onStart: () => void;
        onHydrateLesson: (
          lesson: Lesson,
          source: "network" | "cache" | "none",
        ) => void;
        onStopLoading: () => void;
      };
    }) => {
      if (loadSceneDetailImpl) {
        await loadSceneDetailImpl({ callbacks });
        return;
      }
      callbacks.onStart();
      callbacks.onHydrateLesson(baseLesson, "network");
      callbacks.onStopLoading();
    },
  },
  "./scene-detail-generation-logic": {
    ensureSceneExpressionMapData: async ({
      baseLesson,
      latestVariantSet,
    }: {
      baseLesson: Lesson | null;
      latestVariantSet: VariantSet | null;
    }) => {
      ensureExpressionMapCalls.push({ baseLesson, latestVariantSet });
      return expressionMapResult;
    },
    generateScenePracticeSet: async ({ baseLesson }: { baseLesson: Lesson }) => {
      generatedPracticeCalls.push({ baseLesson });
      if (practiceGenerationFailureMessage) {
        throw new Error(practiceGenerationFailureMessage);
      }
      if (pendingPracticeGeneration) {
        return pendingPracticeGeneration.promise;
      }
      return practiceSet;
    },
    generateSceneVariantSet: async ({ baseLesson }: { baseLesson: Lesson }) => {
      generatedVariantCalls.push({ baseLesson });
      if (pendingVariantGeneration) {
        return pendingVariantGeneration.promise;
      }
      return variantSet;
    },
    syncSceneVariantsFromDb: async () => null,
  },
  "@/lib/utils/scene-learning-flow-storage": {
    deleteAllVariantSets: () => undefined,
    deletePracticeSet: (sceneId: string, practiceSetId: string) => {
      deletePracticeSetCalls.push({ sceneId, practiceSetId });
    },
    deleteVariantItem: (sceneId: string, variantSetId: string, variantId: string) => {
      deleteVariantItemCalls.push({ sceneId, variantSetId, variantId });
    },
    getSceneGeneratedState: () => currentGeneratedState,
    hydrateVariantSetFromRun: (
      sceneId: string,
      variantSetId: string,
      run: {
        activeVariantId: string | null;
        viewedVariantIds: string[];
        status: "in_progress" | "completed" | "abandoned";
      },
    ) => {
      const latestVariantSet = currentGeneratedState.latestVariantSet;
      if (!latestVariantSet || latestVariantSet.sourceSceneId !== sceneId || latestVariantSet.id !== variantSetId) {
        return;
      }
      const viewedIds = new Set(run.viewedVariantIds);
      if (run.activeVariantId) {
        viewedIds.add(run.activeVariantId);
      }
      currentGeneratedState = {
        ...currentGeneratedState,
        latestVariantSet: {
          ...latestVariantSet,
          status: run.status === "completed" ? "completed" : latestVariantSet.status,
          variants: latestVariantSet.variants.map((variant) =>
            viewedIds.has(variant.id) && variant.status === "unviewed"
              ? {
                  ...variant,
                  status: "viewed" as const,
                }
              : variant,
          ),
        },
      };
    },
    markPracticeSetCompleted: () => undefined,
    markVariantItemStatus: () => undefined,
    markVariantSetCompleted: () => undefined,
    restartPracticeSet: (practiceSet: PracticeSet) => {
      const next = {
        ...practiceSet,
        id: `${practiceSet.id}-repeat`,
        status: "generated" as const,
        completedAt: undefined,
        sessionState: undefined,
      };
      currentGeneratedState = {
        ...currentGeneratedState,
        latestPracticeSet: next,
        practiceStatus: next.status,
      };
      return next;
    },
    restartVariantSet: (variantSet: VariantSet) => {
      const next = {
        ...variantSet,
        id: `${variantSet.id}-repeat`,
        status: "generated" as const,
        completedAt: undefined,
        variants: variantSet.variants.map((variant) => ({
          ...variant,
          status: "unviewed" as const,
        })),
      };
      currentGeneratedState = {
        ...currentGeneratedState,
        latestVariantSet: next,
        variantStatus: next.status,
      };
      return next;
    },
    savePracticeSet: (next: PracticeSet) => {
      currentGeneratedState = {
        ...currentGeneratedState,
        latestPracticeSet: next,
        practiceStatus: next.status,
      };
    },
    saveVariantSet: (next: VariantSet) => {
      currentGeneratedState = {
        ...currentGeneratedState,
        latestVariantSet: next,
        variantStatus: next.status,
      };
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

let SceneDetailPageModule: React.ComponentType<{ initialLesson?: Lesson | null }> | null = null;

const hasTextContent = (text: string) => (_content: string, element: Element | null) =>
  Boolean(element?.textContent?.includes(text));

function getSceneDetailPage() {
  if (!SceneDetailPageModule) {
    const pageModulePath = localRequire.resolve("./scene-detail-page");
    delete localRequire.cache[pageModulePath];
    const imported = localRequire("./scene-detail-page") as {
      default: React.ComponentType<{ initialLesson?: Lesson | null }>;
    };
    SceneDetailPageModule = imported.default;
  }
  return SceneDetailPageModule;
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.localStorage.clear();
  currentSearchParams = new URLSearchParams();
  currentGeneratedState = {
    latestPracticeSet: null,
    latestVariantSet: null,
    practiceStatus: "idle",
    variantStatus: "idle",
  };
  currentLearningState = buildLearningState();
  expressionMapResult = null;
  currentVariantRunSnapshot = { run: null };
  currentPracticeSnapshot = null;
  cachedPracticeSnapshot = null;
  practiceSnapshotGetCount = 0;
  currentServerPracticeSet = null;
  practiceSetGetCount = 0;
  saveScenePracticeSetCalls.length = 0;
  pendingPracticeGeneration = null;
  practiceGenerationFailureMessage = null;
  practiceRunStartCount = 0;
  pendingVariantGeneration = null;
  loadSceneDetailImpl = null;
  routerPushCalls.length = 0;
  deletePracticeSetCalls.length = 0;
  deleteVariantItemCalls.length = 0;
  ensureExpressionMapCalls.length = 0;
  generatedPracticeCalls.length = 0;
  generatedVariantCalls.length = 0;
  trainingEventCalls.length = 0;
  toastMessageCalls.length = 0;
  window.confirm = originalConfirm;
  toast.error = originalToastError;
  toast.success = originalToastSuccess;
  toast.message = mockToastMessage;
  resetSceneDetailToastDedupForTests();
  const pageModulePath = localRequire.resolve("./scene-detail-page");
  const pageModule = localRequire.cache[pageModulePath]?.exports as
    | { resetScenePracticeRunStartDedupForTests?: () => void }
    | undefined;
  pageModule?.resetScenePracticeRunStartDedupForTests?.();
});

function createDeferredGeneration<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

async function revealTrainingPanel() {
  const fab = await screen.findByTestId("scene-training-fab");
  fireEvent.pointerDown(fab, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerUp(fab, { pointerId: 1, clientX: 20, clientY: 20 });
  await screen.findByRole("button", { name: "收起训练面板" });
  return { fab };
}

test("SceneDetailPage 在 practice 路由下删除练习后会回到 scene 路由", async () => {
  currentSearchParams = new URLSearchParams("view=practice");
  currentGeneratedState = {
    latestPracticeSet: practiceSet,
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };
  window.confirm = () => true;

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage />);

  await screen.findByText("practice-view");
  fireEvent.click(screen.getByRole("button", { name: "delete-practice" }));

  assert.deepEqual(deletePracticeSetCalls, [
    { sceneId: "scene-1", practiceSetId: "practice-1" },
  ]);
  assert.equal(routerPushCalls.at(-1), "/scene/test-scene");
});

test("SceneDetailPage 删除练习后自动预热失败时会展示中文错误", async () => {
  currentGeneratedState = {
    latestPracticeSet: null,
    latestVariantSet: null,
    practiceStatus: "idle",
    variantStatus: "idle",
  };
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });
  practiceGenerationFailureMessage = "生成练习题失败，请稍后重试。";

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await waitFor(() => {
    assert.equal(generatedPracticeCalls.length, 1);
  });

  await waitFor(() => {
    screen.getByText("生成练习题失败，请稍后重试。");
  });
});

test("SceneDetailPage 主场景页默认只显示折叠入口，展开后才显示训练浮层", async () => {
  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  const nextStep = await screen.findByRole("region", { name: "当前下一步" });
  assert.ok(within(nextStep).getByText("当前下一步"));
  assert.ok(within(nextStep).getByRole("button", { name: "执行当前下一步" }));
  assert.match(nextStep.textContent ?? "", /开始听整段/);
  assert.match(nextStep.textContent ?? "", /下一步/);
  const fab = await screen.findByTestId("scene-training-fab");
  assert.ok(screen.getAllByText("本轮训练").length >= 1);
  screen.getAllByText("听熟这段");
  assert.equal(screen.queryByRole("button", { name: "收起训练面板" }), null);
  assert.equal(screen.queryByRole("button", { name: "关闭训练面板遮罩" }), null);
  assert.equal(fab.getAttribute("aria-expanded"), "false");

  await revealTrainingPanel();

  assert.ok(screen.getAllByText("本轮训练").length >= 2);
  screen.getByRole("button", { name: "收起训练面板" });
  screen.getByRole("button", { name: "关闭训练面板遮罩" });
  screen.getAllByText("听熟这段");
  assert.equal(screen.queryByRole("button", { name: "去练变体" }), null);
  assert.equal(fab.getAttribute("aria-expanded"), "true");
});

test("SceneDetailPage 点击训练浮层遮罩后会关闭面板", async () => {
  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  const { fab } = await revealTrainingPanel();
  await new Promise((resolve) => setTimeout(resolve, 260));
  fireEvent.click(screen.getByRole("button", { name: "关闭训练面板遮罩" }));

  await waitFor(() => {
    assert.equal(screen.queryByRole("button", { name: "收起训练面板" }), null);
  });
  assert.equal(fab.getAttribute("aria-expanded"), "false");
});

test("SceneDetailPage 在首屏数据未就绪时会先展示场景骨架", async () => {
  let releaseLoad: () => void = () => {
    throw new Error("releaseLoad was not initialized");
  };
  loadSceneDetailImpl = async ({ callbacks }) => {
    callbacks.onStart();
    await new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    callbacks.onHydrateLesson(baseLesson, "network");
    callbacks.onStopLoading();
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage />);

  await waitFor(() => {
    assert.notEqual(screen.queryByLabelText("场景加载骨架"), null);
  });
  assert.equal(screen.queryByText("lesson-reader"), null);

  releaseLoad();

  await waitFor(() => {
    screen.getByText("lesson-reader");
  });
});

test("SceneDetailPage 点击折叠态步骤文字打开面板时，不会被同轮遮罩点击立即关闭", async () => {
  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  const fab = await screen.findByTestId("scene-training-fab");
  fireEvent.pointerDown(fab, { pointerId: 3, clientX: 20, clientY: 20 });
  fireEvent.pointerUp(fab, { pointerId: 3, clientX: 20, clientY: 20 });

  const overlay = await screen.findByRole("button", { name: "关闭训练面板遮罩" });
  fireEvent.click(overlay);

  assert.notEqual(screen.queryByRole("button", { name: "收起训练面板" }), null);
  assert.equal(fab.getAttribute("aria-expanded"), "true");
});

test("SceneDetailPage 记录整段播放和打开表达后，会更新入口步骤文字", async () => {
  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  const fab = await screen.findByTestId("scene-training-fab");
  fireEvent.click(screen.getByRole("button", { name: "scene-full-play" }));
  fireEvent.click(screen.getByRole("button", { name: "encounter-chunk" }));

  await waitFor(() => {
    assert.deepEqual(trainingEventCalls, [
      { slug: "test-scene", payload: { event: "full_play" } },
      {
        slug: "test-scene",
        payload: { event: "open_expression", selectedBlockId: "block-1" },
      },
    ]);
  });
  await waitFor(() => {
    assert.ok(screen.getAllByText("开始练习").length >= 1);
  });

  fireEvent.pointerDown(fab, { pointerId: 2, clientX: 20, clientY: 20 });
  fireEvent.pointerUp(fab, { pointerId: 2, clientX: 20, clientY: 20 });
  await screen.findByRole("button", { name: "收起训练面板" });
});

test("SceneDetailPage 重复打开相关短语时，不会重复弹首次抓表达提示", async () => {
  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByTestId("scene-training-fab");
  fireEvent.click(screen.getByRole("button", { name: "encounter-chunk" }));
  fireEvent.click(screen.getByRole("button", { name: "encounter-chunk" }));

  await waitFor(() => {
    assert.equal(
      toastMessageCalls.filter((message) => message.includes("先抓一个重点表达")).length,
      1,
    );
  });
});

test("SceneDetailPage 在详情弹框里切换相关短语时，不会触发首次抓表达提示", async () => {
  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByTestId("scene-training-fab");
  fireEvent.click(screen.getByRole("button", { name: "encounter-related-chunk" }));

  await waitFor(() => {
    assert.equal(
      toastMessageCalls.filter((message) => message.includes("先抓一个重点表达")).length,
      0,
    );
  });
});

test("SceneDetailPage 本轮完成后才显示变体入口", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "variant_unlocked",
      masteryPercent: 85,
      variantUnlockedAt: "2026-03-22T00:00:00.000Z",
      completedAt: "2026-03-22T00:00:00.000Z",
      status: "completed",
    },
    session: {
      currentStep: "done",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
      scenePracticeCompleted: true,
      isDone: true,
      endedAt: "2026-03-22T00:00:00.000Z",
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByTestId("scene-training-fab");
  assert.equal(screen.queryByRole("button", { name: "开始变体训练" }), null);
  await revealTrainingPanel();
  screen.getAllByText("解锁变体");
  assert.ok(screen.getAllByText(hasTextContent("下一步：本轮训练已完成")).length >= 1);
});

test("SceneDetailPage 到开始练习步骤后，会在训练浮层里给出直接练习入口", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  fireEvent.click(screen.getByRole("button", { name: /生成并完成整段练习|继续整段练习|练习/ }));

  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=practice");
  });
});

test("SceneDetailPage 在 practice run 与句子完成后，会用 practice API 回写服务端语义而不是复用旧 training event", async () => {
  currentSearchParams = new URLSearchParams("view=practice");
  currentGeneratedState = {
    latestPracticeSet: practiceSet,
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "focus",
      masteryPercent: 35,
      focusedExpressionCount: 1,
    },
    session: {
      currentStep: "focus_expression",
      fullPlayCount: 1,
      openedExpressionCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByText("practice-view");
  fireEvent.click(screen.getByRole("button", { name: "start-practice-run" }));
  fireEvent.click(screen.getByRole("button", { name: "complete-practice-attempt" }));
  fireEvent.click(screen.getByRole("button", { name: "practice-sentence" }));

  await waitFor(() => {
    assert.equal(currentLearningState.session?.currentStep, "scene_practice");
    assert.equal(currentLearningState.session?.practicedSentenceCount, 1);
    assert.equal(currentLearningState.session?.completedSentenceCount, 1);
  });
  assert.equal(trainingEventCalls.some((call) => call.payload.event === "practice_sentence"), false);
});

test("SceneDetailPage 当前步骤已推进到开始练习时，浮层CTA会跟随到练习页而不是停留在已并入练习的旧步骤", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "sentence_practice",
      masteryPercent: 60,
      practicedSentenceCount: 1,
    },
    session: {
      currentStep: "practice_sentence",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  assert.equal(screen.queryByRole("button", { name: "去练核心句" }), null);
  fireEvent.click(screen.getByRole("button", { name: /生成并进入句子练习|进入句子练习|练习/ }));

  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=practice");
  });
});

test("SceneDetailPage 到已并入练习的旧状态后，会后台预热场景练习而不打断当前页面", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "sentence_practice",
      masteryPercent: 60,
    },
    session: {
      currentStep: "practice_sentence",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await waitFor(() => {
    assert.equal(generatedPracticeCalls.length, 1);
  });
  assert.equal(screen.queryByText("practice-view"), null);
});

test("SceneDetailPage 在已有练习时支持手动重新生成题目", async () => {
  currentSearchParams = new URLSearchParams("view=practice");
  currentGeneratedState = {
    latestPracticeSet: practiceSet,
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByText("practice-view");
  fireEvent.click(screen.getByRole("button", { name: "regenerate-practice" }));

  await waitFor(() => {
    assert.equal(generatedPracticeCalls.length, 1);
  });
  assert.equal(
    saveScenePracticeSetCalls.some((call) => call.replaceExisting === true),
    true,
  );
});

test("SceneDetailPage 在题目页重渲染时不会持续重复启动 practice run", async () => {
  currentSearchParams = new URLSearchParams("view=practice");
  currentGeneratedState = {
    latestPracticeSet: practiceSet,
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByText("practice-view");
  await waitFor(() => {
    assert.equal(practiceRunStartCount, 1);
  });

  fireEvent.click(screen.getByRole("button", { name: "start-practice-run" }));
  fireEvent.click(screen.getByRole("button", { name: "start-practice-run" }));

  await waitFor(() => {
    assert.equal(practiceRunStartCount, 1);
  });
});

test("SceneDetailPage 从练习页返回时保留当前练习步骤，不回退到听熟这段", async () => {
  currentSearchParams = new URLSearchParams("view=practice");
  currentGeneratedState = {
    latestPracticeSet: practiceSet,
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
      practicedSentenceCount: 1,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  const { rerender } = render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByText("practice-view");
  fireEvent.click(screen.getByRole("button", { name: "back-practice" }));
  assert.equal(routerPushCalls.at(-1), "/scene/test-scene");

  currentSearchParams = new URLSearchParams();
  rerender(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  assert.ok(screen.getByRole("button", { name: /进入句子练习|继续整段练习/ }));
  assert.equal(screen.queryByRole("button", { name: "再听" }), null);
});

test("SceneDetailPage 从练习页返回主场景时仍会后台请求服务端 practice set", async () => {
  currentSearchParams = new URLSearchParams("view=practice");
  currentGeneratedState = {
    latestPracticeSet: {
      ...practiceSet,
      id: "practice-local",
    },
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };
  currentServerPracticeSet = {
    ...practiceSet,
    id: "practice-server",
  };
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
      practicedSentenceCount: 1,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  const { rerender } = render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByText("practice-view");
  await waitFor(() => {
    assert.equal(practiceSetGetCount, 1);
    assert.equal(currentGeneratedState.latestPracticeSet?.id, "practice-server");
  });

  currentServerPracticeSet = {
    ...practiceSet,
    id: "practice-server-after-back",
  };
  fireEvent.click(screen.getByRole("button", { name: "back-practice" }));
  assert.equal(routerPushCalls.at(-1), "/scene/test-scene");

  currentSearchParams = new URLSearchParams();
  rerender(<SceneDetailPage initialLesson={baseLesson} />);

  await waitFor(() => {
    assert.equal(practiceSetGetCount, 2);
    assert.equal(currentGeneratedState.latestPracticeSet?.id, "practice-server-after-back");
  });

  await revealTrainingPanel();
  assert.ok(screen.getByRole("button", { name: /进入句子练习|继续整段练习/ }));
  assert.equal(screen.queryByRole("button", { name: "再听" }), null);
});

test("SceneDetailPage 命中练习快照缓存后仍会后台请求最新快照", async () => {
  currentSearchParams = new URLSearchParams("view=practice");
  currentGeneratedState = {
    latestPracticeSet: practiceSet,
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };
  cachedPracticeSnapshot = buildPracticeSnapshot({
    summary: {
      completedModeCount: 0,
      totalAttemptCount: 1,
      correctAttemptCount: 1,
      latestAssessmentLevel: "complete",
    },
  });
  currentPracticeSnapshot = buildPracticeSnapshot({
    summary: {
      completedModeCount: 0,
      totalAttemptCount: 2,
      correctAttemptCount: 2,
      latestAssessmentLevel: "complete",
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByText("practice-view");
  await waitFor(() => {
    assert.equal(practiceSnapshotGetCount, 1);
  });
});

test("SceneDetailPage 本地无练习缓存但服务端有 set 时会恢复题目且不重新生成", async () => {
  currentServerPracticeSet = {
    ...practiceSet,
    id: "practice-server",
  };
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await waitFor(() => {
    assert.equal(practiceSetGetCount, 1);
    assert.equal(currentGeneratedState.latestPracticeSet?.id, "practice-server");
  });
  assert.equal(generatedPracticeCalls.length, 0);
});

test("SceneDetailPage 本地已有练习缓存时仍请求服务端并用服务端 set 覆盖", async () => {
  currentGeneratedState = {
    latestPracticeSet: {
      ...practiceSet,
      id: "practice-local",
    },
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };
  currentServerPracticeSet = {
    ...practiceSet,
    id: "practice-server",
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  assert.equal(currentGeneratedState.latestPracticeSet?.id, "practice-local");
  await waitFor(() => {
    assert.equal(practiceSetGetCount, 1);
    assert.equal(currentGeneratedState.latestPracticeSet?.id, "practice-server");
  });
});

test("SceneDetailPage 已有服务端 set 时进入练习页不会重复生成题目", async () => {
  currentSearchParams = new URLSearchParams("view=practice");
  currentServerPracticeSet = {
    ...practiceSet,
    id: "practice-server",
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByText("practice-view");
  await waitFor(() => {
    assert.equal(practiceSetGetCount, 1);
    assert.equal(practiceRunStartCount, 1);
  });
  assert.equal(currentGeneratedState.latestPracticeSet?.id, "practice-server");
  assert.equal(generatedPracticeCalls.length, 0);
});

test("SceneDetailPage 生成场景练习时会锁定主 CTA，并保持加载文案稳定", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });
  pendingPracticeGeneration = createDeferredGeneration<PracticeSet>();

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  fireEvent.click(screen.getByRole("button", { name: "生成并完成整段练习" }));

  await waitFor(() => {
    const loadingButton = screen.getByRole("button", { name: "练习准备中..." });
    assert.equal(loadingButton.hasAttribute("disabled"), true);
  });
  assert.equal(screen.queryByRole("button", { name: "练习准备中...中..." }), null);

  pendingPracticeGeneration.resolve(practiceSet);
  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=practice");
  });
});

test("SceneDetailPage 非开始练习步骤不会显示额外跳转按钮", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "focus",
      masteryPercent: 35,
      focusedExpressionCount: 1,
    },
    session: {
      currentStep: "focus_expression",
      fullPlayCount: 1,
      openedExpressionCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  assert.equal(screen.queryByRole("button", { name: "再听" }), null);
  assert.equal(screen.queryByRole("button", { name: "去看" }), null);
  assert.equal(screen.queryByRole("button", { name: "去练" }), null);
  assert.equal(screen.queryByRole("button", { name: "进入" }), null);
  assert.equal(screen.queryByRole("button", { name: "再练" }), null);
  assert.equal(screen.queryByRole("button", { name: "复习" }), null);
});

test("SceneDetailPage 到开始练习步骤后，会后台预热变体而不打断当前页面", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await waitFor(() => {
    assert.equal(generatedVariantCalls.length, 1);
  });
  assert.equal(screen.queryByText("variants-view"), null);
});

test("SceneDetailPage 打开变体训练时会锁定主 CTA，并保持加载文案稳定", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "variant_unlocked",
      masteryPercent: 85,
      variantUnlockedAt: "2026-03-22T00:00:00.000Z",
      completedAt: "2026-03-22T00:00:00.000Z",
      status: "completed",
    },
    session: {
      currentStep: "done",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
      scenePracticeCompleted: true,
      isDone: true,
      endedAt: "2026-03-22T00:00:00.000Z",
    },
  });
  pendingVariantGeneration = createDeferredGeneration<VariantSet>();

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  fireEvent.click(screen.getByRole("button", { name: "打开变体训练" }));

  await waitFor(() => {
    const loadingButton = screen.getByRole("button", { name: "变体准备中..." });
    assert.equal(loadingButton.hasAttribute("disabled"), true);
  });
  assert.equal(screen.queryByRole("button", { name: "变体准备中...中..." }), null);

  pendingVariantGeneration.resolve(variantSet);
  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=variants");
  });
});

test("SceneDetailPage 在已完成练习后，主CTA会推进到变体，但步骤列表仍保留复习入口", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });
  currentGeneratedState = {
    latestPracticeSet: {
      ...practiceSet,
      status: "completed",
      completedAt: "2026-03-22T00:00:00.000Z",
    },
    latestVariantSet: null,
    practiceStatus: "completed",
    variantStatus: "idle",
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  assert.ok(screen.getByRole("button", { name: "打开变体训练" }));
  fireEvent.click(screen.getByRole("button", { name: "复习" }));

  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=practice");
  });
  assert.equal(currentGeneratedState.latestPracticeSet?.id, "practice-1-repeat");
  assert.equal(currentGeneratedState.practiceStatus, "generated");
});

test("SceneDetailPage 练习阶段不会回退显示英文模式名", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "scene_practice",
      masteryPercent: 80,
    },
    session: {
      currentStep: "scene_practice",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
    },
  });
  currentGeneratedState = {
    latestPracticeSet: {
      ...practiceSet,
      mode: "guided_recall",
      modeLabel: "guided recall",
    },
    latestVariantSet: null,
    practiceStatus: "generated",
    variantStatus: "idle",
  };
  currentPracticeSnapshot = {
    run: {
      id: "practice-run-1",
      sceneId: "scene-1",
      practiceSetId: "practice-1",
      sessionId: "session-1",
      status: "in_progress",
      currentMode: "guided_recall",
      completedModes: [],
      sourceType: "original",
      sourceVariantId: null,
      startedAt: "2026-03-22T00:00:00.000Z",
      completedAt: null,
      lastActiveAt: "2026-03-22T00:00:00.000Z",
      createdAt: "2026-03-22T00:00:00.000Z",
      updatedAt: "2026-03-22T00:00:00.000Z",
    },
    latestAttempt: null,
    summary: {
      completedModeCount: 0,
      totalAttemptCount: 2,
      correctAttemptCount: 1,
      latestAssessmentLevel: "keyword",
    },
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  screen.getAllByText("开始练习");
  assert.equal(screen.queryByText(/guided recall/i), null);
});

test("SceneDetailPage 在已完成变体后，会给出再练入口并开启新一轮", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "variant_unlocked",
      masteryPercent: 85,
      variantUnlockedAt: "2026-03-22T00:00:00.000Z",
      completedAt: "2026-03-22T00:00:00.000Z",
      status: "completed",
    },
    session: {
      currentStep: "done",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
      scenePracticeCompleted: true,
      isDone: true,
      endedAt: "2026-03-22T00:00:00.000Z",
    },
  });
  currentGeneratedState = {
    latestPracticeSet: null,
    latestVariantSet: {
      ...variantSet,
      status: "completed",
      completedAt: "2026-03-22T00:00:00.000Z",
      variants: [
        {
          ...variantSet.variants[0],
          status: "completed",
        },
      ],
    },
    practiceStatus: "idle",
    variantStatus: "completed",
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await revealTrainingPanel();
  fireEvent.click(screen.getByRole("button", { name: "再练变体训练" }));

  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=variants");
  });
  await waitFor(() => {
    assert.equal(currentGeneratedState.latestVariantSet?.id, "variant-set-1-repeat");
    assert.equal(currentGeneratedState.latestVariantSet?.variants[0]?.status, "unviewed");
    assert.equal(currentGeneratedState.variantStatus, "generated");
  });
});

test("SceneDetailPage 在 variants 视图打开表达地图时会生成数据并跳到 expression-map 路由", async () => {
  currentSearchParams = new URLSearchParams("view=variants");
  currentGeneratedState = {
    latestPracticeSet: null,
    latestVariantSet: variantSet,
    practiceStatus: "idle",
    variantStatus: "generated",
  };
  expressionMapResult = {
    expressionMap: {
      version: "v1",
      sourceSceneId: "scene-1",
      clusters: [],
    },
    variantSetId: "variant-set-1",
    reused: false,
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage />);

  await screen.findByText("variants-view");
  fireEvent.click(screen.getByRole("button", { name: "open-map" }));

  await waitFor(() => {
    assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=expression-map");
  });
  assert.equal(ensureExpressionMapCalls.length, 1);
  assert.equal(ensureExpressionMapCalls[0]?.baseLesson?.id, "scene-1");
  assert.equal(ensureExpressionMapCalls[0]?.latestVariantSet?.id, "variant-set-1");
});

test("SceneDetailPage 删除当前激活变体后会回退到 variants 视图", async () => {
  currentSearchParams = new URLSearchParams("view=variants");
  currentGeneratedState = {
    latestPracticeSet: null,
    latestVariantSet: variantSet,
    practiceStatus: "idle",
    variantStatus: "generated",
  };
  window.confirm = () => true;

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage />);

  await screen.findByText("variants-view");
  fireEvent.click(screen.getByRole("button", { name: "open-variant" }));
  assert.ok(screen.getByRole("button", { name: "基于此变体生成练习" }));
  const auxiliaryActions = screen.getByLabelText("变体辅助操作");
  assert.ok(within(auxiliaryActions).getByRole("button", { name: /delete-variant|删除变体/ }));
  fireEvent.click(screen.getByRole("button", { name: /delete-variant|删除变体/ }));

  assert.deepEqual(deleteVariantItemCalls, [
    {
      sceneId: "scene-1",
      variantSetId: "variant-set-1",
      variantId: "variant-item-1",
    },
  ]);
  assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=variants");
});

test("SceneDetailPage 会在有服务端变体快照时恢复当前变体并续上该变体", async () => {
  currentLearningState = buildLearningState({
    progress: {
      masteryStage: "variant_unlocked",
      masteryPercent: 85,
      variantUnlockedAt: "2026-03-22T00:00:00.000Z",
      completedAt: "2026-03-22T00:00:00.000Z",
      status: "completed",
    },
    session: {
      currentStep: "done",
      fullPlayCount: 1,
      openedExpressionCount: 1,
      practicedSentenceCount: 1,
      scenePracticeCompleted: true,
      isDone: true,
      endedAt: "2026-03-22T00:00:00.000Z",
    },
  });
  currentGeneratedState = {
    latestPracticeSet: null,
    latestVariantSet: variantSet,
    practiceStatus: "idle",
    variantStatus: "generated",
  };
  currentVariantRunSnapshot = {
    run: {
      id: "variant-run-1",
      sceneId: "scene-1",
      sessionId: "session-1",
      variantSetId: "variant-set-1",
      activeVariantId: "variant-item-1",
      viewedVariantIds: ["variant-item-1"],
      status: "in_progress",
      startedAt: "2026-03-22T00:00:00.000Z",
      completedAt: null,
      lastActiveAt: "2026-03-22T00:00:00.000Z",
      createdAt: "2026-03-22T00:00:00.000Z",
      updatedAt: "2026-03-22T00:00:00.000Z",
    },
  };

  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await waitFor(() => {
    assert.equal(currentGeneratedState.latestVariantSet?.variants[0]?.status, "viewed");
  });

  await revealTrainingPanel();
  fireEvent.click(screen.getByRole("button", { name: "查看变体" }));

  await waitFor(() => {
    assert.equal(
      routerPushCalls.at(-1),
      "/scene/test-scene?view=variant-study&variant=variant-item-1",
    );
  });
});




