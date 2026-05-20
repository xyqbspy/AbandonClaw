"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  getSceneLearningProgressCache,
  getSceneLearningProgressCacheSnapshotSync,
  getScenePracticeSnapshotCache,
  setSceneLearningProgressCache,
  setScenePracticeSnapshotCache,
} from "@/lib/cache/scene-runtime-cache";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SceneDetailSkeleton } from "@/features/scene/components/scene-detail-skeleton";
import {
  SCENE_ACTION_BUTTON_LG_CLASSNAME,
  SCENE_ACTION_BUTTON_SM_CLASSNAME,
  SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME,
  SCENE_PAGE_MUTED_TEXT_CLASSNAME,
  SCENE_PAGE_RAISED_SECTION_CLASSNAME,
  SCENE_PAGE_SHEET_PADDING_CLASSNAME,
} from "@/features/scene/components/scene-page-styles";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { Lesson } from "@/lib/types";
import { recordClientEvent } from "@/lib/utils/client-events";
import { savePhraseFromApi } from "@/lib/utils/phrases-api";
import { savePracticeSet } from "@/lib/utils/scene-learning-flow-storage";
import {
  getScenePracticeSetFromApi,
  getScenePracticeSnapshotFromApi,
  recordSceneTrainingEventFromApi,
  ScenePracticeSnapshotResponse,
  SceneLearningProgressResponse,
} from "@/lib/utils/learning-api";
import { useSceneDetailActions } from "./use-scene-detail-actions";
import { sceneDetailMessages } from "./scene-detail-messages";
import {
  notifySceneContinueStep,
  notifySceneExpressionFocused,
  notifySceneFocusStepHint,
  notifySceneLoadError,
  notifySceneLoopPrompt,
  notifySceneMilestone,
  notifyScenePhraseAlreadySaved,
  notifyScenePhraseSaved,
  notifyScenePhraseSaveFailed,
  notifySceneSentencePracticed,
  notifySceneSessionCompleted,
} from "./scene-detail-notify";
import {
  deriveSceneTrainingCompletedMap,
  deriveSceneTrainingState,
} from "./scene-detail-selectors";
import { SceneTrainingCoachFloatingEntry } from "./scene-training-coach-floating-entry";
import { SceneTrainingNextStepStrip } from "./scene-training-next-step-strip";
import { useSceneDetailData } from "./use-scene-detail-data";
import { useSceneDetailPlayback } from "./use-scene-detail-playback";
import { useSceneDetailRouteState } from "./use-scene-detail-route-state";
import { useSceneGenerationPrewarm } from "./use-scene-generation-prewarm";
import {
  resetScenePracticeRunStartDedupForTests,
  useScenePracticeRunLifecycle,
} from "./use-scene-practice-run-lifecycle";
import { useSceneVariantRunLifecycle } from "./use-scene-variant-run-lifecycle";
import { useSceneLearningSync } from "./use-scene-learning-sync";
import { SceneDetailViewSwitch } from "./scene-detail-view-switch";

const appleButtonSmClassName = SCENE_ACTION_BUTTON_SM_CLASSNAME;
export { resetScenePracticeRunStartDedupForTests };

type SavePhrasePayload = {
  text: string;
  translation?: string;
  usageNote?: string;
  sourceType?: "scene" | "manual";
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
};
export default function SceneDetailClientPage({
  initialLesson = null,
}: {
  initialLesson?: Lesson | null;
}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sceneSlug = params?.slug ?? "";
  const onRouteChangeRef = useRef<() => void>(() => undefined);
  const sessionDoneRef = useRef(false);
  const focusExpressionPromptShownRef = useRef(false);
  const sceneResumeToastShownRef = useRef(false);
  const initialTrainingStateSnapshot = getSceneLearningProgressCacheSnapshotSync(sceneSlug);
  const initialTrainingState =
    initialTrainingStateSnapshot.found && initialTrainingStateSnapshot.record
      ? initialTrainingStateSnapshot.record.data.state
      : null;
  const initialTrainingStateIsFresh =
    initialTrainingStateSnapshot.found &&
    Boolean(initialTrainingStateSnapshot.record) &&
    !initialTrainingStateSnapshot.isExpired;
  const [hydratedTrainingCache, setHydratedTrainingCache] = useState<{
    sceneSlug: string;
    isResolved: boolean;
    isFresh: boolean;
    state: SceneLearningProgressResponse | null;
  }>(() => ({
    sceneSlug,
    isResolved: initialTrainingStateSnapshot.found,
    isFresh: initialTrainingStateIsFresh,
    state: initialTrainingState,
  }));
  const currentHydratedTrainingCache =
    hydratedTrainingCache.sceneSlug === sceneSlug
      ? hydratedTrainingCache
      : {
        sceneSlug,
        isResolved: false,
        isFresh: false,
        state: null,
      };
  const [trainingState, setTrainingState] = useState<SceneLearningProgressResponse | null>(
    initialTrainingState,
  );
  const [practiceSnapshot, setPracticeSnapshot] = useState<ScenePracticeSnapshotResponse | null>(null);
  const [viewResetVersion, setViewResetVersion] = useState(0);

  const {
    baseLesson,
    sceneLoading,
    loadErrorMessage,
    savedPhraseTextSet,
    setSavedPhraseTextSet,
    generatedState,
    refreshGeneratedState,
  } = useSceneDetailData(sceneSlug, { initialLesson });

  const handleSceneRouteChange = useCallback(() => {
    onRouteChangeRef.current();
  }, []);

  const { viewMode, activeVariantId, setActiveVariantId, setViewModeWithRoute } =
    useSceneDetailRouteState({
      sceneSlug,
      searchParams,
      router,
      onRouteChange: handleSceneRouteChange,
    });

  const handleLearningStateChange = useCallback((nextState: SceneLearningProgressResponse) => {
    const nextDone = Boolean(nextState.session?.isDone);
    if (nextDone && !sessionDoneRef.current) {
      const nextStepHint = nextState.progress.variantUnlockedAt
        ? "下一步可以直接打开变体训练。"
        : "下一步可以回到今日学习做一轮主动回忆。";
      notifySceneSessionCompleted({
        savedPhraseCount: nextState.progress.savedPhraseCount,
        nextStepHint,
      });
      recordClientEvent("scene_learning_completed", {
        sceneSlug,
        sceneId: nextState.progress.sceneId,
        savedPhraseCount: nextState.progress.savedPhraseCount,
        completedSentenceCount: nextState.progress.completedSentenceCount,
        scenePracticeCount: nextState.progress.scenePracticeCount,
        variantUnlocked: Boolean(nextState.progress.variantUnlockedAt),
      });
    }
    sessionDoneRef.current = nextDone;
    if ((nextState.session?.openedExpressionCount ?? 0) > 0) {
      focusExpressionPromptShownRef.current = true;
    }
    setTrainingState(nextState);
    void setSceneLearningProgressCache(sceneSlug, nextState).catch(() => {
      // Ignore cache failures.
    });
  }, [sceneSlug]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const syncSnapshot = getSceneLearningProgressCacheSnapshotSync(sceneSlug);
      const syncState = syncSnapshot.found && syncSnapshot.record ? syncSnapshot.record.data.state : null;
      setHydratedTrainingCache({
        sceneSlug,
        isResolved: syncSnapshot.found,
        isFresh: syncSnapshot.found && Boolean(syncSnapshot.record) && !syncSnapshot.isExpired,
        state: syncState,
      });
      sessionDoneRef.current = Boolean(syncState?.session?.isDone);
      setTrainingState(syncState);

      void getSceneLearningProgressCache(sceneSlug).then((result) => {
        if (cancelled) return;
        const nextState = result.found && result.record ? result.record.data.state : null;
        setHydratedTrainingCache({
          sceneSlug,
          isResolved: true,
          isFresh: result.found && Boolean(result.record) && !result.isExpired,
          state: nextState,
        });
        sessionDoneRef.current = Boolean(nextState?.session?.isDone);
        setTrainingState(nextState);
      }).catch(() => {
        if (cancelled) return;
        setHydratedTrainingCache((current) => ({
          ...current,
          sceneSlug,
          isResolved: true,
        }));
      });
    }).catch(() => {
      // Non-blocking cache hydration.
    });
    return () => {
      cancelled = true;
    };
  }, [sceneSlug]);

  useSceneLearningSync({
    baseLesson,
    viewMode,
    activeVariantId,
    initialLearningState: currentHydratedTrainingCache.state,
    hasFreshInitialLearningState: currentHydratedTrainingCache.isFresh,
    deferStartUntilInitialLearningStateResolved: !currentHydratedTrainingCache.isResolved,
    onLearningStateChange: handleLearningStateChange,
  });

  const latestPracticeSet = generatedState.latestPracticeSet;
  const latestVariantSet = generatedState.latestVariantSet;
  const latestPracticeSetId = latestPracticeSet?.id ?? null;
  const latestVariantSetId = latestVariantSet?.id ?? null;
  const latestVariantSetStatus = latestVariantSet?.status ?? null;
  const activeVariantItem =
    latestVariantSet?.variants.find((variant) => variant.id === activeVariantId) ?? null;
  const activeVariantLesson = activeVariantItem?.lesson ?? null;

  useEffect(() => {
    if (!baseLesson) return;
    let cancelled = false;
    void getScenePracticeSetFromApi(baseLesson.slug)
      .then((result) => {
        if (cancelled || !result.practiceSet) return;
        savePracticeSet(result.practiceSet);
        refreshGeneratedState(baseLesson.id);
      })
      .catch(() => {
        // Keep local practice set cache as a non-blocking fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [baseLesson, refreshGeneratedState, viewMode]);

  const {
    practiceLoading,
    variantsLoading,
    practiceError,
    variantsError,
    showAnswerMap,
    expressionMapLoading,
    expressionMapError,
    expressionMap,
    canGeneratePractice,
    handleGeneratePractice,
    handleRegeneratePractice,
    handleMarkPracticeComplete,
    handleMarkVariantSetComplete,
    handleOpenVariant,
    handleDeletePracticeSet,
    handleDeleteVariantSet,
    handleDeleteVariantItem,
    handlePracticeToolClick,
    handleRepeatPractice,
    handleRepeatVariants,
    handleVariantToolClick,
    prewarmPractice,
    prewarmVariants,
    handleOpenExpressionMap,
    setShowAnswerMap,
    resetRouteScopedState,
    sceneCompleting,
  } = useSceneDetailActions({
    baseLesson,
    latestPracticeSet,
    latestVariantSet,
    activeVariantId,
    setActiveVariantId,
    setViewModeWithRoute,
    refreshGeneratedState,
    onLearningStateChange: handleLearningStateChange,
  });

  const {
    practiceRetryError,
    resetPracticePrewarmFailures,
    handlePracticeToolAction,
    handleGeneratePracticeManually,
    handleRegeneratePracticeManually,
  } = useSceneGenerationPrewarm({
    baseLesson,
    currentStep: trainingState?.session?.currentStep ?? null,
    generatedState,
    practiceLoading,
    variantsLoading,
    handlePracticeToolClick,
    handleGeneratePractice,
    handleRegeneratePractice,
    prewarmPractice,
    prewarmVariants,
  });

  const {
    playbackState,
    effectiveSpeakingText,
    variantChunkModalOpen,
    setVariantChunkModalOpen,
    variantChunkDetail,
    variantChunkSentence,
    variantChunkRelatedChunks,
    variantChunkHoveredKey,
    setVariantChunkHoveredKey,
    handlePronounce,
    handleLoopSentence,
    handleOpenVariantChunk,
    handleOpenExpressionDetail,
    handleBlockPlaybackWarmup,
    handleSentencePlaybackWarmup,
    resetChunkDetailState,
  } = useSceneDetailPlayback({
    sceneSlug,
    viewMode,
    baseLesson,
    activeVariantLesson,
    latestVariantSet,
  });

  useEffect(() => {
    onRouteChangeRef.current = () => {
      resetRouteScopedState();
      resetChunkDetailState();
      sessionDoneRef.current = false;
      focusExpressionPromptShownRef.current = false;
      sceneResumeToastShownRef.current = false;
      resetPracticePrewarmFailures();
      setViewResetVersion((current) => current + 1);
    };
  }, [resetChunkDetailState, resetPracticePrewarmFailures, resetRouteScopedState]);

  useEffect(() => {
    if (!baseLesson || !latestPracticeSetId) {
      let cancelled = false;
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setPracticeSnapshot(null);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    let cancelled = false;
    void (async () => {
      const cache = await getScenePracticeSnapshotCache(baseLesson.slug, latestPracticeSetId);
      if (!cancelled && cache.found && cache.record && !cache.isExpired) {
        setPracticeSnapshot(cache.record.data.snapshot);
      }

      try {
        const result = await getScenePracticeSnapshotFromApi(baseLesson.slug, {
          practiceSetId: latestPracticeSetId,
        });
        if (cancelled) return;
        setPracticeSnapshot(result);
        void setScenePracticeSnapshotCache(baseLesson.slug, latestPracticeSetId, result).catch(() => {
          // Ignore cache failures.
        });
      } catch {
        if (cancelled || (cache.found && cache.record && !cache.isExpired)) return;
        setPracticeSnapshot(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseLesson, latestPracticeSetId]);

  const variantUnlocked = Boolean(trainingState?.progress.variantUnlockedAt);

  const sceneRawCompletedMap = useMemo(
    () =>
      deriveSceneTrainingCompletedMap({
        session: trainingState?.session,
        practiceSetStatus: generatedState.practiceStatus,
        practiceSnapshot,
        variantUnlocked,
      }),
    [generatedState.practiceStatus, practiceSnapshot, trainingState?.session, variantUnlocked],
  );
  const sceneTrainingState = useMemo(
    () => deriveSceneTrainingState(sceneRawCompletedMap),
    [sceneRawCompletedMap],
  );

  useEffect(() => {
    if (!baseLesson) return;
    if (sceneResumeToastShownRef.current) return;
    const currentStep = sceneTrainingState.currentStep;
    if (
      currentStep === "listen" ||
      currentStep === "done" ||
      !trainingState
    ) {
      return;
    }
    sceneResumeToastShownRef.current = true;
    notifySceneContinueStep(currentStep);
  }, [baseLesson, sceneTrainingState.currentStep, trainingState]);

  const handleSceneFullPlay = useCallback(() => {
    if (!baseLesson) return;
    const shouldNotifyMilestone = (trainingState?.session?.fullPlayCount ?? 0) < 1;
    notifySceneLoopPrompt();
    void recordSceneTrainingEventFromApi(baseLesson.slug, {
      event: "full_play",
    })
      .then((nextState) => {
        handleLearningStateChange(nextState);
        if (shouldNotifyMilestone && (nextState.session?.fullPlayCount ?? 0) >= 1) {
          notifySceneMilestone("listen", baseLesson.title);
        }
      })
      .catch(() => {
        // Non-blocking.
      });
  }, [baseLesson, handleLearningStateChange, trainingState?.session?.fullPlayCount]);

  const handleBaseChunkEncounter = useCallback(
    (payload: {
      lesson: Lesson;
      sentence: import("@/lib/types").LessonSentence;
      chunkText: string;
      blockId?: string;
      source?: "direct" | "related";
    }) => {
      if (payload.lesson.slug !== baseLesson?.slug) return;
      const shouldNotifyMilestone = (trainingState?.session?.openedExpressionCount ?? 0) < 1;
      if (payload.source !== "related" && !focusExpressionPromptShownRef.current) {
        notifySceneExpressionFocused();
        focusExpressionPromptShownRef.current = true;
      }
      void recordSceneTrainingEventFromApi(payload.lesson.slug, {
        event: "open_expression",
        selectedBlockId: payload.blockId,
      })
        .then((nextState) => {
          handleLearningStateChange(nextState);
          if (shouldNotifyMilestone && (nextState.session?.openedExpressionCount ?? 0) >= 1) {
            notifySceneMilestone("focus_expression", payload.lesson.title);
          }
        })
        .catch(() => {
          // Non-blocking.
        });
    },
    [baseLesson?.slug, handleLearningStateChange, trainingState?.session?.openedExpressionCount],
  );

  const handleSentenceCompleted = useCallback(() => {
    notifySceneSentencePracticed();
  }, []);

  const savePhraseForScene = useCallback(
    async (payload: SavePhrasePayload) => {
      if (!baseLesson) return { created: false };
      const result = await savePhraseFromApi({
        text: payload.text,
        translation: payload.translation,
        usageNote: payload.usageNote,
        sourceSceneSlug: baseLesson.slug,
        sourceType: payload.sourceType ?? "scene",
        sourceSentenceIndex: payload.sourceSentenceIndex,
        sourceSentenceText: payload.sourceSentenceText,
        sourceChunkText: payload.sourceChunkText ?? payload.text,
      });
      setSavedPhraseTextSet((prev) => {
        const next = new Set(prev);
        next.add(normalizePhraseText(payload.text));
        return next;
      });
      return { created: result.created };
    },
    [baseLesson, setSavedPhraseTextSet],
  );

  const handleSaveFromVariantSheet = useCallback(() => {
    if (!variantChunkDetail?.text) return;
    const sentenceIndex = variantChunkSentence
      ? (baseLesson?.sections
        .flatMap((section) => section.blocks.flatMap((block) => block.sentences))
        .findIndex((sentence) => sentence.id === variantChunkSentence.id) ?? -1)
      : -1;

    void savePhraseForScene({
      text: variantChunkDetail.text,
      translation: variantChunkDetail.translation,
      usageNote: variantChunkDetail.usageNote,
      sourceSentenceIndex: sentenceIndex >= 0 ? sentenceIndex : undefined,
      sourceSentenceText: variantChunkSentence?.text,
      sourceChunkText: variantChunkDetail.text,
    })
      .then((result) => {
        if (!result.created) {
          notifyScenePhraseAlreadySaved();
          return;
        }
        notifyScenePhraseSaved();
      })
      .catch((error) => {
        notifyScenePhraseSaveFailed(error instanceof Error ? error.message : undefined);
      });
  }, [baseLesson, savePhraseForScene, variantChunkDetail, variantChunkSentence]);

  useEffect(() => {
    if (!baseLesson) return;
    refreshGeneratedState(baseLesson.id);
  }, [baseLesson, refreshGeneratedState, viewResetVersion]);

  useEffect(() => {
    if (!loadErrorMessage) return;
    notifySceneLoadError(loadErrorMessage);
  }, [loadErrorMessage]);

  const {
    handlePracticeRunStart,
    handlePracticeComplete,
    handlePracticeAttempt,
    handlePracticeModeComplete,
  } = useScenePracticeRunLifecycle({
    baseLesson,
    latestPracticeSet,
    practicedSentenceCount: trainingState?.session?.practicedSentenceCount ?? 0,
    scenePracticeCompleted: sceneRawCompletedMap.scene_practice,
    setPracticeSnapshot,
    handleLearningStateChange,
    handleMarkPracticeComplete,
  });

  useSceneVariantRunLifecycle({
    baseLesson,
    viewMode,
    latestVariantSetId,
    latestVariantSetStatus,
    activeVariantId,
    searchParams,
    setActiveVariantId,
    refreshGeneratedState,
  });

  const handleBackToSceneView = useCallback(() => {
    setViewModeWithRoute("scene");
  }, [setViewModeWithRoute]);

  const handleOpenVariantsView = useCallback(() => {
    setViewModeWithRoute("variants");
  }, [setViewModeWithRoute]);

  const handleRegeneratePracticeFromView = useCallback(() => {
    void handleRegeneratePracticeManually();
  }, [handleRegeneratePracticeManually]);

  const handleOpenExpressionMapView = useCallback(() => {
    void handleOpenExpressionMap();
  }, [handleOpenExpressionMap]);

  const handleTogglePracticeAnswer = useCallback(
    (exerciseId: string) => {
      setShowAnswerMap((prev) => ({
        ...prev,
        [exerciseId]: !prev[exerciseId],
      }));
    },
    [setShowAnswerMap],
  );

  const handleTrainingListenStep = useCallback(() => {
    handleSceneFullPlay();
  }, [handleSceneFullPlay]);

  const handleTrainingFocusExpressionStep = useCallback(() => {
    notifySceneFocusStepHint();
  }, []);

  const currentStepAction = useMemo(() => {
    const currentStep = sceneTrainingState.currentStep;
    const rawSessionStep = trainingState?.session?.currentStep;
    if (currentStep === "listen") {
      return {
        label: "开始听整段",
        onClick: handleTrainingListenStep,
        disabled: false,
      };
    }
    if (currentStep === "focus_expression") {
      return {
        label: "去看重点表达",
        onClick: handleTrainingFocusExpressionStep,
        disabled: false,
      };
    }
    if (rawSessionStep === "practice_sentence" || currentStep === "scene_practice") {
      const practiceSetStatus = latestPracticeSet?.status ?? generatedState.practiceStatus;
      const isSentenceEntryStep = rawSessionStep === "practice_sentence";
      return {
        label:
          practiceSetStatus === "completed"
            ? isSentenceEntryStep
              ? "再练句子练习"
              : "再练整段练习"
            : practiceSetStatus === "generated"
              ? isSentenceEntryStep
                ? "进入句子练习"
                : "继续整段练习"
              : practiceLoading
                ? "练习准备中..."
                : isSentenceEntryStep
                  ? "生成并进入句子练习"
                  : "生成并完成整段练习",
        onClick: () => {
          if (practiceSetStatus === "completed") {
            handleRepeatPractice();
            return;
          }
          handlePracticeToolAction();
        },
        disabled: practiceLoading,
        loading: practiceLoading,
      };
    }
    if (currentStep === "done" || variantUnlocked) {
      const variantSetStatus = latestVariantSet?.status ?? generatedState.variantStatus;
      return {
        label:
          variantSetStatus === "completed"
            ? "再练变体训练"
            : variantSetStatus === "generated"
              ? "查看变体"
              : variantsLoading
                ? "变体准备中..."
                : "打开变体训练",
        onClick: () => {
          if (variantSetStatus === "completed") {
            handleRepeatVariants();
            return;
          }
          handleVariantToolClick();
        },
        disabled: variantsLoading,
        loading: variantsLoading,
      };
    }
    return {
      label: null,
      onClick: null,
      disabled: false,
      loading: false,
    };
  }, [
    generatedState.practiceStatus,
    generatedState.variantStatus,
    latestPracticeSet?.status,
    latestVariantSet?.status,
    handlePracticeToolAction,
    handleRepeatPractice,
    handleRepeatVariants,
    handleTrainingFocusExpressionStep,
    handleTrainingListenStep,
    handleVariantToolClick,
    practiceLoading,
    sceneTrainingState.currentStep,
    trainingState?.session?.currentStep,
    variantUnlocked,
    variantsLoading,
  ]);

  const practiceStepAction = useMemo(() => {
    if (generatedState.practiceStatus !== "completed") return null;
    return {
      label: "复习",
      onClick: handleRepeatPractice,
      disabled: practiceLoading,
      loading: practiceLoading,
    };
  }, [
    generatedState.practiceStatus,
    handleRepeatPractice,
    practiceLoading,
  ]);

  if (sceneLoading) {
    return <SceneDetailSkeleton />;
  }

  if (!baseLesson) {
    return (
      <div className={SCENE_PAGE_SHEET_PADDING_CLASSNAME}>
        <div className={SCENE_PAGE_RAISED_SECTION_CLASSNAME}>
          <p className={SCENE_PAGE_MUTED_TEXT_CLASSNAME}>{sceneDetailMessages.notFound}</p>
        </div>
      </div>
    );
  }

  const trainingProgressEntry = (
    <SceneTrainingCoachFloatingEntry
      placement="inline"
      trainingState={trainingState}
      variantUnlocked={variantUnlocked}
      practiceSetStatus={generatedState.practiceStatus}
      practiceSnapshot={practiceSnapshot}
      practiceModuleCount={latestPracticeSet?.modules?.length ?? 0}
      practiceStepAction={practiceStepAction}
    />
  );

  const trainingNextStep = ({
    isSceneLooping,
    isSceneLoopLoading,
    toggleSceneLoopPlayback,
  }: {
    isSceneLooping: boolean;
    isSceneLoopLoading: boolean;
    toggleSceneLoopPlayback: () => void;
  }) => (
    <SceneTrainingNextStepStrip
      title={baseLesson.subtitle?.trim() || baseLesson.sections[0]?.summary?.trim() || baseLesson.title}
      onBack={() => router.push("/scenes")}
      trainingState={trainingState}
      variantUnlocked={variantUnlocked}
      practiceSetStatus={generatedState.practiceStatus}
      practiceSnapshot={practiceSnapshot}
      isSceneLooping={isSceneLooping}
      isSceneLoopLoading={isSceneLoopLoading}
      onSceneLoopPlayback={toggleSceneLoopPlayback}
      currentStepActionLabel={currentStepAction.label}
      currentStepActionLoading={currentStepAction.loading}
      onCurrentStepAction={currentStepAction.onClick}
      currentStepActionDisabled={currentStepAction.disabled}
      progressEntry={trainingProgressEntry}
    />
  );

  const chunkDetailSheet = (
    <SelectionDetailSheet
      currentSentence={variantChunkSentence}
      chunkDetail={variantChunkDetail}
      relatedChunks={variantChunkRelatedChunks}
      open={variantChunkModalOpen}
      loading={false}
      speakingText={effectiveSpeakingText}
      onOpenChange={setVariantChunkModalOpen}
      onSave={handleSaveFromVariantSheet}
      onReview={handleSaveFromVariantSheet}
      saved={
        variantChunkDetail?.text
          ? savedPhraseTextSet.has(normalizePhraseText(variantChunkDetail.text))
          : false
      }
      onPronounce={handlePronounce}
      onPronounceBlock={() => {
        if (variantChunkSentence?.text) {
          handleLoopSentence(variantChunkSentence.text);
        }
      }}
      onSelectRelated={handleOpenVariantChunk}
      hoveredChunkKey={variantChunkHoveredKey}
      onHoverChunk={setVariantChunkHoveredKey}
      playingChunkKey={playbackState.kind === "chunk" ? (playbackState.text ?? null) : null}
      showSentenceSection={false}
      showRelatedChunkAudio={false}
    />
  );

  return (
    <SceneDetailViewSwitch
      viewMode={viewMode}
      baseLesson={baseLesson}
      activeVariantItem={activeVariantItem}
      activeVariantLesson={activeVariantLesson}
      latestPracticeSet={latestPracticeSet}
      latestVariantSet={latestVariantSet}
      practiceSnapshot={practiceSnapshot}
      showAnswerMap={showAnswerMap}
      expressionMap={expressionMap}
      expressionMapError={expressionMapError}
      expressionMapLoading={expressionMapLoading}
      practiceRetryError={practiceRetryError}
      practiceError={practiceError}
      variantsError={variantsError}
      practiceLoading={practiceLoading}
      sceneCompleting={sceneCompleting}
      canGeneratePractice={canGeneratePractice}
      savedPhraseTexts={Array.from(savedPhraseTextSet)}
      appleButtonSmClassName={appleButtonSmClassName}
      appleButtonLgClassName={SCENE_ACTION_BUTTON_LG_CLASSNAME}
      appleDangerButtonSmClassName={SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME}
      trainingNextStep={trainingNextStep}
      chunkDetailSheet={chunkDetailSheet}
      onBackToList={() => router.push("/scenes")}
      onBackToSceneView={handleBackToSceneView}
      onOpenVariantsView={handleOpenVariantsView}
      onRegeneratePracticeFromView={handleRegeneratePracticeFromView}
      onOpenExpressionMapView={handleOpenExpressionMapView}
      onDeletePracticeSet={handleDeletePracticeSet}
      onPracticeComplete={handlePracticeComplete}
      onSentenceCompleted={handleSentenceCompleted}
      onPracticeRunStart={handlePracticeRunStart}
      onPracticeAttempt={handlePracticeAttempt}
      onPracticeModeComplete={handlePracticeModeComplete}
      onRepeatPractice={handleRepeatPractice}
      onTogglePracticeAnswer={handleTogglePracticeAnswer}
      onMarkVariantSetComplete={handleMarkVariantSetComplete}
      onRepeatVariants={handleRepeatVariants}
      onDeleteVariantSet={handleDeleteVariantSet}
      onOpenVariantChunk={handleOpenVariantChunk}
      onOpenVariant={handleOpenVariant}
      onDeleteVariantItem={handleDeleteVariantItem}
      onOpenExpressionDetail={handleOpenExpressionDetail}
      onGeneratePracticeManually={handleGeneratePracticeManually}
      onSavePhrase={savePhraseForScene}
      onReviewPhrase={savePhraseForScene}
      onSceneFullPlay={handleSceneFullPlay}
      onBlockPlayback={handleBlockPlaybackWarmup}
      onSentencePlayback={handleSentencePlaybackWarmup}
      onChunkEncounter={handleBaseChunkEncounter}
      onSentencePracticeComplete={handleSentenceCompleted}
    />
  );
}









