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
import {
  SCENE_ACTION_BUTTON_LG_CLASSNAME,
  SCENE_ACTION_BUTTON_SM_CLASSNAME,
  SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME,
  SCENE_PAGE_MUTED_TEXT_CLASSNAME,
  SCENE_PAGE_RAISED_SECTION_CLASSNAME,
  SCENE_PAGE_SHEET_PADDING_CLASSNAME,
} from "@/features/scene/components/scene-page-styles";
import { SceneVariantsView } from "@/features/scene/components/scene-variants-view";
import { sceneViewLabels } from "@/features/scene/components/scene-view-labels";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { Lesson } from "@/lib/types";
import type { PracticeAssessmentLevel, PracticeMode } from "@/lib/types/learning-flow";
import { recordClientEvent } from "@/lib/utils/client-events";
import { savePhraseFromApi } from "@/lib/utils/phrases-api";
import { hydrateVariantSetFromRun, savePracticeSet } from "@/lib/utils/scene-learning-flow-storage";
import {
  completeScenePracticeRunFromApi,
  getScenePracticeSetFromApi,
  getScenePracticeSnapshotFromApi,
  getSceneVariantRunSnapshotFromApi,
  markScenePracticeModeCompleteFromApi,
  recordSceneTrainingEventFromApi,
  recordScenePracticeAttemptFromApi,
  ScenePracticeSnapshotResponse,
  SceneLearningProgressResponse,
  SceneVariantRunResponse,
  saveScenePracticeSetFromApi,
  startScenePracticeRunFromApi,
  startSceneVariantRunFromApi,
} from "@/lib/utils/learning-api";
import { cancelScheduledIdleAction, scheduleIdleAction } from "@/lib/utils/resource-actions";
import { useSceneDetailActions } from "./use-scene-detail-actions";
import { SceneBaseView } from "./scene-base-view";
import { toVariantStatusLabel, toVariantTitle } from "./scene-detail-logic";
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
import { useSceneLearningSync } from "./use-scene-learning-sync";
import { SceneVariantStudyView } from "./scene-variant-study-view";

const appleButtonSmClassName = SCENE_ACTION_BUTTON_SM_CLASSNAME;
const appleButtonLgClassName = SCENE_ACTION_BUTTON_LG_CLASSNAME;
const appleDangerButtonSmClassName = SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME;
const PRACTICE_PREWARM_FAILURE_LIMIT = 3;
const PRACTICE_PREWARM_FAILURE_WINDOW_MS = 60_000;
const PRACTICE_RUN_START_DEDUP_MS = 30_000;

const practiceRunStartDedup = new Map<
  string,
  {
    completedAt: number | null;
    promise: Promise<unknown> | null;
  }
>();

export const resetScenePracticeRunStartDedupForTests = () => {
  practiceRunStartDedup.clear();
};

type SavePhrasePayload = {
  text: string;
  translation?: string;
  usageNote?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
};
type PracticeRunStartPayload = {
  practiceSetId: string;
  mode: PracticeMode;
  sourceType: "original" | "variant";
  sourceVariantId?: string | null;
};
type PracticeAttemptPayload = PracticeRunStartPayload & {
  exerciseId: string;
  sentenceId?: string | null;
  userAnswer: string;
  assessmentLevel: PracticeAssessmentLevel;
  isCorrect: boolean;
  metadata?: Record<string, unknown>;
};
type PracticeModeCompletePayload = {
  practiceSetId: string;
  mode: PracticeMode;
  nextMode?: PracticeMode;
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
      const snapshot = getSceneLearningProgressCacheSnapshotSync(sceneSlug);
      setTrainingState(snapshot.found && snapshot.record ? snapshot.record.data.state : null);
    });
    return () => {
      cancelled = true;
    };
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
      practicePrewarmFailureRef.current = {
        count: 0,
        firstFailureAt: null,
      };
      setPracticePrewarmBlocked(false);
      setPracticeRetryError(null);
      setViewResetVersion((current) => current + 1);
    };
  }, [resetChunkDetailState, resetRouteScopedState]);

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

  const handlePracticeRunStart = useCallback(
    (payload: PracticeRunStartPayload) => {
      if (!baseLesson) return;
      const runKey = [
        baseLesson.slug,
        payload.practiceSetId,
        payload.mode,
        payload.sourceType,
        payload.sourceVariantId ?? "",
      ].join(":");
      const currentDedup = practiceRunStartDedup.get(runKey);
      const now = Date.now();
      if (currentDedup?.promise) return;
      if (
        currentDedup?.completedAt &&
        now - currentDedup.completedAt < PRACTICE_RUN_START_DEDUP_MS
      ) {
        return;
      }

      const matchingPracticeSet =
        latestPracticeSet?.id === payload.practiceSetId ? latestPracticeSet : null;
      const runPromise = (matchingPracticeSet
        ? saveScenePracticeSetFromApi(baseLesson.slug, {
            practiceSet: matchingPracticeSet,
            replaceExisting: false,
          }).then(() => undefined)
        : Promise.resolve()
      )
        .then(() => startScenePracticeRunFromApi(baseLesson.slug, payload))
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
        .then(() => {
          practiceRunStartDedup.set(runKey, {
            completedAt: Date.now(),
            promise: null,
          });
        })
        .catch(() => {
          practiceRunStartDedup.delete(runKey);
          // Non-blocking.
        });

      practiceRunStartDedup.set(runKey, {
        completedAt: null,
        promise: runPromise,
      });
    },
    [
      baseLesson,
      handleLearningStateChange,
      latestPracticeSet,
      trainingState?.session?.practicedSentenceCount,
    ],
  );

  const handlePracticeComplete = useCallback(() => {
    if (!baseLesson) return;
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
  }, [
    baseLesson,
    handleMarkPracticeComplete,
    latestPracticeSet,
    sceneRawCompletedMap.scene_practice,
  ]);

  const handlePracticeAttempt = useCallback(
    (payload: PracticeAttemptPayload) => {
      if (!baseLesson || !payload.practiceSetId) return;
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
    },
    [baseLesson, handleLearningStateChange],
  );

  const handlePracticeModeComplete = useCallback(
    (payload: PracticeModeCompletePayload) => {
      if (!baseLesson) return;
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
    },
    [baseLesson],
  );

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
    if (!baseLesson || !latestVariantSetId) return;
    let cancelled = false;

    void (async () => {
      const applyVariantRun = (result: SceneVariantRunResponse) => {
        if (!result.run) return;
        hydrateVariantSetFromRun(baseLesson.id, latestVariantSetId, result.run);
        refreshGeneratedState(baseLesson.id);
        if (!activeVariantId && !searchParams.get("variant") && result.run.activeVariantId) {
          setActiveVariantId(result.run.activeVariantId);
        }
      };

      const cache = await getSceneVariantRunCache(baseLesson.slug, latestVariantSetId);
      if (!cancelled && cache.found && cache.record && !cache.isExpired) {
        applyVariantRun(cache.record.data.snapshot);
        return;
      }

      try {
        const result = await getSceneVariantRunSnapshotFromApi(baseLesson.slug, {
          variantSetId: latestVariantSetId,
        });
        if (cancelled) return;
        applyVariantRun(result);
        void setSceneVariantRunCache(baseLesson.slug, latestVariantSetId, result).catch(() => {
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
    latestVariantSetId,
    refreshGeneratedState,
    searchParams,
    setActiveVariantId,
  ]);

  useEffect(() => {
    if (
      !baseLesson ||
      viewMode !== "variants" ||
      !latestVariantSetId ||
      latestVariantSetStatus !== "generated"
    ) {
      return;
    }

    void startSceneVariantRunFromApi(baseLesson.slug, {
      variantSetId: latestVariantSetId,
    })
      .then((result) => {
        void setSceneVariantRunCache(baseLesson.slug, latestVariantSetId, result).catch(() => {
          // Ignore cache failures.
        });
      })
      .catch(() => {
        // Non-blocking.
      });
  }, [baseLesson, latestVariantSetId, latestVariantSetStatus, viewMode]);

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
      onCurrentStepAction={currentStepAction.onClick}
      currentStepActionDisabled={currentStepAction.disabled}
      practiceStepAction={practiceStepAction}
    />
  );

  const trainingNextStep = (
    <SceneTrainingNextStepStrip
      trainingState={trainingState}
      variantUnlocked={variantUnlocked}
      practiceSetStatus={generatedState.practiceStatus}
      practiceSnapshot={practiceSnapshot}
      currentStepActionLabel={currentStepAction.label}
      currentStepActionLoading={currentStepAction.loading}
      onCurrentStepAction={currentStepAction.onClick}
      currentStepActionDisabled={currentStepAction.disabled}
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
        regenerating={practiceLoading}
        onBack={handleBackToSceneView}
        onDelete={handleDeletePracticeSet}
        onRegenerate={handleRegeneratePracticeFromView}
        onComplete={handlePracticeComplete}
        onSentenceCompleted={handleSentenceCompleted}
        onPracticeRunStart={handlePracticeRunStart}
        onPracticeAttempt={handlePracticeAttempt}
        onPracticeModeComplete={handlePracticeModeComplete}
        onReviewScene={handleBackToSceneView}
        onRepeatPractice={handleRepeatPractice}
        onOpenVariants={handleOpenVariantsView}
        onToggleAnswer={handleTogglePracticeAnswer}
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
        onBack={handleBackToSceneView}
        onComplete={handleMarkVariantSetComplete}
        onRepeatVariants={handleRepeatVariants}
        onDeleteSet={handleDeleteVariantSet}
        onOpenExpressionMap={handleOpenExpressionMapView}
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
        onBack={handleOpenVariantsView}
        onOpenExpressionDetail={handleOpenExpressionDetail}
        chunkDetailSheet={chunkDetailSheet}
      />
    );
  }

  if (viewMode === "variant-study" && activeVariantLesson) {
    const variantStudyHeaderTools = (
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
    );
    const variantStudyAuxiliaryTools = (
      <button
        type="button"
        className={`${SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME} px-3 py-1.5`}
        onClick={() => handleDeleteVariantItem(activeVariantItem?.id ?? activeVariantLesson.id)}
      >
        删除变体
      </button>
    );

    return (
      <SceneVariantStudyView
        lesson={activeVariantLesson}
        topRightTool={
          <button
            type="button"
            className={`${appleButtonLgClassName} px-3 py-1.5`}
            onClick={handleOpenVariantsView}
          >
            返回
          </button>
        }
        headerTools={variantStudyHeaderTools}
        auxiliaryTools={variantStudyAuxiliaryTools}
        savedPhraseTexts={Array.from(savedPhraseTextSet)}
        onSavePhrase={savePhraseForScene}
        onReviewPhrase={savePhraseForScene}
        onBlockPlayback={handleBlockPlaybackWarmup}
        onSentencePlayback={handleSentencePlaybackWarmup}
      />
    );
  }

  return (
    <SceneBaseView
      lesson={baseLesson}
      practiceError={practiceRetryError ?? practiceError}
      variantsError={variantsError}
      trainingPanel={trainingPanel}
      trainingNextStep={trainingNextStep}
      headerTools={null}
      headerTitle={baseLesson.subtitle?.trim() || baseLesson.sections[0]?.summary?.trim() || baseLesson.title}
      onBackToList={() => router.push("/scenes")}
      interactionMode="training"
      savedPhraseTexts={Array.from(savedPhraseTextSet)}
      onSavePhrase={savePhraseForScene}
      onReviewPhrase={savePhraseForScene}
      onSceneLoopPlayback={handleSceneFullPlay}
      onBlockPlayback={handleBlockPlaybackWarmup}
      onSentencePlayback={handleSentencePlaybackWarmup}
      onChunkEncounter={handleBaseChunkEncounter}
      onSentencePracticeComplete={handleSentenceCompleted}
      chunkDetailSheet={chunkDetailSheet}
    />
  );
}









