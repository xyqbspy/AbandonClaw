"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { formatLoadingText, LoadingContent } from "@/components/shared/action-loading";
import {
  getSceneLearningProgressCacheSnapshotSync,
  getScenePracticeSnapshotCache,
  getSceneVariantRunCache,
  setSceneLearningProgressCache,
  setScenePracticeSnapshotCache,
  setSceneVariantRunCache,
} from "@/lib/cache/scene-runtime-cache";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SceneExpressionMapView } from "@/features/scene/components/scene-expression-map-view";
import { ScenePracticeView } from "@/features/scene/components/scene-practice-view";
import { SceneDetailSkeleton } from "@/features/scene/components/scene-detail-skeleton";
import { SceneVariantsView } from "@/features/scene/components/scene-variants-view";
import { sceneViewLabels } from "@/features/scene/components/scene-view-labels";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { Lesson } from "@/lib/types";
import { savePhraseFromApi } from "@/lib/utils/phrases-api";
import { hydrateVariantSetFromRun } from "@/lib/utils/scene-learning-flow-storage";
import {
  completeScenePracticeRunFromApi,
  getScenePracticeSnapshotFromApi,
  getSceneVariantRunSnapshotFromApi,
  markScenePracticeModeCompleteFromApi,
  recordSceneTrainingEventFromApi,
  recordScenePracticeAttemptFromApi,
  ScenePracticeSnapshotResponse,
  SceneLearningProgressResponse,
  SceneVariantRunResponse,
  startScenePracticeRunFromApi,
  startSceneVariantRunFromApi,
} from "@/lib/utils/learning-api";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_META_TEXT,
  APPLE_PANEL_RAISED,
  APPLE_BUTTON_TEXT_LG,
  APPLE_BUTTON_TEXT_SM,
} from "@/lib/ui/apple-style";
import { cancelScheduledIdleAction, scheduleIdleAction } from "@/lib/utils/resource-actions";
import { useSceneDetailActions } from "./use-scene-detail-actions";
import { SceneBaseView } from "./scene-base-view";
import { toVariantStatusLabel, toVariantTitle } from "./scene-detail-logic";
import { sceneDetailMessages, TrainingStepKey } from "./scene-detail-messages";
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
import { useSceneDetailData } from "./use-scene-detail-data";
import { useSceneDetailPlayback } from "./use-scene-detail-playback";
import { useSceneDetailRouteState } from "./use-scene-detail-route-state";
import { useSceneLearningSync } from "./use-scene-learning-sync";
import { SceneVariantStudyView } from "./scene-variant-study-view";

const appleButtonSmClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;
const appleDangerButtonSmClassName = `${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`;
const PRACTICE_PREWARM_FAILURE_LIMIT = 3;
const PRACTICE_PREWARM_FAILURE_WINDOW_MS = 60_000;

type SavePhrasePayload = {
  text: string;
  translation?: string;
  usageNote?: string;
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
  const practicePrewarmFailureRef = useRef<{ count: number; firstFailureAt: number | null }>({
    count: 0,
    firstFailureAt: null,
  });
  const currentTrainingStepRef = useRef<TrainingStepKey | "done">("listen");
  const variantUnlockedRef = useRef(false);
  const latestPracticeStatusRef = useRef<"idle" | "generated" | "completed">("idle");
  const latestVariantStatusRef = useRef<"idle" | "generated" | "completed">("idle");
  const listenStepActionRef = useRef<() => unknown>(() => undefined);
  const focusExpressionStepActionRef = useRef<() => unknown>(() => undefined);
  const practiceToolActionRef = useRef<() => unknown>(() => undefined);
  const variantToolActionRef = useRef<() => unknown>(() => undefined);
  const repeatPracticeActionRef = useRef<() => unknown>(() => undefined);
  const repeatVariantsActionRef = useRef<() => unknown>(() => undefined);
  const initialTrainingStateSnapshot = getSceneLearningProgressCacheSnapshotSync(sceneSlug);
  const [trainingState, setTrainingState] = useState<SceneLearningProgressResponse | null>(
    initialTrainingStateSnapshot.found && initialTrainingStateSnapshot.record
      ? initialTrainingStateSnapshot.record.data.state
      : null,
  );
  const [practiceSnapshot, setPracticeSnapshot] = useState<ScenePracticeSnapshotResponse | null>(null);
  const [viewResetVersion, setViewResetVersion] = useState(0);
  const [practicePrewarmBlocked, setPracticePrewarmBlocked] = useState(false);
  const [practiceRetryError, setPracticeRetryError] = useState<string | null>(null);

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
      notifySceneSessionCompleted();
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
    const snapshot = getSceneLearningProgressCacheSnapshotSync(sceneSlug);
    if (snapshot.found && snapshot.record) {
      setTrainingState(snapshot.record.data.state);
      return;
    }
    setTrainingState(null);
  }, [sceneSlug]);

  useSceneLearningSync({
    baseLesson,
    viewMode,
    activeVariantId,
    initialLearningState:
      initialTrainingStateSnapshot.found && initialTrainingStateSnapshot.record
        ? initialTrainingStateSnapshot.record.data.state
        : null,
    hasFreshInitialLearningState:
      initialTrainingStateSnapshot.found &&
      Boolean(initialTrainingStateSnapshot.record) &&
      !initialTrainingStateSnapshot.isExpired,
    onLearningStateChange: handleLearningStateChange,
  });

  const latestPracticeSet = generatedState.latestPracticeSet;
  const latestVariantSet = generatedState.latestVariantSet;
  const activeVariantItem =
    latestVariantSet?.variants.find((variant) => variant.id === activeVariantId) ?? null;
  const activeVariantLesson = activeVariantItem?.lesson ?? null;

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
    resetChunkDetailState,
  } = useSceneDetailPlayback({
    sceneSlug,
    viewMode,
    baseLesson,
    activeVariantLesson,
    latestVariantSet,
  });

  onRouteChangeRef.current = () => {
    resetRouteScopedState();
    resetChunkDetailState();
    sessionDoneRef.current = false;
    focusExpressionPromptShownRef.current = false;
    sceneResumeToastShownRef.current = false;
    setTrainingState(null);
    setPracticeSnapshot(null);
    practicePrewarmFailureRef.current = {
      count: 0,
      firstFailureAt: null,
    };
    setPracticePrewarmBlocked(false);
    setPracticeRetryError(null);
    setViewResetVersion((current) => current + 1);
  };

  useEffect(() => {
    if (!baseLesson || !latestPracticeSet) {
      setPracticeSnapshot(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const cache = await getScenePracticeSnapshotCache(baseLesson.slug, latestPracticeSet.id);
      if (!cancelled && cache.found && cache.record && !cache.isExpired) {
        setPracticeSnapshot(cache.record.data.snapshot);
        return;
      }

      try {
        const result = await getScenePracticeSnapshotFromApi(baseLesson.slug, {
          practiceSetId: latestPracticeSet.id,
        });
        if (cancelled) return;
        setPracticeSnapshot(result);
        void setScenePracticeSnapshotCache(baseLesson.slug, latestPracticeSet.id, result).catch(() => {
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
  }, [baseLesson, latestPracticeSet?.id]);

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

  const resetPracticePrewarmFailures = useCallback(() => {
    practicePrewarmFailureRef.current = {
      count: 0,
      firstFailureAt: null,
    };
    setPracticePrewarmBlocked(false);
    setPracticeRetryError(null);
  }, []);

  const registerPracticePrewarmFailure = useCallback(() => {
    const now = Date.now();
    const current = practicePrewarmFailureRef.current;
    const withinWindow =
      current.firstFailureAt !== null &&
      now - current.firstFailureAt <= PRACTICE_PREWARM_FAILURE_WINDOW_MS;
    const nextCount = withinWindow ? current.count + 1 : 1;
    practicePrewarmFailureRef.current = {
      count: nextCount,
      firstFailureAt: withinWindow ? current.firstFailureAt : now,
    };

    if (nextCount >= PRACTICE_PREWARM_FAILURE_LIMIT) {
      setPracticePrewarmBlocked(true);
      setPracticeRetryError("练习题生成多次失败，请稍后手动重试。");
    }
  }, []);

  const handlePracticeToolAction = useCallback(() => {
    resetPracticePrewarmFailures();
    handlePracticeToolClick();
  }, [handlePracticeToolClick, resetPracticePrewarmFailures]);

  const handleGeneratePracticeManually = useCallback(
    (lesson: Lesson) => {
      resetPracticePrewarmFailures();
      return handleGeneratePractice(lesson);
    },
    [handleGeneratePractice, resetPracticePrewarmFailures],
  );

  const handleRegeneratePracticeManually = useCallback(() => {
    resetPracticePrewarmFailures();
    return handleRegeneratePractice();
  }, [handleRegeneratePractice, resetPracticePrewarmFailures]);

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

  currentTrainingStepRef.current = sceneTrainingState.currentStep;
  variantUnlockedRef.current = variantUnlocked;
  latestPracticeStatusRef.current = latestPracticeSet?.status ?? generatedState.practiceStatus;
  latestVariantStatusRef.current = latestVariantSet?.status ?? generatedState.variantStatus;
  listenStepActionRef.current = handleTrainingListenStep;
  focusExpressionStepActionRef.current = handleTrainingFocusExpressionStep;
  practiceToolActionRef.current = handlePracticeToolAction;
  variantToolActionRef.current = handleVariantToolClick;
  repeatPracticeActionRef.current = handleRepeatPractice;
  repeatVariantsActionRef.current = handleRepeatVariants;

  useEffect(() => {
    const currentStep = trainingState?.session?.currentStep;
    const scheduleKey = baseLesson
      ? `scene-practice-prewarm:${baseLesson.id}:${currentStep ?? "none"}`
      : "";
    if (
      !baseLesson ||
      (currentStep !== "practice_sentence" && currentStep !== "scene_practice") ||
      generatedState.practiceStatus !== "idle" ||
      practiceLoading ||
      practicePrewarmBlocked
    ) {
      if (scheduleKey) {
        cancelScheduledIdleAction(scheduleKey);
      }
      return;
    }
    scheduleIdleAction(scheduleKey, () => {
      void prewarmPractice(baseLesson).then((result) => {
        if (result) {
          resetPracticePrewarmFailures();
          return;
        }
        registerPracticePrewarmFailure();
      });
    });
    return () => {
      cancelScheduledIdleAction(scheduleKey);
    };
  }, [
    baseLesson,
    generatedState.practiceStatus,
    practicePrewarmBlocked,
    practiceLoading,
    prewarmPractice,
    registerPracticePrewarmFailure,
    resetPracticePrewarmFailures,
    trainingState?.session?.currentStep,
  ]);

  useEffect(() => {
    const currentStep = trainingState?.session?.currentStep;
    const scheduleKey = baseLesson
      ? `scene-variant-prewarm:${baseLesson.id}:${currentStep ?? "none"}`
      : "";
    if (
      !baseLesson ||
      (currentStep !== "scene_practice" && currentStep !== "done") ||
      generatedState.variantStatus !== "idle" ||
      variantsLoading
    ) {
      if (scheduleKey) {
        cancelScheduledIdleAction(scheduleKey);
      }
      return;
    }
    scheduleIdleAction(scheduleKey, () => {
      void prewarmVariants();
    });
    return () => {
      cancelScheduledIdleAction(scheduleKey);
    };
  }, [
    baseLesson,
    generatedState.variantStatus,
    prewarmVariants,
    trainingState?.session?.currentStep,
    variantsLoading,
  ]);

  useEffect(() => {
    if (!baseLesson || !latestVariantSet) return;
    let cancelled = false;

    void (async () => {
      const applyVariantRun = (result: SceneVariantRunResponse) => {
        if (!result.run) return;
        hydrateVariantSetFromRun(baseLesson.id, latestVariantSet.id, result.run);
        refreshGeneratedState(baseLesson.id);
        if (!activeVariantId && !searchParams.get("variant") && result.run.activeVariantId) {
          setActiveVariantId(result.run.activeVariantId);
        }
      };

      const cache = await getSceneVariantRunCache(baseLesson.slug, latestVariantSet.id);
      if (!cancelled && cache.found && cache.record && !cache.isExpired) {
        applyVariantRun(cache.record.data.snapshot);
        return;
      }

      try {
        const result = await getSceneVariantRunSnapshotFromApi(baseLesson.slug, {
          variantSetId: latestVariantSet.id,
        });
        if (cancelled) return;
        applyVariantRun(result);
        void setSceneVariantRunCache(baseLesson.slug, latestVariantSet.id, result).catch(() => {
          // Ignore cache failures.
        });
      } catch {
        // Non-blocking.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeVariantId,
    baseLesson,
    latestVariantSet?.id,
    refreshGeneratedState,
    searchParams,
    setActiveVariantId,
  ]);

  useEffect(() => {
    if (
      !baseLesson ||
      viewMode !== "variants" ||
      !latestVariantSet ||
      latestVariantSet.status !== "generated"
    ) {
      return;
    }

    void startSceneVariantRunFromApi(baseLesson.slug, {
      variantSetId: latestVariantSet.id,
    })
      .then((result) => {
        void setSceneVariantRunCache(baseLesson.slug, latestVariantSet.id, result).catch(() => {
          // Ignore cache failures.
        });
      })
      .catch(() => {
        // Non-blocking.
      });
  }, [baseLesson, latestVariantSet?.id, latestVariantSet?.status, viewMode]);

  if (sceneLoading) {
    return <SceneDetailSkeleton />;
  }

  if (!baseLesson) {
    return (
      <div className="p-[var(--mobile-adapt-space-sheet)]">
        <div className={`p-[var(--mobile-adapt-space-sheet)] ${APPLE_PANEL_RAISED}`}>
          <p className={APPLE_META_TEXT}>{sceneDetailMessages.notFound}</p>
        </div>
      </div>
    );
  }

  const trainingPanel = (
    <SceneTrainingCoachFloatingEntry
      sceneId={baseLesson.id}
      trainingState={trainingState}
      variantUnlocked={variantUnlocked}
      practiceSetStatus={generatedState.practiceStatus}
      practiceSnapshot={practiceSnapshot}
      practiceModuleCount={latestPracticeSet?.modules?.length ?? 0}
      currentStepActionLabel={currentStepAction.label}
      currentStepActionLoading={currentStepAction.loading}
      onCurrentStepAction={
        currentStepAction.label
          ? () => {
              const currentStep = currentTrainingStepRef.current;
              if (currentStep === "listen") {
                listenStepActionRef.current();
                return;
              }
              if (currentStep === "focus_expression") {
                focusExpressionStepActionRef.current();
                return;
              }
              if (currentStep === "practice_sentence" || currentStep === "scene_practice") {
                if (latestPracticeStatusRef.current === "completed") {
                  repeatPracticeActionRef.current();
                  return;
                }
                practiceToolActionRef.current();
                return;
              }
              if (currentStep === "done" || variantUnlockedRef.current) {
                if (latestVariantStatusRef.current === "completed") {
                  repeatVariantsActionRef.current();
                  return;
                }
                variantToolActionRef.current();
                return;
              }
              switch (currentStep) {
                case "listen":
                  listenStepActionRef.current();
                  return;
                default:
                  currentStepAction.onClick?.();
              }
            }
          : null
      }
      currentStepActionDisabled={currentStepAction.disabled}
      practiceStepAction={practiceStepAction}
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

  if (viewMode === "practice") {
    return (
      <ScenePracticeView
          practiceSet={latestPracticeSet}
          practiceSnapshot={practiceSnapshot}
          showAnswerMap={showAnswerMap}
          appleButtonSmClassName={appleButtonSmClassName}
          appleDangerButtonSmClassName={appleDangerButtonSmClassName}
          labels={{
            ...sceneViewLabels.practice,
            complete: "完成本轮练习",
          }}
          onBack={() => setViewModeWithRoute("scene")}
          onDelete={handleDeletePracticeSet}
          onRegenerate={() => void handleRegeneratePracticeManually()}
          onComplete={() => {
            const shouldNotifyMilestone = !sceneRawCompletedMap.scene_practice;
            if (!latestPracticeSet) {
              if (shouldNotifyMilestone) {
                notifySceneMilestone("scene_practice", baseLesson.title);
              }
              handleMarkPracticeComplete();
              return;
            }
            void completeScenePracticeRunFromApi(baseLesson.slug, {
              practiceSetId: latestPracticeSet.id,
            })
              .then((result) => {
                setPracticeSnapshot((current) => {
                  const next =
                    current
                      ? {
                          ...current,
                          run: result.run,
                        }
                      : {
                          run: result.run,
                          latestAttempt: null,
                          summary: {
                            completedModeCount: result.run.completedModes.length,
                            totalAttemptCount: 0,
                            correctAttemptCount: 0,
                            latestAssessmentLevel: null,
                          },
                        };
                  void setScenePracticeSnapshotCache(baseLesson.slug, latestPracticeSet.id, next).catch(() => {
                    // Ignore cache failures.
                  });
                  return next;
                });
              })
              .catch(() => {
              // Non-blocking.
              });
            if (shouldNotifyMilestone) {
              notifySceneMilestone("scene_practice", baseLesson.title);
            }
            handleMarkPracticeComplete();
          }}
          onSentenceCompleted={handleSentenceCompleted}
          onPracticeRunStart={(payload) => {
            void startScenePracticeRunFromApi(baseLesson.slug, payload)
              .then((result) => {
                if (
                  (trainingState?.session?.practicedSentenceCount ?? 0) < 1 &&
                  (result.learningState?.session?.practicedSentenceCount ?? 0) >= 1
                ) {
                  notifySceneMilestone("practice_sentence", baseLesson.title);
                }
                if (result.learningState) {
                  handleLearningStateChange(result.learningState);
                }
                setPracticeSnapshot((current) => {
                  const next = {
                    run: result.run,
                    latestAttempt: current?.latestAttempt ?? null,
                    summary: current?.summary ?? {
                      completedModeCount: result.run.completedModes.length,
                      totalAttemptCount: 0,
                      correctAttemptCount: 0,
                      latestAssessmentLevel: null,
                    },
                  };
                  void setScenePracticeSnapshotCache(baseLesson.slug, payload.practiceSetId, next).catch(() => {
                    // Ignore cache failures.
                  });
                  return next;
                });
              })
              .catch(() => {
                // Non-blocking.
              });
          }}
          onPracticeAttempt={(payload) => {
            if (!payload.practiceSetId) return;
            void recordScenePracticeAttemptFromApi(baseLesson.slug, payload)
              .then((result) => {
                if (result.learningState) {
                  handleLearningStateChange(result.learningState);
                }
                setPracticeSnapshot((current) => {
                  const next = {
                    run: result.run,
                    latestAttempt: result.attempt,
                    summary: {
                      completedModeCount: current?.summary.completedModeCount ?? result.run.completedModes.length,
                      totalAttemptCount: (current?.summary.totalAttemptCount ?? 0) + 1,
                      correctAttemptCount:
                        (current?.summary.correctAttemptCount ?? 0) + (result.attempt.isCorrect ? 1 : 0),
                      latestAssessmentLevel: result.attempt.assessmentLevel,
                    },
                  };
                  void setScenePracticeSnapshotCache(baseLesson.slug, payload.practiceSetId, next).catch(() => {
                    // Ignore cache failures.
                  });
                  return next;
                });
              })
              .catch(() => {
                // Non-blocking.
              });
          }}
          onPracticeModeComplete={(payload) => {
            void markScenePracticeModeCompleteFromApi(baseLesson.slug, payload)
              .then((result) => {
                setPracticeSnapshot((current) => {
                  const next = {
                    run: result.run,
                    latestAttempt: current?.latestAttempt ?? null,
                    summary: {
                      completedModeCount: result.run.completedModes.length,
                      totalAttemptCount: current?.summary.totalAttemptCount ?? 0,
                      correctAttemptCount: current?.summary.correctAttemptCount ?? 0,
                      latestAssessmentLevel: current?.summary.latestAssessmentLevel ?? null,
                    },
                  };
                  void setScenePracticeSnapshotCache(baseLesson.slug, payload.practiceSetId, next).catch(() => {
                    // Ignore cache failures.
                  });
                  return next;
                });
              })
              .catch(() => {
                // Non-blocking.
              });
          }}
          onReviewScene={() => setViewModeWithRoute("scene")}
          onRepeatPractice={() => {
            handleRepeatPractice();
          }}
          onOpenVariants={() => setViewModeWithRoute("variants")}
          onToggleAnswer={(exerciseId) =>
            setShowAnswerMap((prev) => ({
              ...prev,
              [exerciseId]: !prev[exerciseId],
            }))
          }
        />
    );
  }

  if (viewMode === "variants") {
    return (
      <SceneVariantsView
          baseLesson={baseLesson}
          variantSet={latestVariantSet}
          expressionMapLoading={expressionMapLoading}
          appleButtonSmClassName={appleButtonSmClassName}
          appleDangerButtonSmClassName={appleDangerButtonSmClassName}
          labels={sceneViewLabels.variants}
          onBack={() => setViewModeWithRoute("scene")}
          onComplete={handleMarkVariantSetComplete}
          onRepeatVariants={handleRepeatVariants}
          onDeleteSet={handleDeleteVariantSet}
          onOpenExpressionMap={() => void handleOpenExpressionMap()}
          onOpenChunk={handleOpenVariantChunk}
          onOpenVariant={handleOpenVariant}
          onDeleteVariant={handleDeleteVariantItem}
          toVariantTitle={toVariantTitle}
          toVariantStatusLabel={toVariantStatusLabel}
          chunkDetailSheet={chunkDetailSheet}
        />
    );
  }

  if (viewMode === "expression-map") {
    return (
      <SceneExpressionMapView
          clusters={expressionMap?.clusters ?? []}
          error={expressionMapError}
          appleButtonSmClassName={appleButtonSmClassName}
          labels={sceneViewLabels.expressionMap}
          onBack={() => setViewModeWithRoute("variants")}
          onOpenExpressionDetail={handleOpenExpressionDetail}
          chunkDetailSheet={chunkDetailSheet}
        />
    );
  }

  if (viewMode === "variant-study" && activeVariantLesson) {
    const variantStudyHeaderTools = (
      <>
        <button
          type="button"
          className={`${appleButtonLgClassName} px-3 py-1.5 disabled:opacity-60`}
          disabled={!canGeneratePractice}
          onClick={() => void handleGeneratePracticeManually(activeVariantLesson)}
        >
          <LoadingContent
            loading={practiceLoading}
            loadingText={formatLoadingText("场景练习准备中...", "中...")}
          >
            基于此变体生成练习
          </LoadingContent>
        </button>
        <button
          type="button"
          className={`${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_LG} px-3 py-1.5`}
          onClick={() => handleDeleteVariantItem(activeVariantLesson.id)}
        >
          删除变体
        </button>
      </>
    );

    return (
      <SceneVariantStudyView
          lesson={activeVariantLesson}
          topRightTool={
            <button
              type="button"
              className={`${appleButtonLgClassName} px-3 py-1.5`}
              onClick={() => setViewModeWithRoute("variants")}
            >
              返回
            </button>
          }
          headerTools={variantStudyHeaderTools}
          savedPhraseTexts={Array.from(savedPhraseTextSet)}
          onSavePhrase={savePhraseForScene}
          onReviewPhrase={savePhraseForScene}
        />
    );
  }

  return (
      <SceneBaseView
        lesson={baseLesson}
        practiceError={practiceRetryError ?? practiceError}
        variantsError={variantsError}
        trainingPanel={trainingPanel}
        headerTools={null}
        headerTitle={baseLesson.subtitle?.trim() || baseLesson.sections[0]?.summary?.trim() || baseLesson.title}
        onBackToList={() => router.push("/scenes")}
        interactionMode="training"
        savedPhraseTexts={Array.from(savedPhraseTextSet)}
        onSavePhrase={savePhraseForScene}
        onReviewPhrase={savePhraseForScene}
        onSceneLoopPlayback={handleSceneFullPlay}
        onChunkEncounter={handleBaseChunkEncounter}
        onSentencePracticeComplete={handleSentenceCompleted}
        chunkDetailSheet={chunkDetailSheet}
      />
  );
}









