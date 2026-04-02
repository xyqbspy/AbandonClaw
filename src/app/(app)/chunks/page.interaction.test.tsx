import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

let clearAllPhraseListCacheCalls = 0;
let loadPhrasesError: Error | null = null;
const notifyChunksLoadFailedCalls: Array<string | null> = [];
const loadPhrasesCalls: Array<
  [
    string,
    "saved" | "reviewing" | "mastered" | "archived" | "all",
    "expression" | "sentence",
    string,
    { preferCache?: boolean } | undefined,
  ]
> = [];

const mockedModules = {
  "next/navigation": {
    useRouter: () => ({
      push: () => undefined,
      replace: () => undefined,
      prefetch: () => Promise.resolve(),
    }),
    useSearchParams: () => new URLSearchParams("query=burned+out&review=reviewing&content=sentence&cluster=cluster-1"),
  },
  "@/lib/cache/phrase-list-cache": {
    clearAllPhraseListCache: async () => {
      clearAllPhraseListCacheCalls += 1;
    },
  },
  "@/hooks/use-tts-playback-state": {
    useTtsPlaybackState: () => ({
      status: "idle",
      text: null,
    }),
  },
  "@/components/ui/input": {
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  },
  "@/components/ui/textarea": {
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  },
  "@/components/ui/button": {
    Button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  "@/components/shared/segmented-control": {
    SegmentedControl: () => null,
  },
  "@/components/shared/action-loading": {
    LoadingButton: ({
      children,
      loading: _loading,
      loadingText: _loadingText,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      loading?: boolean;
      loadingText?: string;
    }) => <button {...props}>{children}</button>,
    LoadingState: ({ text }: { text?: string }) => <div>{text ?? "loading"}</div>,
    formatLoadingText: (text?: string) => text ?? "",
  },
  "@/components/shared/empty-state": {
    EmptyState: () => null,
  },
  "@/components/shared/example-sentence-cards": {
    ExampleSentenceCards: () => null,
  },
  "@/components/ui/sheet": {
    Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SheetDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SheetFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SheetHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  },
  "@/features/chunks/components/move-into-cluster-sheet": {
    MoveIntoClusterSheet: () => null,
  },
  "@/features/chunks/components/focus-detail-sheet": {
    FocusDetailSheet: () => null,
  },
  "@/features/chunks/components/expression-map-sheet": {
    ExpressionMapSheet: () => null,
  },
  "@/features/chunks/components/cluster-focus-list": {
    ClusterFocusList: () => null,
  },
  "./chunks-list-view": {
    ChunksListView: () => null,
  },
  "./use-chunks-route-state": {
    useChunksRouteState: () => ({
      query: "burned out",
      setQuery: () => undefined,
      reviewFilter: "reviewing" as const,
      setReviewFilter: () => undefined,
      contentFilter: "sentence" as const,
      setContentFilter: () => undefined,
      expressionClusterFilterId: "cluster-1",
      setExpressionClusterFilterId: () => undefined,
    }),
  },
  "./use-chunks-list-data": {
    useChunksListData: () => ({
      loading: false,
      phrases: [],
      setPhrases: () => undefined,
      total: 0,
      loadPhrases: async (
        query: string,
        reviewFilter: "saved" | "reviewing" | "mastered" | "archived" | "all",
        contentFilter: "expression" | "sentence",
        expressionClusterFilterId: string,
        options?: { preferCache?: boolean },
      ) => {
        loadPhrasesCalls.push([
          query,
          reviewFilter,
          contentFilter,
          expressionClusterFilterId,
          options,
        ]);
        if (loadPhrasesError) throw loadPhrasesError;
      },
    }),
  },
  "./use-focus-assist": {
    useFocusAssist: () => ({
      focusAssistLoading: false,
      focusAssistData: null,
      resetFocusAssist: () => undefined,
      loadFocusAssist: async () => undefined,
      savingFocusCandidateKeys: [],
      completedFocusCandidateKeys: [],
      saveFocusCandidate: async () => undefined,
    }),
  },
  "./use-focus-detail-controller": {
    useFocusDetailController: () => ({
      focusDetailOpen: false,
      setFocusDetailOpen: () => undefined,
      focusDetailLoading: false,
      focusDetail: null,
      setFocusDetail: () => undefined,
      focusDetailTab: "info",
      setFocusDetailTab: () => undefined,
      focusDetailTrail: [],
      setFocusDetailTrail: () => undefined,
      openFocusDetail: async () => undefined,
      openFocusSiblingDetail: () => undefined,
      reopenFocusTrailItem: () => undefined,
    }),
  },
  "./use-saved-relations": {
    useSavedRelations: () => ({
      savedRelationCache: {},
      savedRelationRowsBySourceId: {},
      savedRelationLoadingKey: null,
      focusRelationsBootstrapDone: true,
      invalidateSavedRelations: () => undefined,
    }),
  },
  "./use-manual-expression-composer": {
    useManualExpressionComposer: () => ({
      manualExpressionAssist: null,
      manualAssistLoading: false,
      manualSelectedMap: {},
      clearManualExpressionAssist: () => undefined,
      resetManualExpressionComposer: () => undefined,
      toggleManualSelected: () => undefined,
      loadManualExpressionAssist: async () => undefined,
      saveManualExpression: async () => null,
    }),
  },
  "./use-manual-sentence-composer": {
    useManualSentenceComposer: () => ({
      savingManualSentence: false,
      saveManualSentence: async () => null,
    }),
  },
  "./use-expression-cluster-actions": {
    useExpressionClusterActions: () => ({
      detachingClusterMember: false,
      moveIntoClusterOpen: false,
      setMoveIntoClusterOpen: () => undefined,
      movingIntoCluster: false,
      ensuringMoveTargetCluster: false,
      detachFocusDetailFromCluster: async () => undefined,
      setFocusDetailAsClusterMain: async () => undefined,
      handleMoveSelectedIntoCurrentCluster: async () => undefined,
      openMoveIntoCurrentCluster: async () => undefined,
    }),
  },
  "./use-generated-similar-sheet": {
    useGeneratedSimilarSheet: () => ({
      similarSheetOpen: false,
      setSimilarSheetOpen: () => undefined,
      similarSeedExpression: null,
      generatingSimilarForId: null,
      generatedSimilarCandidates: [],
      selectedSimilarMap: {},
      savingSelectedSimilar: false,
      openGenerateSimilarSheet: async () => undefined,
      toggleCandidateSelected: () => undefined,
      saveSelectedSimilarCandidates: async () => undefined,
      resetGeneratedSimilarSheet: () => undefined,
    }),
  },
  "@/lib/utils/tts-api": {
    playChunkAudio: async () => undefined,
    regenerateChunkAudioBatch: async () => undefined,
    setTtsLooping: () => undefined,
    stopTtsPlayback: () => undefined,
  },
  "@/lib/utils/resource-actions": {
    scheduleChunkAudioWarmup: () => undefined,
  },
  "@/lib/utils/expression-map-api": {
    generateExpressionMapFromApi: async () => ({ clusters: [] }),
  },
  "@/lib/utils/phrases-api": {
    enrichSimilarExpressionFromApi: async () => undefined,
    savePhrasesBatchFromApi: async () => undefined,
    savePhraseFromApi: async () => undefined,
  },
  "@/lib/utils/review-session": {
    startReviewSession: () => undefined,
  },
  "@/features/chunks/components/expression-map-selectors": {
    buildExpressionMapViewModel: () => ({
      activeCluster: null,
      expressionStatusByNormalized: {},
      centerExpressionText: "",
      displayedClusterExpressions: [],
    }),
  },
  "@/features/chunks/components/focus-detail-selectors": {
    buildFocusDetailViewModel: () => ({
      canShowFindRelations: false,
      detailSpeakText: "",
      activeAssistItem: null,
    }),
  },
  "@/features/chunks/expression-clusters/ui-logic": {
    getFocusMainExpressionRows: () => [],
    resolveFocusMainExpressionId: () => "",
    toggleMoveIntoClusterCandidateSelection: (current: Record<string, boolean>) => current,
    toggleMoveIntoClusterGroupSelection: (current: Record<string, boolean>) => current,
  },
  "./chunks-page-logic": {
    buildSavedFocusDetailState: () => ({}),
    buildFocusDetailClosePayload: () => ({
      actionsOpen: false,
      trail: [],
      tab: "info",
    }),
    buildFocusDetailSheetState: () => ({}),
    buildGeneratedSimilarSheetState: () => ({
      title: "",
      description: "",
    }),
    buildManualSheetState: () => ({
      title: "",
      description: "",
    }),
    buildMoveIntoClusterOpenChangeState: (open: boolean) => ({
      open,
      shouldResetSelection: !open,
    }),
    buildMoveIntoClusterSheetState: () => ({}),
    buildClusterFilterChange: () => ({
      nextClusterId: "",
      shouldResetFilters: false,
    }),
    buildChunksSummary: () => "0 items",
    resolveClusterFilterExpressionLabel: () => "",
    resolveFocusExpressionId: () => "",
  },
  "./chunks-focus-detail-messages": {
    buildChunksFocusDetailLabels: () => ({}),
  },
  "./chunks-focus-detail-presenters": {
    buildChunksFocusDetailInteractionPresentation: () => ({
      buildTabChangeAction: (nextTab: string) => ({
        nextTab,
        nextRelationTab: nextTab === "contrast" ? "contrast" : "similar",
      }),
      buildOpenSimilarRowAction: () => ({
        nextRelationTab: "similar",
        detailInput: null,
      }),
      buildOpenContrastRowAction: () => ({
        nextRelationTab: "contrast",
        detailInput: null,
      }),
      buildSaveSimilarRowAction: () => null,
      buildSaveContrastRowAction: () => null,
    }),
    buildChunksFocusDetailSheetPresentation: () => ({}),
  },
  "./chunks-page-notify": {
    notifyChunksActionMessage: () => undefined,
    notifyChunksActionSucceeded: () => undefined,
    notifyChunksExpressionComposerOpened: () => undefined,
    notifyChunksExpressionMapOpened: () => undefined,
    notifyChunksLoadFailed: (message: string | null) => {
      notifyChunksLoadFailedCalls.push(message);
    },
    notifyChunksMissingExpression: () => undefined,
    notifyChunksMissingSentence: () => undefined,
    notifyChunksReviewFamilyStarted: () => undefined,
    notifyChunksReviewStarted: () => undefined,
    notifyChunksSelectAtLeastOne: () => undefined,
    notifyChunksSentenceExpressionSaved: () => undefined,
    notifyChunksSentenceReviewPending: () => undefined,
    notifyChunksSpeechUnsupported: () => undefined,
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

let ChunksPageModule: React.ComponentType | null = null;

function getChunksPage() {
  if (!ChunksPageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: React.ComponentType;
    };
    ChunksPageModule = imported.default;
  }
  return ChunksPageModule;
}

afterEach(() => {
  cleanup();
  clearAllPhraseListCacheCalls = 0;
  loadPhrasesError = null;
  loadPhrasesCalls.length = 0;
  notifyChunksLoadFailedCalls.length = 0;
  ChunksPageModule = null;
});

test("ChunksPage 会处理尾斜杠路径的下拉刷新并按当前筛选强制重新拉取列表", async () => {
  const ChunksPage = getChunksPage();
  render(<ChunksPage />);

  const refreshDetail = {
    pathname: "/chunks/",
    handled: false,
  };

  window.dispatchEvent(new CustomEvent("app:pull-refresh", { detail: refreshDetail }));

  await waitFor(() => {
    assert.equal(refreshDetail.handled, true);
    assert.equal(clearAllPhraseListCacheCalls, 1);
    assert.deepEqual(loadPhrasesCalls, [
      [
        "burned out",
        "reviewing",
        "sentence",
        "cluster-1",
        { preferCache: false },
      ],
    ]);
  });
});

test("ChunksPage 下拉刷新强制拉取失败时会保留清缓存行为并走统一错误通知", async () => {
  loadPhrasesError = new Error("load failed");
  const ChunksPage = getChunksPage();
  render(<ChunksPage />);

  const refreshDetail = {
    pathname: "/chunks/",
    handled: false,
  };

  window.dispatchEvent(new CustomEvent("app:pull-refresh", { detail: refreshDetail }));

  await waitFor(() => {
    assert.equal(refreshDetail.handled, true);
    assert.equal(clearAllPhraseListCacheCalls, 1);
    assert.deepEqual(loadPhrasesCalls, [
      [
        "burned out",
        "reviewing",
        "sentence",
        "cluster-1",
        { preferCache: false },
      ],
    ]);
    assert.deepEqual(notifyChunksLoadFailedCalls, ["load failed"]);
  });
});
