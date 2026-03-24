"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SceneExpressionMapView } from "@/features/scene/components/scene-expression-map-view";
import { ScenePracticeView } from "@/features/scene/components/scene-practice-view";
import { SceneVariantsView } from "@/features/scene/components/scene-variants-view";
import { sceneViewLabels } from "@/features/scene/components/scene-view-labels";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { Lesson } from "@/lib/types";
import { savePhraseFromApi } from "@/lib/utils/phrases-api";
import {
  recordSceneTrainingEventFromApi,
  SceneLearningProgressResponse,
} from "@/lib/utils/learning-api";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_BUTTON_TEXT_LG,
  APPLE_BUTTON_TEXT_SM,
} from "@/lib/ui/apple-style";

import { useSceneDetailActions } from "./use-scene-detail-actions";
import { SceneBaseView } from "./scene-base-view";
import { toVariantStatusLabel, toVariantTitle } from "./scene-detail-logic";
import { useSceneDetailData } from "./use-scene-detail-data";
import { useSceneDetailPlayback } from "./use-scene-detail-playback";
import { useSceneDetailRouteState } from "./use-scene-detail-route-state";
import { useSceneLearningSync } from "./use-scene-learning-sync";
import { SceneVariantStudyView } from "./scene-variant-study-view";

const appleButtonSmClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;
const appleDangerButtonSmClassName = `${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`;

type SavePhrasePayload = {
  text: string;
  translation?: string;
  usageNote?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
};

type TrainingStepKey =
  | "listen"
  | "focus_expression"
  | "practice_sentence"
  | "scene_practice"
  | "done";

const trainingStepMeta: Array<{
  key: TrainingStepKey;
  title: string;
}> = [
  { key: "listen", title: "听熟这段" },
  { key: "focus_expression", title: "看 1 个重点表达" },
  { key: "practice_sentence", title: "练 1 句核心句" },
  { key: "scene_practice", title: "开始背这段" },
  { key: "done", title: "解锁变体" },
];

const getTrainingStepTitle = (step: TrainingStepKey | null | undefined) =>
  trainingStepMeta.find((item) => item.key === step)?.title ?? "听熟这段";

const getNextTrainingStep = (step: TrainingStepKey | null | undefined): TrainingStepKey | null => {
  if (!step || step === "listen") return "focus_expression";
  if (step === "focus_expression") return "practice_sentence";
  if (step === "practice_sentence") return "scene_practice";
  if (step === "scene_practice") return "done";
  return null;
};

function SceneTrainingProgressPanel(_props: {
  sceneId: string;
  trainingState: SceneLearningProgressResponse | null;
  practiceButtonLabel: string;
  variantUnlocked: boolean;
  onPrimaryAction: () => void;
}) {
  return null;
}

type TrainingCoachActionV3 = {
  label: string;
  onClick: () => void;
};

const TRAINING_STEP_META_V3: Array<{
  key: TrainingStepKey;
  title: string;
}> = [
  { key: "listen", title: "听熟这段" },
  { key: "focus_expression", title: "看 1 个重点表达" },
  { key: "practice_sentence", title: "练 1 句核心句" },
  { key: "scene_practice", title: "开始背这段" },
  { key: "done", title: "解锁变体" },
];

const getTrainingStepTitleV3 = (step: TrainingStepKey | null | undefined) =>
  TRAINING_STEP_META_V3.find((item) => item.key === step)?.title ?? "听熟这段";

const getNextTrainingStepV3 = (
  step: TrainingStepKey | null | undefined,
): TrainingStepKey | null => {
  if (!step || step === "listen") return "focus_expression";
  if (step === "focus_expression") return "practice_sentence";
  if (step === "practice_sentence") return "scene_practice";
  if (step === "scene_practice") return "done";
  return null;
};

function SceneTrainingCoachFloatingEntry({
  sceneId,
  trainingState,
  variantUnlocked,
  onListenStep,
  onFocusExpressionStep,
  onPracticeSentenceStep,
  onScenePracticeStep,
  onDoneStep,
}: {
  sceneId: string;
  trainingState: SceneLearningProgressResponse | null;
  variantUnlocked: boolean;
  onListenStep: () => void;
  onFocusExpressionStep: () => void;
  onPracticeSentenceStep: () => void;
  onScenePracticeStep: () => void;
  onDoneStep: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  }));
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
  const currentStep = session?.currentStep ?? "listen";
  const nextStep = getNextTrainingStepV3(currentStep);
  const positionStorageKey = `scene-training-fab-position:${sceneId}`;
  const iconSize = 44;
  const viewportGap = 12;
  const topGap = 88;
  const panelWidth = viewportSize.width > 0 && viewportSize.width < 640 ? 288 : 332;
  const panelHeight = 404;

  const completedKeys = useMemo(() => {
    const keys = new Set<TrainingStepKey>();
    if ((session?.fullPlayCount ?? 0) >= 1) keys.add("listen");
    if ((session?.openedExpressionCount ?? 0) >= 1) keys.add("focus_expression");
    if ((session?.practicedSentenceCount ?? 0) >= 1) keys.add("practice_sentence");
    if (session?.scenePracticeCompleted) keys.add("scene_practice");
    if (variantUnlocked || session?.isDone) keys.add("done");
    return keys;
  }, [session, variantUnlocked]);

  const clampPosition = useCallback(
    (nextPosition: { x: number; y: number }) => {
      const width = viewportSize.width || (typeof window === "undefined" ? 390 : window.innerWidth);
      const height =
        viewportSize.height || (typeof window === "undefined" ? 844 : window.innerHeight);
      return {
        x: Math.min(
          Math.max(viewportGap, nextPosition.x),
          Math.max(viewportGap, width - iconSize - viewportGap),
        ),
        y: Math.min(
          Math.max(topGap, nextPosition.y),
          Math.max(topGap, height - iconSize - viewportGap),
        ),
      };
    },
    [viewportSize.height, viewportSize.width],
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
      x: Math.max(viewportGap, window.innerWidth - iconSize - viewportGap),
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
  }, [clampPosition, positionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(positionStorageKey, JSON.stringify(position));
  }, [position, positionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
      setPosition((currentPosition) => clampPosition(currentPosition));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [clampPosition]);

  useEffect(() => () => clearDragTimer(), [clearDragTimer]);

  const coachAction = useMemo<TrainingCoachActionV3 | null>(() => {
    if (currentStep === "listen") {
      return {
        label: "先听这段",
        onClick: onListenStep,
      };
    }
    if (currentStep === "focus_expression") {
      return {
        label: "看 1 个重点表达",
        onClick: onFocusExpressionStep,
      };
    }
    if (currentStep === "practice_sentence") {
      return null;
    }
    if (currentStep === "scene_practice") {
      return {
        label: "开始背这段",
        onClick: onScenePracticeStep,
      };
    }
    return {
      label: variantUnlocked ? "去练变体" : "完成本轮训练",
      onClick: onDoneStep,
    };
  }, [
    currentStep,
    onDoneStep,
    onFocusExpressionStep,
    onListenStep,
    onPracticeSentenceStep,
    onScenePracticeStep,
    variantUnlocked,
  ]);

  const feedbackSummary = useMemo(() => {
    const openedExpressionCount = session?.openedExpressionCount ?? 0;
    const practicedSentenceCount = session?.practicedSentenceCount ?? 0;
    const fullPlayCount = session?.fullPlayCount ?? 0;
    const masteryPercent = progress?.masteryPercent ?? 0;
    if (currentStep === "listen") {
      return {
        headline: "先把整段听顺",
        detail: fullPlayCount > 0 ? `已完整播放 ${fullPlayCount} 次` : "先完整播放 1 次",
        metric: `当前进度 ${masteryPercent}%`,
      };
    }
    if (currentStep === "focus_expression") {
      return {
        headline: "先抓 1 个重点表达",
        detail: openedExpressionCount > 0 ? `已抓到 ${openedExpressionCount} 个训练支点` : "还没打开重点表达",
        metric: `当前进度 ${masteryPercent}%`,
      };
    }
    if (currentStep === "practice_sentence") {
      return {
        headline: "先练 1 句核心句",
        detail: "这一步放在下方训练栏完成",
        metric: practicedSentenceCount > 0 ? `已练 ${practicedSentenceCount} 次` : "还没开始练",
      };
    }
    if (currentStep === "scene_practice") {
      return {
        headline: "可以开始背这段了",
        detail: practicedSentenceCount > 0 ? "核心句已完成，进入整段训练" : "先完成核心句，再进入整段训练",
        metric: `当前进度 ${masteryPercent}%`,
      };
    }
    return {
      headline: variantUnlocked ? "主场景这一轮已完成" : "这轮训练已收口",
      detail: variantUnlocked ? "可以进入变体训练" : "可以结束本轮训练",
      metric: `当前进度 ${masteryPercent}%`,
    };
  }, [
    currentStep,
    progress?.masteryPercent,
    session?.fullPlayCount,
    session?.openedExpressionCount,
    session?.practicedSentenceCount,
    variantUnlocked,
  ]);

  const showPanelOnLeft =
    position.x + iconSize + 8 + panelWidth > (viewportSize.width || panelWidth + iconSize + 40);
  const panelLeft = showPanelOnLeft ? -(panelWidth + 8) : iconSize + 8;
  const desiredPanelTop = Math.min(
    Math.max(position.y - 8, topGap),
    Math.max(
      topGap,
      (viewportSize.height || panelHeight + topGap + viewportGap) - panelHeight - viewportGap,
    ),
  );
  const panelTop = desiredPanelTop - position.y;
  const nextStepLabel =
    nextStep === "done"
      ? "解锁变体"
      : nextStep
        ? getTrainingStepTitleV3(nextStep)
        : variantUnlocked
          ? "去练变体"
          : "本轮训练已完成";

  const handleIconPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
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
          const width =
            viewportSize.width || (typeof window === "undefined" ? 390 : window.innerWidth);
          const snappedX =
            currentPosition.x + iconSize / 2 < width / 2
              ? viewportGap
              : Math.max(viewportGap, width - iconSize - viewportGap);
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
      panelOpen,
      resetDragState,
      viewportSize.width,
    ],
  );

  const handleIconPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
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
          className="inline-flex size-11 items-center justify-center rounded-full border border-black/10 bg-white/94 shadow-[0_8px_20px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-150"
          style={{
            touchAction: "pan-y",
            transform: dragActive ? "scale(1.08)" : "scale(1)",
          }}
          onPointerDown={handleIconPointerDown}
          onPointerMove={handleIconPointerMove}
          onPointerUp={handleIconPointerUp}
          onPointerCancel={handleIconPointerCancel}
        >
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>

        {panelOpen ? (
          <div
            className="absolute rounded-[24px] border border-black/8 bg-white/96 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.12)] backdrop-blur sm:rounded-3xl sm:p-4"
            style={{
              left: `${panelLeft}px`,
              top: `${panelTop}px`,
              width: `${panelWidth}px`,
            }}
          >
            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-foreground sm:text-base">本轮训练</p>
            </div>

            <div className="mt-3 rounded-[22px] bg-black/[0.03] px-3 py-3.5 sm:mt-4">
              <p className="text-[13px] text-muted-foreground sm:text-sm">当前步骤</p>
              <p className="mt-1 text-[18px] font-semibold text-foreground sm:text-[20px]">
                {getTrainingStepTitleV3(currentStep)}
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground sm:text-sm">
                下一步：{nextStepLabel}
              </p>
              <p className="mt-3 text-[13px] text-foreground sm:text-sm">{feedbackSummary.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                {feedbackSummary.metric}
              </p>

              {coachAction ? (
                <button
                  type="button"
                  className={`${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM} mt-3 w-full px-3 py-2`}
                  onClick={() => {
                    setPanelOpen(false);
                    coachAction.onClick();
                  }}
                >
                  {coachAction.label}
                </button>
              ) : (
                <p className="mt-3 text-[13px] font-medium text-foreground sm:text-sm">
                  先在下方训练栏练 1 句核心句
                </p>
              )}
            </div>

            <div className="mt-3 rounded-[22px] bg-black/[0.03] px-3 py-3 sm:mt-4">
              <p className="text-xs text-muted-foreground">训练步骤</p>
              <div className="mt-2 space-y-1.5">
                {TRAINING_STEP_META_V3.map((step, index) => {
                  const done = completedKeys.has(step.key);
                  const active = !done && currentStep === step.key;
                  return (
                    <div
                      key={step.key}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-black/[0.03] px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground sm:text-sm">
                          {index + 1}.
                        </span>
                        <span
                          className={
                            active
                              ? "text-[13px] font-medium text-foreground sm:text-sm"
                              : "text-[13px] text-foreground sm:text-sm"
                          }
                        >
                          {step.title}
                        </span>
                      </div>
                      <span
                        className={
                          done
                            ? "inline-flex items-center gap-1 rounded-full bg-[rgb(22,163,74)]/10 px-2 py-1 text-xs text-[rgb(21,128,61)]"
                            : active
                              ? "rounded-full bg-black/6 px-2 py-1 text-xs text-foreground"
                              : "rounded-full bg-transparent px-2 py-1 text-xs text-muted-foreground"
                        }
                      >
                        {done ? (
                          <>
                            <Check className="size-3" />
                            已完成
                          </>
                        ) : active ? (
                          "当前"
                        ) : (
                          "待完成"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 border-t border-black/6 pt-3 text-[13px] text-muted-foreground sm:mt-4 sm:text-sm">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/85">
                <span>整段播放 {session?.fullPlayCount ?? 0}</span>
                <span>重点表达 {session?.openedExpressionCount ?? 0}</span>
                <span>核心句 {session?.practicedSentenceCount ?? 0}</span>
                <span>进度 {progress?.masteryPercent ?? 0}%</span>
              </div>
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
  const [trainingState, setTrainingState] = useState<SceneLearningProgressResponse | null>(null);
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
      toast.success("杩欐浠婂ぉ宸茬粡璁ょ湡缁冭繃涓€杞簡");
    }
    sessionDoneRef.current = nextDone;
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
    handleVariantToolClick,
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
    setTrainingState(null);
    setViewResetVersion((current) => current + 1);
  };

  const handleSceneFullPlay = useCallback(() => {
    if (!baseLesson) return;
    toast.message("鍏堟妸杩欐鍚『");
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
    }) => {
      if (payload.lesson.slug !== baseLesson?.slug) return;
      toast.message("先抓一个重点表达");
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
    toast.success("这句已经练过了");
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
          toast.message("璇ョ煭璇凡鍦ㄦ敹钘忎腑");
          return;
        }
        toast.success("已收藏短语");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "鏀惰棌鐭澶辫触");
      });
  }, [baseLesson, savePhraseForScene, variantChunkDetail, variantChunkSentence]);

  useEffect(() => {
    if (!baseLesson) return;
    refreshGeneratedState(baseLesson.id);
  }, [baseLesson, refreshGeneratedState, viewResetVersion]);

  useEffect(() => {
    if (!loadErrorMessage) return;
    toast.error(loadErrorMessage);
  }, [loadErrorMessage]);

  const variantUnlocked = Boolean(trainingState?.progress.variantUnlockedAt);

  const handleTrainingListenStep = useCallback(() => {
    handleSceneFullPlay();
  }, [handleSceneFullPlay]);

  const handleTrainingFocusExpressionStep = useCallback(() => {
    toast.message("先点开一句里的重点短语，再进入下一步。");
  }, []);

  const handleTrainingPracticeSentenceStep = useCallback(() => {
    toast.message("先在下方训练条里练这句。");
  }, []);

  const handleTrainingDoneStep = useCallback(() => {
    if (variantUnlocked) {
      handleVariantToolClick();
      return;
    }
    toast.success("这段今天已经认真练过一轮了。");
  }, [handleVariantToolClick, variantUnlocked]);

  if (sceneLoading) {
    return <div className="p-4 text-sm text-muted-foreground">场景加载中...</div>;
  }

  if (!baseLesson) {
    return <div className="p-4 text-sm text-muted-foreground">场景不存在。</div>;
  }

  const trainingPanel = (
    <SceneTrainingCoachFloatingEntry
      sceneId={baseLesson.id}
      trainingState={trainingState}
      variantUnlocked={variantUnlocked}
      onListenStep={handleTrainingListenStep}
      onFocusExpressionStep={handleTrainingFocusExpressionStep}
      onPracticeSentenceStep={handleTrainingPracticeSentenceStep}
      onScenePracticeStep={handlePracticeToolClick}
      onDoneStep={handleTrainingDoneStep}
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
        showAnswerMap={showAnswerMap}
        appleButtonSmClassName={appleButtonSmClassName}
        appleDangerButtonSmClassName={appleDangerButtonSmClassName}
        labels={{
          ...sceneViewLabels.practice,
          complete: "瀹屾垚鏈疆濉┖",
        }}
        onBack={() => setViewModeWithRoute("scene")}
        onDelete={handleDeletePracticeSet}
        onComplete={handleMarkPracticeComplete}
        onSentencePracticed={handleSentencePracticed}
        onReviewScene={() => setViewModeWithRoute("scene")}
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
          {practiceLoading ? "场景练习准备中..." : "基于此变体生成填空"}
        </button>
        <button
          type="button"
          className={`${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_LG} px-3 py-1.5`}
          onClick={() => handleDeleteVariantItem(activeVariantLesson.id)}
        >
          鍒犻櫎鍙樹綋
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
            杩斿洖
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





