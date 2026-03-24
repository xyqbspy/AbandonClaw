import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import type { Lesson } from "@/lib/types";
import type { ExpressionMapResponse } from "@/lib/types/expression-map";
import type {
  PracticeSet,
  SceneGeneratedState,
  VariantSet,
} from "@/lib/types/learning-flow";
import type { SceneLearningProgressResponse } from "@/lib/utils/learning-api";

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

const routerPushCalls: string[] = [];
const deletePracticeSetCalls: Array<{ sceneId: string; practiceSetId: string }> = [];
const deleteVariantItemCalls: Array<{
  sceneId: string;
  variantSetId: string;
  variantId: string;
}> = [];
const ensureExpressionMapCalls: Array<{
  baseLesson: Lesson | null;
  latestVariantSet: VariantSet | null;
}> = [];
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
const originalToastMessage = toast.message;
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
            })
          }
        >
          encounter-chunk
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
      onDelete,
      onSentencePracticed,
    }: {
      onDelete: () => void;
      onSentencePracticed?: () => void;
    }) => (
      <div>
        <div>practice-view</div>
        <button type="button" onClick={onDelete}>
          delete-practice
        </button>
        <button type="button" onClick={() => onSentencePracticed?.()}>
          practice-sentence
        </button>
      </div>
    ),
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
    listRecentSceneCacheKeys: async () => [],
    normalizeSceneSlug: (slug: string) => slug,
    setSceneCache: async () => undefined,
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
    pauseSceneLearningFromApi: async () => currentLearningState,
    startSceneLearningFromApi: async () => currentLearningState,
    updateSceneLearningProgressFromApi: async () => currentLearningState,
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
          },
          session: {
            fullPlayCount: currentLearningState.session?.fullPlayCount ?? 0,
            openedExpressionCount: currentLearningState.session?.openedExpressionCount ?? 0,
            practicedSentenceCount: 1,
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
    generateScenePracticeSet: async () => practiceSet,
    generateSceneVariantSet: async () => variantSet,
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
    markPracticeSetCompleted: () => undefined,
    markVariantItemStatus: () => undefined,
    markVariantSetCompleted: () => undefined,
    savePracticeSet: () => undefined,
    saveVariantSet: () => undefined,
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
  routerPushCalls.length = 0;
  deletePracticeSetCalls.length = 0;
  deleteVariantItemCalls.length = 0;
  ensureExpressionMapCalls.length = 0;
  trainingEventCalls.length = 0;
  window.confirm = originalConfirm;
  toast.error = originalToastError;
  toast.success = originalToastSuccess;
  toast.message = originalToastMessage;
});

async function revealTrainingPanel() {
  const fab = await screen.findByTestId("scene-training-fab");
  fireEvent.pointerDown(fab, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerUp(fab, { pointerId: 1, clientX: 20, clientY: 20 });
  await screen.findByText("本轮训练");
  return { fab };
}

test("SceneDetailPage 鍦?practice 璺敱涓嬪垹闄ょ粌涔犲悗浼氬洖鍒?scene 璺敱", async () => {
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

test("SceneDetailPage 涓诲満鏅〉榛樿鍙樉绀哄浘鏍囧叆鍙ｏ紝灞曞紑鍚庢墠鏄剧ず璁粌娴眰", async () => {
  const SceneDetailPage = getSceneDetailPage();
  render(<SceneDetailPage initialLesson={baseLesson} />);

  await screen.findByTestId("scene-training-fab");
  assert.equal(screen.queryByText("鏈疆璁粌"), null);

  await revealTrainingPanel();

  screen.getByText("本轮训练");
  screen.getByRole("button", { name: "先听这段" });
  assert.equal(screen.queryByRole("button", { name: "先学习一个短语" }), null);
  assert.equal(screen.queryByRole("button", { name: "完成场景" }), null);
  assert.equal(screen.queryByRole("button", { name: "开始变体训练" }), null);
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

  fireEvent.pointerDown(fab, { pointerId: 2, clientX: 20, clientY: 20 });
  fireEvent.pointerUp(fab, { pointerId: 2, clientX: 20, clientY: 20 });
  await screen.findByText("本轮训练");
});

test("SceneDetailPage 鏈疆瀹屾垚鍚庢墠鏄剧ず鍙樹綋鍏ュ彛", async () => {
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
  screen.getByRole("button", { name: "去练变体" });
});

test("SceneDetailPage 鍦?variants 瑙嗗浘鎵撳紑琛ㄨ揪鍦板浘鏃朵細鐢熸垚鏁版嵁骞惰烦鍒?expression-map 璺敱", async () => {
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

test("SceneDetailPage 鍒犻櫎褰撳墠婵€娲诲彉浣撳悗浼氬洖閫€鍒?variants 瑙嗗浘", async () => {
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
  fireEvent.click(screen.getByRole("button", { name: "delete-variant" }));

  assert.deepEqual(deleteVariantItemCalls, [
    {
      sceneId: "scene-1",
      variantSetId: "variant-set-1",
      variantId: "variant-item-1",
    },
  ]);
  assert.equal(routerPushCalls.at(-1), "/scene/test-scene?view=variants");
});


