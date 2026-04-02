"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { formatLoadingText, LoadingContent } from "@/components/shared/action-loading";
import type { ScenePracticeSnapshotResponse, SceneLearningProgressResponse } from "@/lib/utils/learning-api";
import {
  deriveSceneTrainingCompletedMap,
  deriveSceneTrainingState,
  deriveSceneTrainingStatsSummary,
} from "./scene-detail-selectors";
import { getSceneTrainingNextStep, getSceneTrainingStepTitle, sceneDetailMessages } from "./scene-detail-messages";

export function SceneTrainingCoachFloatingEntry({
  sceneId,
  trainingState,
  variantUnlocked,
  practiceSetStatus,
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
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") {
      return { x: 0, y: 116 };
    }
    return {
      x: Math.max(8, window.innerWidth - 152 - 8),
      y: 116,
    };
  });
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
  const overlayDismissBlockedUntilRef = useRef(0);

  const session = trainingState?.session;
  const viewportWidth = viewportSize.width || (typeof window === "undefined" ? 390 : window.innerWidth);
  const viewportHeight =
    viewportSize.height || (typeof window === "undefined" ? 844 : window.innerHeight);
  const positionStorageKey = `scene-training-fab-position:v3:${sceneId}`;
  const viewportGap = 8;
  const topGap = 88;
  const fabWidth = fabSize.width;
  const fabHeight = fabSize.height;
  const panelWidth = Math.min(
    viewportWidth - viewportGap * 2,
    viewportWidth < 640 ? Math.max(304, Math.floor(viewportWidth * 0.84)) : 344,
  );
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
    [
      normalizedTrainingState.progressPercent,
      practiceModuleCount,
      practiceSnapshot,
      rawCompletedMap,
      session,
    ],
  );

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
      y: 116,
    };
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition) as { x?: number; y?: number };
        const parsedX =
          typeof parsed.x === "number" && parsed.x >= viewportWidth / 2
            ? parsed.x
            : fallbackPosition.x;
        setPosition(
          clampPosition({
            x: parsedX,
            y: typeof parsed.y === "number" ? parsed.y : fallbackPosition.y,
          }),
        );
        return;
      } catch {
        // Ignore invalid cached position.
      }
    }
    setPosition(clampPosition(fallbackPosition));
  }, [clampPosition, fabWidth, positionStorageKey, viewportGap, viewportWidth]);

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
    [clampPosition],
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

      setPanelOpen((prev) => {
        if (!prev) {
          overlayDismissBlockedUntilRef.current = Date.now() + 240;
        }
        return !prev;
      });
      resetDragState();
    },
    [clampPosition, clearDragTimer, fabWidth, resetDragState, viewportGap, viewportWidth],
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
    <>
      {panelOpen ? (
        <button
          type="button"
          aria-label="关闭训练面板遮罩"
          className="fixed inset-0 z-40 border-0 bg-[rgba(242,242,247,0.42)] backdrop-blur-[4px]"
          onClick={() => {
            if (Date.now() < overlayDismissBlockedUntilRef.current) {
              return;
            }
            setPanelOpen(false);
          }}
        />
      ) : null}
      <div
        className="fixed z-50"
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
            aria-expanded={panelOpen}
            data-testid="scene-training-fab"
            className="inline-flex min-h-[var(--mobile-adapt-overlay-trigger-height)] min-w-[var(--mobile-adapt-overlay-trigger-width)] items-center gap-[var(--mobile-adapt-space-sm)] rounded-[var(--mobile-adapt-overlay-trigger-radius)] border border-[var(--app-scene-panel-border)] bg-[var(--app-scene-panel-bg)] px-[var(--mobile-adapt-space-md)] py-[var(--mobile-adapt-space-sm)] text-left shadow-[var(--app-scene-panel-shadow)] backdrop-blur-[18px] transition-transform duration-150"
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
            <span className="inline-flex size-[var(--mobile-adapt-overlay-trigger-dot)] shrink-0 items-center justify-center rounded-full bg-[var(--app-scene-panel-accent-soft)]">
              <span className="size-[var(--mobile-adapt-overlay-trigger-dot-inner)] rounded-full bg-[var(--app-scene-panel-accent)]" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-none">
              <span className="text-[length:var(--mobile-adapt-overlay-meta)] font-medium text-[var(--app-scene-panel-muted)]">本轮训练</span>
              <span className="mt-1 truncate text-[length:var(--mobile-adapt-font-body-sm)] font-semibold text-foreground">
                {collapsedStepLabel}
              </span>
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-[var(--app-scene-panel-muted)] transition-transform duration-200 ${
                panelOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {panelOpen ? (
            <div
              className="absolute flex flex-col overflow-hidden rounded-[var(--mobile-adapt-overlay-radius)] border border-[var(--app-scene-panel-border)] bg-[var(--app-scene-panel-bg)] shadow-[var(--app-scene-panel-shadow)] backdrop-blur-[20px] saturate-[1.8]"
              style={{
                left: `${panelLeft}px`,
                top: `${panelTop}px`,
                width: `${panelWidth}px`,
                maxHeight: `${panelMaxHeight}px`,
              }}
            >
              <div className="flex shrink-0 items-center justify-between gap-[var(--mobile-adapt-space-md)] px-[var(--mobile-adapt-space-sheet)] pt-[var(--mobile-adapt-space-sheet)]">
                <p className="text-[length:var(--mobile-adapt-overlay-title)] font-bold text-foreground">
                  {sceneDetailMessages.trainingPanelTitle}
                </p>
                <button
                  type="button"
                  aria-label="收起训练面板"
                  className="inline-flex size-[var(--mobile-adapt-overlay-close-size)] shrink-0 items-center justify-center rounded-full text-[var(--app-scene-panel-muted)] transition-colors hover:bg-[var(--app-button-secondary-bg)]/55 hover:text-foreground"
                  onClick={() => setPanelOpen(false)}
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-[var(--mobile-adapt-space-sheet)] pb-[var(--mobile-adapt-space-sheet)] pt-[var(--mobile-adapt-space-sheet)]">
                <div className="relative flex flex-col gap-[var(--mobile-adapt-space-md)]">
                  <div className="pointer-events-none absolute bottom-[10px] left-[11px] top-[10px] w-[2px] bg-[var(--app-scene-panel-track)]" />
                  <div className="space-y-[var(--mobile-adapt-space-md)]">
                    {normalizedTrainingState.stepStates.map((step, index) => {
                      const done = step.status === "done";
                      const active = step.status === "current";
                      const showPracticeStepAction =
                        done && step.key === "scene_practice" && practiceStepAction;
                      return (
                        <div
                          key={step.key}
                          className={`relative z-[1] flex items-center gap-[var(--mobile-adapt-space-md)] ${
                            active
                              ? "-ml-[var(--mobile-adapt-space-sm)] rounded-[var(--mobile-adapt-overlay-step-radius)] bg-[var(--app-scene-panel-accent-soft)] px-[var(--mobile-adapt-space-md)] py-[var(--mobile-adapt-space-sm)]"
                              : "px-0 py-[var(--mobile-adapt-space-2xs)]"
                          }`}
                        >
                          <div
                            className={`relative shrink-0 ${
                              active
                                ? "inline-flex size-[var(--mobile-adapt-overlay-step-indicator)] items-center justify-center rounded-full bg-[var(--app-scene-panel-accent-soft)]"
                                : "inline-flex size-[var(--mobile-adapt-overlay-step-indicator)] items-center justify-center"
                            }`}
                          >
                            {done ? (
                              <span className="inline-flex size-[var(--mobile-adapt-overlay-step-indicator)] items-center justify-center rounded-full bg-[var(--app-scene-status-completed)] text-[length:var(--mobile-adapt-font-meta)] font-semibold text-white">
                                <Check className="size-3.5" />
                              </span>
                            ) : active ? (
                              <span className="size-[var(--mobile-adapt-overlay-step-dot)] rounded-full border-[var(--mobile-adapt-overlay-step-dot-ring)] border-[var(--app-scene-panel-accent-soft)] bg-[var(--app-scene-panel-accent)] box-content" />
                            ) : (
                              <span className="size-[var(--mobile-adapt-overlay-step-pending)] rounded-full border-2 border-[var(--app-scene-panel-pending-border)] bg-[var(--app-button-secondary-bg)]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <span
                              className={`block text-[length:var(--mobile-adapt-overlay-body)] ${
                                done
                                  ? "text-[var(--app-scene-panel-muted)] line-through"
                                  : active
                                    ? "font-bold text-foreground"
                                    : "text-[var(--app-scene-panel-muted)] opacity-60"
                              }`}
                            >
                              {active ? `${index + 1}. ${step.title}` : step.title}
                            </span>
                            {showPracticeStepAction ? (
                              <button
                                type="button"
                                className="mt-[var(--mobile-adapt-space-sm)] inline-flex min-h-8 items-center rounded-full border border-[var(--app-button-secondary-border)] bg-[var(--app-button-secondary-bg)] px-[var(--mobile-adapt-space-md)] py-[var(--mobile-adapt-space-2xs)] text-[length:var(--mobile-adapt-font-meta)] font-medium text-[var(--app-button-secondary-text)] transition-all duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-[var(--mobile-adapt-space-sheet)] border-t border-[var(--app-border-soft)] pt-[var(--mobile-adapt-space-xl)]">
                  <p className="text-[length:var(--mobile-adapt-overlay-meta)] leading-[1.4] text-[var(--app-scene-panel-muted)]">
                    整段播放 {statsSummary.fullPlayCount} 次 · 重点表达 {statsSummary.openedExpressionCount} 个 · 已记录练习句数 {statsSummary.practicedSentenceCount} 句
                  </p>
                  <p className="mt-1 text-[length:var(--mobile-adapt-overlay-meta)] leading-[1.4] text-[var(--app-scene-panel-muted)]">
                    练习模块 {statsSummary.practiceModuleCompleted}/1 · 作答 {statsSummary.practiceAttemptCount} 次 · <span className="font-semibold text-foreground">{sceneDetailMessages.panelProgressLabel} {statsSummary.progressPercent}%</span>
                  </p>
                </div>
              </div>

              <div className="shrink-0 px-[var(--mobile-adapt-space-sheet)] pb-[var(--mobile-adapt-space-sheet)]">
                {currentStepActionLabel && onCurrentStepAction ? (
                  <button
                    type="button"
                    className="inline-flex min-h-[var(--mobile-adapt-button-height)] w-full items-center justify-center rounded-[14px] border-0 bg-[var(--app-scene-panel-accent)] px-[var(--mobile-adapt-space-xl)] py-[var(--mobile-adapt-space-md)] text-[length:var(--mobile-adapt-font-sheet-body)] font-semibold text-white shadow-[0_4px_15px_color-mix(in_srgb,var(--app-scene-panel-accent)_30%,transparent)] transition-all duration-200 active:scale-[0.96] active:opacity-80 disabled:cursor-not-allowed disabled:bg-[var(--app-scene-panel-cta-disabled)] disabled:text-white/80 disabled:shadow-none"
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
                <p className="mt-[var(--mobile-adapt-space-sm)] text-center text-[length:var(--mobile-adapt-font-meta)] text-[var(--app-scene-panel-muted)]">
                  下一步：{nextStepLabel}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
