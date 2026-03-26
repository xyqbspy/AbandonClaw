"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { formatLoadingText, LoadingContent, LoadingState } from "@/components/shared/action-loading";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SceneExpressionMapView } from "@/features/scene/components/scene-expression-map-view";
import { ScenePracticeView } from "@/features/scene/components/scene-practice-view";
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
  startScenePracticeRunFromApi,
  startSceneVariantRunFromApi,
} from "@/lib/utils/learning-api";
import {
  APPLE_BODY_TEXT,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_PANEL_RAISED,
  APPLE_TITLE_MD,
  APPLE_BUTTON_TEXT_LG,
  APPLE_BUTTON_TEXT_SM,
} from "@/lib/ui/apple-style";
import { cancelScheduledIdleAction, scheduleIdleAction } from "@/lib/utils/resource-actions";
import { getPracticeModeLabel } from "@/lib/shared/scene-training-copy";

import { useSceneDetailActions } from "./use-scene-detail-actions";
import { SceneBaseView } from "./scene-base-view";
import { toVariantStatusLabel, toVariantTitle } from "./scene-detail-logic";
import {
  getSceneTrainingCurrentStepSupportText,
  getSceneTrainingNextStep,
  getSceneTrainingStepTitle,
  SCENE_TRAINING_STEPS,
  sceneDetailMessages,
  TrainingStepKey,
} from "./scene-detail-messages";
import {
  notifySceneExpressionFocused,
  notifySceneFocusStepHint,
  notifySceneLoadError,
  notifySceneLoopPrompt,
  notifySceneMilestone,
  notifyScenePhraseAlreadySaved,
  notifyScenePhraseSaved,
  notifyScenePhraseSaveFailed,
  notifySceneSentencePracticed,
  notifySceneSentenceStepHint,
  notifySceneSessionCompleted,
} from "./scene-detail-notify";
import {
  deriveSceneTrainingCompletedMap,
  deriveSceneTrainingState,
  deriveSceneTrainingStatsSummary,
} from "./scene-detail-selectors";
import { useSceneDetailData } from "./use-scene-detail-data";
import { useSceneDetailPlayback } from "./use-scene-detail-playback";
import { useSceneDetailRouteState } from "./use-scene-detail-route-state";
import { useSceneLearningSync } from "./use-scene-learning-sync";
import { SceneVariantStudyView } from "./scene-variant-study-view";

const appleButtonSmClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;
const appleDangerButtonSmClassName = `${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`;
const trainingStatusDoneClassName =
  "inline-flex items-center gap-1 rounded-[var(--app-radius-pill)] border border-emerald-700/12 bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-700";
const trainingStatusCurrentClassName = `rounded-[var(--app-radius-pill)] bg-[var(--app-surface-hover)] px-2 py-1 text-xs ${APPLE_BODY_TEXT}`;
const trainingStatusPendingClassName = `rounded-[var(--app-radius-pill)] bg-transparent px-2 py-1 text-xs ${APPLE_META_TEXT}`;

type SavePhrasePayload = {
  text: string;
  translation?: string;
  usageNote?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
};

function SceneTrainingCoachFloatingEntry({
  sceneId,
  trainingState,
  variantUnlocked,
  practiceSetStatus,
  practiceModeKey,
  practiceSnapshot,
  practiceModuleCount,
  currentStepActionLabel,
  currentStepActionLoading,
  onCurrentStepAction,
  currentStepActionDisabled,
  practiceStepAction,
}: {
  sceneId: string;
  trainingState: SceneLearningProgressResponse | null;
  variantUnlocked: boolean;
  practiceSetStatus: "idle" | "generated" | "completed";
  practiceModeKey?: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation" | null;
  practiceSnapshot: ScenePracticeSnapshotResponse | null;
  practiceModuleCount: number;
  currentStepActionLabel: string | null;
  currentStepActionLoading?: boolean;
  onCurrentStepAction?: (() => void) | null;
  currentStepActionDisabled?: boolean;
  practiceStepAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  } | null;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  }));
  const [fabSize, setFabSize] = useState({ width: 152, height: 44 });
  const iconButtonRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    activated: boolean;
    cancelled: boolean;
    timer: number | null;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
    activated: false,
    cancelled: false,
    timer: null,
  });

  const session = trainingState?.session;
  const progress = trainingState?.progress;
  const viewportWidth = viewportSize.width || (typeof window === "undefined" ? 390 : window.innerWidth);
  const viewportHeight =
    viewportSize.height || (typeof window === "undefined" ? 844 : window.innerHeight);
  const positionStorageKey = `scene-training-fab-position:${sceneId}`;
  const viewportGap = 12;
  const topGap = 88;
  const fabWidth = fabSize.width;
  const fabHeight = fabSize.height;
  const panelWidth = Math.min(viewportWidth - viewportGap * 2, viewportWidth < 640 ? 288 : 332);
  const panelMaxHeight = Math.max(260, viewportHeight - topGap - viewportGap * 2);

  const rawCompletedMap = useMemo(
    () =>
      deriveSceneTrainingCompletedMap({
        session,
        practiceSetStatus,
        practiceSnapshot,
        variantUnlocked,
      }),
    [practiceSetStatus, practiceSnapshot, session, variantUnlocked],
  );

  const normalizedTrainingState = useMemo(() => {
    const derived = deriveSceneTrainingState(rawCompletedMap);
    return {
      ...derived,
      nextStep: getSceneTrainingNextStep(derived.currentStep),
    };
  }, [rawCompletedMap]);

  const nextStepLabel =
    normalizedTrainingState.nextStep === "done"
      ? getSceneTrainingStepTitle("done")
      : normalizedTrainingState.nextStep
        ? getSceneTrainingStepTitle(normalizedTrainingState.nextStep)
        : rawCompletedMap.done
          ? "本轮训练已完成"
          : "继续当前步骤";
  const collapsedStepLabel = getSceneTrainingStepTitle(normalizedTrainingState.currentStep);

  const statsSummary = useMemo(
    () =>
      deriveSceneTrainingStatsSummary({
        session,
        completedMap: rawCompletedMap,
        practiceSnapshot,
        practiceModuleCount,
        progressPercent: normalizedTrainingState.progressPercent,
      }),
    [normalizedTrainingState.progressPercent, practiceModuleCount, practiceSnapshot, rawCompletedMap, session],
  );

  const currentStepSupportText = useMemo(() => {
    const normalizedPracticeModeKey = practiceSnapshot?.run?.currentMode ?? practiceModeKey ?? null;
    return getSceneTrainingCurrentStepSupportText({
      currentStep: normalizedTrainingState.currentStep,
      practiceModeLabel: getPracticeModeLabel(normalizedPracticeModeKey),
      practiceModeKey: normalizedPracticeModeKey,
      practiceAttemptCount: practiceSnapshot?.summary.totalAttemptCount ?? 0,
    });
  }, [
    normalizedTrainingState.currentStep,
    practiceModeKey,
    practiceSnapshot?.run?.currentMode,
    practiceSnapshot?.summary.totalAttemptCount,
  ]);

  const clampPosition = useCallback(
    (nextPosition: { x: number; y: number }) => {
      return {
        x: Math.min(
          Math.max(viewportGap, nextPosition.x),
          Math.max(viewportGap, viewportWidth - fabWidth - viewportGap),
        ),
        y: Math.min(
          Math.max(topGap, nextPosition.y),
          Math.max(topGap, viewportHeight - fabHeight - viewportGap),
        ),
      };
    },
    [fabHeight, fabWidth, viewportHeight, viewportWidth],
  );

  const clearDragTimer = useCallback(() => {
    if (dragStateRef.current.timer !== null) {
      window.clearTimeout(dragStateRef.current.timer);
      dragStateRef.current.timer = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    clearDragTimer();
    dragStateRef.current.pointerId = null;
    dragStateRef.current.moved = false;
    dragStateRef.current.activated = false;
    dragStateRef.current.cancelled = false;
    setDragActive(false);
  }, [clearDragTimer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedPosition = window.localStorage.getItem(positionStorageKey);
    const fallbackPosition = {
      x: Math.max(viewportGap, window.innerWidth - fabWidth - viewportGap),
      y: 124,
    };
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition) as { x?: number; y?: number };
        setPosition(
          clampPosition({
            x: typeof parsed.x === "number" ? parsed.x : fallbackPosition.x,
            y: typeof parsed.y === "number" ? parsed.y : fallbackPosition.y,
          }),
        );
        return;
      } catch {
        // Ignore invalid cached position.
      }
    }
    setPosition(clampPosition(fallbackPosition));
  }, [clampPosition, fabWidth, positionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(positionStorageKey, JSON.stringify(position));
  }, [position, positionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateFabSize = () => {
      const nextWidth = iconButtonRef.current?.offsetWidth ?? 152;
      const nextHeight = iconButtonRef.current?.offsetHeight ?? 44;
      setFabSize((currentSize) =>
        currentSize.width === nextWidth && currentSize.height === nextHeight
          ? currentSize
          : { width: nextWidth, height: nextHeight },
      );
    };
    updateFabSize();
    const handleResize = () => {
      updateFabSize();
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
      setPosition((currentPosition) => clampPosition(currentPosition));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [clampPosition]);

  useEffect(() => {
    const nextWidth = iconButtonRef.current?.offsetWidth;
    const nextHeight = iconButtonRef.current?.offsetHeight;
    if (!nextWidth || !nextHeight) return;
    setFabSize((currentSize) =>
      currentSize.width === nextWidth && currentSize.height === nextHeight
        ? currentSize
        : { width: nextWidth, height: nextHeight },
    );
  }, [collapsedStepLabel]);

  useEffect(() => () => clearDragTimer(), [clearDragTimer]);

  const showPanelOnLeft =
    position.x + fabWidth + 8 + panelWidth > viewportWidth - viewportGap;
  const rawPanelLeft = showPanelOnLeft ? -(panelWidth + 8) : fabWidth + 8;
  const minPanelLeft = viewportGap - position.x;
  const maxPanelLeft = viewportWidth - viewportGap - panelWidth - position.x;
  const panelLeft = Math.min(Math.max(rawPanelLeft, minPanelLeft), Math.max(minPanelLeft, maxPanelLeft));
  const desiredPanelTop = Math.min(
    Math.max(position.y - 8, topGap),
    Math.max(topGap, viewportHeight - panelMaxHeight - viewportGap),
  );
  const minPanelTop = topGap - position.y;
  const maxPanelTop = viewportHeight - viewportGap - panelMaxHeight - position.y;
  const panelTop = Math.min(
    Math.max(desiredPanelTop - position.y, minPanelTop),
    Math.max(minPanelTop, maxPanelTop),
  );
  const handleIconPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
        moved: false,
        activated: false,
        cancelled: false,
        timer: window.setTimeout(() => {
          if (dragStateRef.current.pointerId !== event.pointerId) return;
          dragStateRef.current.activated = true;
          setDragActive(true);
          if (typeof iconButtonRef.current?.setPointerCapture === "function") {
            iconButtonRef.current.setPointerCapture(event.pointerId);
          }
        }, 180),
      };
    },
    [position.x, position.y],
  );

  const handleIconPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (dragStateRef.current.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;

      if (!dragStateRef.current.activated) {
        return;
      }

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragStateRef.current.moved = true;
      }
      event.preventDefault();
      setPosition(
        clampPosition({
          x: dragStateRef.current.originX + deltaX,
          y: dragStateRef.current.originY + deltaY,
        }),
      );
    },
    [clampPosition, clearDragTimer],
  );

  const handleIconPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (dragStateRef.current.cancelled) {
        resetDragState();
        return;
      }
      if (dragStateRef.current.pointerId !== event.pointerId) return;
      const { activated, moved } = dragStateRef.current;
      clearDragTimer();

      if (activated && typeof event.currentTarget.releasePointerCapture === "function") {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (activated && moved) {
        setPosition((currentPosition) => {
          const snappedX =
            currentPosition.x + fabWidth / 2 < viewportWidth / 2
              ? viewportGap
              : Math.max(viewportGap, viewportWidth - fabWidth - viewportGap);
          return clampPosition({
            x: snappedX,
            y: currentPosition.y,
          });
        });
        resetDragState();
        return;
      }

      setPanelOpen((prev) => !prev);
      resetDragState();
    },
    [
      clampPosition,
      clearDragTimer,
      resetDragState,
      fabWidth,
      viewportWidth,
    ],
  );

  const handleIconPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      clearDragTimer();
      if (
        dragStateRef.current.activated &&
        typeof event.currentTarget.releasePointerCapture === "function"
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      resetDragState();
    },
    [clearDragTimer, resetDragState],
  );

  return (
    <div
      className="fixed z-40"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="relative">
        <button
          ref={iconButtonRef}
          type="button"
          aria-label="训练进度入口"
          data-testid="scene-training-fab"
          className={`inline-flex min-h-11 items-center gap-2 px-3 py-2 text-left backdrop-blur transition-transform duration-150 ${APPLE_PANEL_RAISED}`}
          style={{
            minHeight: `${fabHeight}px`,
            touchAction: "none",
            transform: dragActive ? "scale(1.08)" : "scale(1)",
          }}
          onPointerDown={handleIconPointerDown}
          onPointerMove={handleIconPointerMove}
          onPointerUp={handleIconPointerUp}
          onPointerCancel={handleIconPointerCancel}
        >
          <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
          <span className="flex flex-col leading-none">
            <span className={APPLE_META_TEXT}>当前</span>
            <span className={`mt-1 ${APPLE_BODY_TEXT} font-medium`}>
              {collapsedStepLabel}
            </span>
          </span>
          <ChevronDown className={`size-4 ${APPLE_META_TEXT}`} />
        </button>

        {panelOpen ? (
          <div
            className={`absolute flex flex-col overflow-hidden backdrop-blur sm:rounded-3xl ${APPLE_PANEL_RAISED}`}
            style={{
              left: `${panelLeft}px`,
              top: `${panelTop}px`,
              width: `${panelWidth}px`,
              maxHeight: `${panelMaxHeight}px`,
            }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-3 pt-3 sm:px-4 sm:pt-4">
              <div className="space-y-1">
                <p className={APPLE_TITLE_MD}>
                  {sceneDetailMessages.trainingPanelTitle}
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭训练面板"
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full ${APPLE_META_TEXT} transition-colors hover:bg-[var(--app-surface-hover)] hover:text-foreground`}
                onClick={() => setPanelOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
              <div className={`px-3 py-3.5 ${APPLE_PANEL}`}>
                <p className={APPLE_META_TEXT}>
                  {sceneDetailMessages.currentStepLabel}
                </p>
                <p className={`mt-1 ${APPLE_TITLE_MD}`}>
                  {getSceneTrainingStepTitle(normalizedTrainingState.currentStep)}
                </p>
                <p className={`mt-2 ${APPLE_META_TEXT}`}>
                  {sceneDetailMessages.nextStepPrefix}
                  {nextStepLabel}
                </p>
                <p className={`mt-2 leading-5 ${APPLE_META_TEXT}`}>
                  {currentStepSupportText}
                </p>
              </div>

              <div className={`mt-3 px-3 py-3 sm:mt-4 ${APPLE_PANEL}`}>
                <p className={APPLE_META_TEXT}>{sceneDetailMessages.trainingStepsLabel}</p>
                <div className="mt-2 space-y-1.5">
                  {normalizedTrainingState.stepStates.map((step, index) => {
                    const done = step.status === "done";
                    const active = step.status === "current";
                    const showPracticeStepAction = done && step.key === "scene_practice" && practiceStepAction;
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center justify-between gap-2 rounded-[var(--app-radius-card)] px-2.5 py-2 ${APPLE_PANEL}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={APPLE_META_TEXT}>
                            {index + 1}.
                          </span>
                          <span
                            className={
                              active
                                ? `${APPLE_BODY_TEXT} font-medium`
                                : APPLE_BODY_TEXT
                            }
                          >
                            {step.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {showPracticeStepAction ? (
                              <button
                                type="button"
                                className={`inline-flex min-h-8 items-center ${APPLE_BUTTON_BASE} px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50`}
                                disabled={practiceStepAction.disabled}
                                onClick={() => {
                                  practiceStepAction.onClick();
                                }}
                              >
                                <LoadingContent
                                  loading={Boolean(practiceStepAction.loading)}
                                  loadingText={formatLoadingText(practiceStepAction.label, "中...")}
                                >
                                  {practiceStepAction.label}
                                </LoadingContent>
                              </button>
                          ) : null}
                          <span
                            className={
                              done
                                ? trainingStatusDoneClassName
                                : active
                                  ? trainingStatusCurrentClassName
                                  : trainingStatusPendingClassName
                            }
                          >
                            {done ? (
                              <>
                                <Check className="size-3" />
                                {sceneDetailMessages.stepDone}
                              </>
                            ) : active ? (
                              sceneDetailMessages.stepCurrent
                            ) : (
                              sceneDetailMessages.stepPending
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`shrink-0 border-t border-[var(--app-border-soft)] px-3 pb-3 pt-3 sm:px-4 sm:pb-4 ${APPLE_META_TEXT}`}>
              <div className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${APPLE_META_TEXT}`}>
                <span>整段播放 {statsSummary.fullPlayCount}</span>
                <span>重点表达 {statsSummary.openedExpressionCount}</span>
                <span>核心句 {statsSummary.practicedSentenceCount}</span>
                <span>练习模块 {statsSummary.practiceModuleCompleted}/1</span>
                <span>练习层 {statsSummary.practiceModesCompleted}/{statsSummary.practiceModeCount}</span>
                <span>作答 {statsSummary.practiceAttemptCount}</span>
                <span>{sceneDetailMessages.panelProgressLabel} {statsSummary.progressPercent}%</span>
              </div>
              {currentStepActionLabel && onCurrentStepAction ? (
                <button
                  type="button"
                  className={`mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-[var(--app-radius-card)] px-3 py-2 text-sm font-medium ${APPLE_BUTTON_STRONG} disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[var(--app-surface-hover)] disabled:text-[var(--muted-foreground)]`}
                  disabled={currentStepActionDisabled}
                  onClick={() => {
                    onCurrentStepAction();
                  }}
                >
                  <LoadingContent
                    loading={Boolean(currentStepActionLoading)}
                    loadingText={formatLoadingText(currentStepActionLabel, "中...")}
                  >
                    {currentStepActionLabel}
                  </LoadingContent>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  const sceneMilestoneToastRef = useRef<Set<TrainingStepKey>>(new Set());
  const sceneMilestoneInitializedRef = useRef(false);
  const currentTrainingStepRef = useRef<TrainingStepKey | "done">("listen");
  const variantUnlockedRef = useRef(false);
  const latestPracticeStatusRef = useRef<"idle" | "generated" | "completed">("idle");
  const latestVariantStatusRef = useRef<"idle" | "generated" | "completed">("idle");
  const listenStepActionRef = useRef<() => unknown>(() => undefined);
  const focusExpressionStepActionRef = useRef<() => unknown>(() => undefined);
  const practiceSentenceStepActionRef = useRef<() => unknown>(() => undefined);
  const practiceToolActionRef = useRef<() => unknown>(() => undefined);
  const variantToolActionRef = useRef<() => unknown>(() => undefined);
  const repeatPracticeActionRef = useRef<() => unknown>(() => undefined);
  const repeatVariantsActionRef = useRef<() => unknown>(() => undefined);
  const [trainingState, setTrainingState] = useState<SceneLearningProgressResponse | null>(null);
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
      notifySceneSessionCompleted();
    }
    sessionDoneRef.current = nextDone;
    if ((nextState.session?.openedExpressionCount ?? 0) > 0) {
      focusExpressionPromptShownRef.current = true;
    }
    setTrainingState(nextState);
  }, []);

  useSceneLearningSync({
    baseLesson,
    viewMode,
    activeVariantId,
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
    sceneMilestoneToastRef.current = new Set();
    sceneMilestoneInitializedRef.current = false;
    setTrainingState(null);
    setPracticeSnapshot(null);
    setViewResetVersion((current) => current + 1);
  };

  useEffect(() => {
    if (!baseLesson || !latestPracticeSet) {
      setPracticeSnapshot(null);
      return;
    }
    let cancelled = false;
    void getScenePracticeSnapshotFromApi(baseLesson.slug, {
      practiceSetId: latestPracticeSet.id,
    })
      .then((result) => {
        if (cancelled) return;
        setPracticeSnapshot(result);
      })
      .catch(() => {
        if (cancelled) return;
        setPracticeSnapshot(null);
      });
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
    if (!sceneMilestoneInitializedRef.current) {
      (Object.keys(sceneRawCompletedMap) as TrainingStepKey[]).forEach((key) => {
        if (sceneRawCompletedMap[key]) {
          sceneMilestoneToastRef.current.add(key);
        }
      });
      sceneMilestoneInitializedRef.current = true;
      return;
    }

    (Object.keys(sceneRawCompletedMap) as TrainingStepKey[]).forEach((key) => {
      if (!sceneRawCompletedMap[key]) return;
      if (sceneMilestoneToastRef.current.has(key)) return;
      sceneMilestoneToastRef.current.add(key);
      notifySceneMilestone(key, baseLesson.title);
    });
  }, [baseLesson, sceneRawCompletedMap]);

  const handleSceneFullPlay = useCallback(() => {
    if (!baseLesson) return;
    notifySceneLoopPrompt();
    void recordSceneTrainingEventFromApi(baseLesson.slug, {
      event: "full_play",
    })
      .then(handleLearningStateChange)
      .catch(() => {
        // Non-blocking.
      });
  }, [baseLesson, handleLearningStateChange]);

  const handleBaseChunkEncounter = useCallback(
    (payload: {
      lesson: Lesson;
      sentence: import("@/lib/types").LessonSentence;
      chunkText: string;
      blockId?: string;
      source?: "direct" | "related";
    }) => {
      if (payload.lesson.slug !== baseLesson?.slug) return;
      if (payload.source !== "related" && !focusExpressionPromptShownRef.current) {
        notifySceneExpressionFocused();
        focusExpressionPromptShownRef.current = true;
      }
      void recordSceneTrainingEventFromApi(payload.lesson.slug, {
        event: "open_expression",
        selectedBlockId: payload.blockId,
      })
        .then(handleLearningStateChange)
        .catch(() => {
          // Non-blocking.
        });
    },
    [baseLesson?.slug, handleLearningStateChange],
  );

  const handleSentencePracticed = useCallback(() => {
    if (!baseLesson) return;
    notifySceneSentencePracticed();
    void recordSceneTrainingEventFromApi(baseLesson.slug, {
      event: "practice_sentence",
    })
      .then(handleLearningStateChange)
      .catch(() => {
        // Non-blocking.
      });
  }, [baseLesson, handleLearningStateChange]);

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

  const handleTrainingListenStep = useCallback(() => {
    handleSceneFullPlay();
  }, [handleSceneFullPlay]);

  const handleTrainingFocusExpressionStep = useCallback(() => {
    notifySceneFocusStepHint();
  }, []);

  const handleTrainingPracticeSentenceStep = useCallback(() => {
    notifySceneSentenceStepHint();
  }, []);

  const currentStepAction = useMemo(() => {
    const currentStep = sceneTrainingState.currentStep;
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
    if (currentStep === "practice_sentence") {
      return {
        label: "去练核心句",
        onClick: handleTrainingPracticeSentenceStep,
        disabled: false,
      };
    }
    if (currentStep === "scene_practice") {
      const practiceSetStatus = latestPracticeSet?.status ?? generatedState.practiceStatus;
      return {
        label:
          practiceSetStatus === "completed"
            ? "再练场景练习"
            : practiceSetStatus === "generated"
              ? "开始场景练习"
            : practiceLoading
              ? "练习准备中..."
              : "生成并开始练习",
        onClick: () => {
          if (practiceSetStatus === "completed") {
            handleRepeatPractice();
            return;
          }
          handlePracticeToolClick();
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
    handlePracticeToolClick,
    handleRepeatPractice,
    handleRepeatVariants,
    handleTrainingFocusExpressionStep,
    handleTrainingListenStep,
    handleTrainingPracticeSentenceStep,
    handleVariantToolClick,
    practiceLoading,
    sceneTrainingState.currentStep,
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
  practiceSentenceStepActionRef.current = handleTrainingPracticeSentenceStep;
  practiceToolActionRef.current = handlePracticeToolClick;
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
      practiceLoading
    ) {
      if (scheduleKey) {
        cancelScheduledIdleAction(scheduleKey);
      }
      return;
    }
    scheduleIdleAction(scheduleKey, () => {
      void prewarmPractice(baseLesson);
    });
    return () => {
      cancelScheduledIdleAction(scheduleKey);
    };
  }, [
    baseLesson,
    generatedState.practiceStatus,
    practiceLoading,
    prewarmPractice,
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

    void getSceneVariantRunSnapshotFromApi(baseLesson.slug, {
      variantSetId: latestVariantSet.id,
    })
      .then((result) => {
        if (cancelled || !result.run) return;
        hydrateVariantSetFromRun(baseLesson.id, latestVariantSet.id, result.run);
        refreshGeneratedState(baseLesson.id);
        if (!activeVariantId && !searchParams.get("variant") && result.run.activeVariantId) {
          setActiveVariantId(result.run.activeVariantId);
        }
      })
      .catch(() => {
        // Non-blocking.
      });

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
    }).catch(() => {
      // Non-blocking.
    });
  }, [baseLesson, latestVariantSet?.id, latestVariantSet?.status, viewMode]);

  if (sceneLoading) {
    return <LoadingState text={sceneDetailMessages.loading} className="p-4" />;
  }

  if (!baseLesson) {
    return (
      <div className="p-4">
        <div className={`p-4 ${APPLE_PANEL_RAISED}`}>
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
      practiceModeKey={latestPracticeSet?.mode ?? null}
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
              if (currentStep === "practice_sentence") {
                practiceSentenceStepActionRef.current();
                return;
              }
              if (currentStep === "scene_practice") {
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
          onComplete={() => {
            if (!latestPracticeSet) {
              handleMarkPracticeComplete();
              return;
            }
            void completeScenePracticeRunFromApi(baseLesson.slug, {
              practiceSetId: latestPracticeSet.id,
            })
              .then((result) => {
                setPracticeSnapshot((current) =>
                  current
                    ? {
                        ...current,
                        run: result.run,
                      }
                    : { run: result.run, latestAttempt: null, summary: { completedModeCount: result.run.completedModes.length, totalAttemptCount: 0, correctAttemptCount: 0, latestAssessmentLevel: null } },
                );
              })
              .catch(() => {
              // Non-blocking.
              });
            handleMarkPracticeComplete();
          }}
          onSentencePracticed={handleSentencePracticed}
          onPracticeRunStart={(payload) => {
            void startScenePracticeRunFromApi(baseLesson.slug, payload)
              .then((result) => {
                setPracticeSnapshot((current) => ({
                  run: result.run,
                  latestAttempt: current?.latestAttempt ?? null,
                  summary: current?.summary ?? {
                    completedModeCount: result.run.completedModes.length,
                    totalAttemptCount: 0,
                    correctAttemptCount: 0,
                    latestAssessmentLevel: null,
                  },
                }));
              })
              .catch(() => {
                // Non-blocking.
              });
          }}
          onPracticeAttempt={(payload) => {
            if (!payload.practiceSetId) return;
            void recordScenePracticeAttemptFromApi(baseLesson.slug, payload)
              .then((result) => {
                setPracticeSnapshot((current) => ({
                  run: result.run,
                  latestAttempt: result.attempt,
                  summary: {
                    completedModeCount: current?.summary.completedModeCount ?? result.run.completedModes.length,
                    totalAttemptCount: (current?.summary.totalAttemptCount ?? 0) + 1,
                    correctAttemptCount:
                      (current?.summary.correctAttemptCount ?? 0) + (result.attempt.isCorrect ? 1 : 0),
                    latestAssessmentLevel: result.attempt.assessmentLevel,
                  },
                }));
              })
              .catch(() => {
                // Non-blocking.
              });
          }}
          onPracticeModeComplete={(payload) => {
            void markScenePracticeModeCompleteFromApi(baseLesson.slug, payload)
              .then((result) => {
                setPracticeSnapshot((current) => ({
                  run: result.run,
                  latestAttempt: current?.latestAttempt ?? null,
                  summary: {
                    completedModeCount: result.run.completedModes.length,
                    totalAttemptCount: current?.summary.totalAttemptCount ?? 0,
                    correctAttemptCount: current?.summary.correctAttemptCount ?? 0,
                    latestAssessmentLevel: current?.summary.latestAssessmentLevel ?? null,
                  },
                }));
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
          onClick={() => handleGeneratePractice(activeVariantLesson)}
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
        practiceError={practiceError}
        variantsError={variantsError}
        trainingPanel={trainingPanel}
        headerTools={null}
        interactionMode="training"
        savedPhraseTexts={Array.from(savedPhraseTextSet)}
        onSavePhrase={savePhraseForScene}
        onReviewPhrase={savePhraseForScene}
        onSceneLoopPlayback={handleSceneFullPlay}
        onChunkEncounter={handleBaseChunkEncounter}
        onSentencePracticeComplete={handleSentencePracticed}
        chunkDetailSheet={chunkDetailSheet}
      />
  );
}





