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
    LessonReader: ({ headerTools }: { headerTools?: React.ReactNode }) => (
      <div>
        <div>lesson-reader</div>
        {headerTools}
      </div>
    ),
  },
  "@/features/lesson/components/selection-detail-sheet": {
    SelectionDetailSheet: () => null,
  },
  "@/features/scene/components/scene-practice-view": {
    ScenePracticeView: ({ onDelete }: { onDelete: () => void }) => (
      <div>
        <div>practice-view</div>
        <button type="button" onClick={onDelete}>
          delete-practice
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
    completeSceneLearningFromApi: async () => undefined,
    pauseSceneLearningFromApi: async () => undefined,
    startSceneLearningFromApi: async () => undefined,
    updateSceneLearningProgressFromApi: async () => undefined,
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

let SceneDetailPageModule: React.ComponentType | null = null;

function getSceneDetailPage() {
  if (!SceneDetailPageModule) {
    const pageModulePath = localRequire.resolve("./scene-detail-page");
    delete localRequire.cache[pageModulePath];
    const imported = localRequire("./scene-detail-page") as { default: React.ComponentType };
    SceneDetailPageModule = imported.default;
  }
  return SceneDetailPageModule;
}

afterEach(() => {
  cleanup();
  currentSearchParams = new URLSearchParams();
  currentGeneratedState = {
    latestPracticeSet: null,
    latestVariantSet: null,
    practiceStatus: "idle",
    variantStatus: "idle",
  };
  expressionMapResult = null;
  routerPushCalls.length = 0;
  deletePracticeSetCalls.length = 0;
  deleteVariantItemCalls.length = 0;
  ensureExpressionMapCalls.length = 0;
  window.confirm = originalConfirm;
  toast.error = originalToastError;
  toast.success = originalToastSuccess;
  toast.message = originalToastMessage;
});

test("SceneDetailPage 在 practice 路由下删除练习后会回退到 scene 路由", async () => {
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

test("SceneDetailPage 切回 scene 后会清空表达地图缓存并在下次重新生成", async () => {
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
  const { rerender } = render(<SceneDetailPage />);

  await screen.findByText("variants-view");
  fireEvent.click(screen.getByRole("button", { name: "open-map" }));
  await waitFor(() => {
    assert.equal(ensureExpressionMapCalls.length, 1);
  });

  currentSearchParams = new URLSearchParams();
  rerender(<SceneDetailPage />);
  currentSearchParams = new URLSearchParams("view=variants");
  rerender(<SceneDetailPage />);

  await screen.findByText("variants-view");
  fireEvent.click(screen.getByRole("button", { name: "open-map" }));
  await waitFor(() => {
    assert.equal(ensureExpressionMapCalls.length, 2);
  });
});
