"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { formatLoadingText, LoadingContent } from "@/components/shared/action-loading";
import type { ScenePracticeSnapshotResponse, SceneLearningProgressResponse } from "@/lib/utils/learning-api";
import {
  deriveSceneTrainingCompletedMap,
  deriveSceneTrainingState,
  deriveSceneTrainingStatsSummary,
} from "./scene-detail-selectors";
import { getSceneTrainingNextStep, getSceneTrainingStepTitle, sceneDetailMessages } from "./scene-detail-messages";
import { useSceneTrainingFloatingPosition } from "./use-scene-training-floating-position";

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
  const overlayDismissBlockedUntilRef = useRef(0);

  const session = trainingState?.session;

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

  const {
    dragActive,
    fabHeight,
    handleIconPointerCancel,
    handleIconPointerDown,
    handleIconPointerMove,
    handleIconPointerUp,
    iconButtonRef,
    panelLeft,
    panelMaxHeight,
    panelTop,
    panelWidth,
    position,
  } = useSceneTrainingFloatingPosition({
    sceneId,
    collapsedStepLabel,
    setPanelOpen,
    overlayDismissBlockedUntilRef,
  });

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
