"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, CircleHelp } from "lucide-react";
import { formatLoadingText, LoadingContent } from "@/components/shared/action-loading";
import type { ScenePracticeSnapshotResponse, SceneLearningProgressResponse } from "@/lib/utils/learning-api";
import {
  deriveSceneTrainingCompletedMap,
  deriveSceneTrainingState,
  deriveSceneTrainingStatsSummary,
} from "./scene-detail-selectors";
import { sceneDetailMessages } from "./scene-detail-messages";

export function SceneTrainingCoachFloatingEntry({
  trainingState,
  variantUnlocked,
  practiceSetStatus,
  practiceSnapshot,
  practiceModuleCount,
  practiceStepAction,
}: {
  trainingState: SceneLearningProgressResponse | null;
  variantUnlocked: boolean;
  practiceSetStatus: "idle" | "generated" | "completed";
  practiceSnapshot: ScenePracticeSnapshotResponse | null;
  practiceModuleCount: number;
  practiceStepAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  } | null;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

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
    return deriveSceneTrainingState(rawCompletedMap);
  }, [rawCompletedMap]);

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

  return (
    <>
      {panelOpen ? (
        <button
          type="button"
          aria-label="关闭训练面板遮罩"
          className="fixed inset-0 z-40 border-0 bg-[rgba(242,242,247,0.42)] backdrop-blur-[4px]"
          onClick={() => {
            setPanelOpen(false);
          }}
        />
      ) : null}
      <div
        className="fixed bottom-[calc(var(--mobile-adapt-space-xl)+env(safe-area-inset-bottom))] right-[var(--mobile-adapt-space-xl)] z-50"
      >
        <div className="relative">
          <button
            type="button"
            aria-label="训练进度入口"
            aria-expanded={panelOpen}
            data-testid="scene-training-fab"
            className="inline-flex size-[var(--mobile-adapt-overlay-close-size)] items-center justify-center rounded-full border border-[var(--app-scene-panel-border)] bg-[var(--app-scene-panel-bg)] text-[var(--app-scene-panel-muted)] shadow-[var(--app-scene-panel-shadow)] backdrop-blur-[18px] transition-colors hover:text-foreground"
            onClick={() => setPanelOpen((value) => !value)}
          >
            <CircleHelp className="size-5" />
          </button>

          {panelOpen ? (
            <div
              className="absolute bottom-[calc(100%+var(--mobile-adapt-space-sm))] right-0 flex max-h-[min(664px,calc(100vh-160px))] w-[min(344px,calc(100vw-32px))] flex-col overflow-hidden rounded-[var(--mobile-adapt-overlay-radius)] border border-[var(--app-scene-panel-border)] bg-[var(--app-scene-panel-bg)] shadow-[var(--app-scene-panel-shadow)] backdrop-blur-[20px] saturate-[1.8]"
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

            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
