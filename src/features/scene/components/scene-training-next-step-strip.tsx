"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Dumbbell, GitBranch } from "lucide-react";
import { LoopActionButton } from "@/components/audio/loop-action-button";
import { formatLoadingText, LoadingContent } from "@/components/shared/action-loading";

export type SceneTrainingStageAction = {
  kind: "practice" | "variants";
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  testId?: string;
};

type SceneTrainingNextStepStripProps = {
  title: string;
  onBack?: () => void;
  supportText: string;
  nextStepLabel: string;
  isSceneLooping: boolean;
  isSceneLoopLoading: boolean;
  onSceneLoopPlayback: () => void;
  currentStepActionLabel: string | null;
  currentStepActionLoading?: boolean;
  onCurrentStepAction?: (() => void) | null;
  currentStepActionDisabled?: boolean;
  progressEntry?: ReactNode;
  stageActions?: SceneTrainingStageAction[];
};

const getStageIcon = (kind: SceneTrainingStageAction["kind"]) =>
  kind === "variants" ? GitBranch : Dumbbell;

export function SceneTrainingNextStepStrip({
  title,
  onBack,
  supportText,
  nextStepLabel,
  isSceneLooping,
  isSceneLoopLoading,
  onSceneLoopPlayback,
  currentStepActionLabel,
  currentStepActionLoading,
  onCurrentStepAction,
  currentStepActionDisabled,
  progressEntry,
  stageActions = [],
}: SceneTrainingNextStepStripProps) {
  const [cardLifted, setCardLifted] = useState(false);
  const cardLiftTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cardLiftTimerRef.current !== null) {
        window.clearTimeout(cardLiftTimerRef.current);
      }
    };
  }, []);

  const handleCurrentStepAction = () => {
    setCardLifted(true);
    if (cardLiftTimerRef.current !== null) {
      window.clearTimeout(cardLiftTimerRef.current);
    }
    cardLiftTimerRef.current = window.setTimeout(() => {
      setCardLifted(false);
      cardLiftTimerRef.current = null;
    }, 220);
    onCurrentStepAction?.();
  };

  return (
    <section
      aria-label="当前下一步"
      className={`rounded-[24px] border border-white/30 bg-[var(--app-scene-panel-bg)] p-[var(--mobile-adapt-space-xl)] shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-[10px] transition-transform duration-200 ease-out ${
        cardLifted ? "-translate-y-1" : "translate-y-0"
      }`}
    >
      <div className="mb-[var(--mobile-adapt-space-sm)] grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[var(--mobile-adapt-space-sm)]">
        {onBack ? (
          <button
            type="button"
            aria-label="返回场景列表"
            className="-ml-2 inline-flex size-8 items-center justify-center rounded-full border-0 bg-transparent text-[var(--app-scene-panel-muted)] transition-colors hover:bg-[var(--app-button-secondary-bg)]/55 hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <span className="size-4" aria-hidden="true" />
        )}
        <div className="min-w-0 text-center">
          <h1 className="truncate text-[length:var(--mobile-adapt-font-title-sm)] font-bold text-foreground">
            {title}
          </h1>
        </div>
        {progressEntry ? (
          <span className="-mr-2 inline-flex size-8 items-center justify-center text-[var(--app-scene-panel-muted)]">
            {progressEntry}
          </span>
        ) : (
          <span className="size-4" aria-hidden="true" />
        )}
      </div>

      <p className="mb-[var(--mobile-adapt-space-xl)] text-[length:var(--mobile-adapt-font-body-sm)] leading-6 text-[var(--app-scene-panel-muted)]">
        {supportText}
        <br />
        <strong className="font-semibold text-foreground">下一步：</strong> {nextStepLabel}
      </p>

      <div className="grid grid-cols-2 gap-[var(--mobile-adapt-space-sm)]">
        <LoopActionButton
          active={isSceneLooping}
          loading={isSceneLoopLoading}
          label="循环播放"
          activeLabel="循环播放"
          loadingLabel="循环播放"
          variant="secondary"
          size="default"
          surface="soft"
          icon="loop"
          iconOnly={false}
          className="inline-flex min-h-[var(--mobile-adapt-button-height)] w-full items-center justify-center gap-[var(--mobile-adapt-space-sm)] rounded-[14px] border-0 bg-[#E5E5EA] px-[var(--mobile-adapt-space-lg)] py-[var(--mobile-adapt-space-md)] text-[length:var(--mobile-adapt-font-body-sm)] font-semibold text-foreground transition-transform active:scale-[0.97]"
          iconClassName="size-4"
          onClick={onSceneLoopPlayback}
        />
        {currentStepActionLabel && onCurrentStepAction ? (
          <button
            type="button"
            aria-label="执行当前下一步"
            className="inline-flex min-h-[var(--mobile-adapt-button-height)] w-full items-center justify-center rounded-[14px] border-0 bg-[var(--app-scene-panel-accent)] px-[var(--mobile-adapt-space-lg)] py-[var(--mobile-adapt-space-md)] text-[length:var(--mobile-adapt-font-body-sm)] font-semibold text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--app-scene-panel-accent)_30%,transparent)] transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-[var(--app-scene-panel-cta-disabled)] disabled:text-white/80 disabled:shadow-none"
            disabled={currentStepActionDisabled}
            onClick={handleCurrentStepAction}
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

      {stageActions.length > 0 ? (
        <div
          aria-label="阶段入口"
          className={`mt-[var(--mobile-adapt-space-sm)] grid gap-[var(--mobile-adapt-space-sm)] ${
            stageActions.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {stageActions.map((action) => {
            const Icon = getStageIcon(action.kind);
            return (
              <button
                key={action.kind}
                type="button"
                className="inline-flex min-h-[var(--mobile-adapt-button-height)] w-full items-center justify-center gap-[var(--mobile-adapt-space-sm)] rounded-[14px] border-0 bg-[#E5E5EA] px-[var(--mobile-adapt-space-lg)] py-[var(--mobile-adapt-space-md)] text-[length:var(--mobile-adapt-font-body-sm)] font-semibold text-foreground transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={action.disabled}
                onClick={action.onClick}
                data-testid={action.testId}
              >
                <Icon className="size-4" />
                <LoadingContent
                  loading={Boolean(action.loading)}
                  loadingText={action.loadingLabel ?? formatLoadingText(action.label, "中...")}
                >
                  {action.label}
                </LoadingContent>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
