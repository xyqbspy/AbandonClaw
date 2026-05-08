"use client";

import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { LoopActionButton } from "@/components/audio/loop-action-button";
import { formatLoadingText, LoadingContent } from "@/components/shared/action-loading";
import type {
  SceneLearningProgressResponse,
  ScenePracticeSnapshotResponse,
} from "@/lib/utils/learning-api";
import {
  deriveSceneTrainingCompletedMap,
  deriveSceneTrainingState,
} from "./scene-detail-selectors";
import { getSceneTrainingNextStep, getSceneTrainingStepTitle } from "./scene-detail-messages";

type SceneTrainingNextStepStripProps = {
  title: string;
  onBack?: () => void;
  trainingState: SceneLearningProgressResponse | null;
  variantUnlocked: boolean;
  practiceSetStatus: "idle" | "generated" | "completed";
  practiceSnapshot: ScenePracticeSnapshotResponse | null;
  isSceneLooping: boolean;
  isSceneLoopLoading: boolean;
  onSceneLoopPlayback: () => void;
  currentStepActionLabel: string | null;
  currentStepActionLoading?: boolean;
  onCurrentStepAction?: (() => void) | null;
  currentStepActionDisabled?: boolean;
};

const nextStepSupportText = {
  listen: "先把场景听熟一遍，后面提取表达和练习会更顺。",
  focus_expression: "现在先抓住一个重点表达，把它沉淀成后续练习的入口。",
  practice_sentence: "先完成一句复现，再进入整段练习。",
  scene_practice: "接下来进入整段练习，把看懂推进到能复现。",
  done: "本轮基础训练已经闭环，可以继续看变体迁移。",
} as const;

export function SceneTrainingNextStepStrip({
  title,
  onBack,
  trainingState,
  variantUnlocked,
  practiceSetStatus,
  practiceSnapshot,
  isSceneLooping,
  isSceneLoopLoading,
  onSceneLoopPlayback,
  currentStepActionLabel,
  currentStepActionLoading,
  onCurrentStepAction,
  currentStepActionDisabled,
}: SceneTrainingNextStepStripProps) {
  const [expanded, setExpanded] = useState(false);
  const completedMap = deriveSceneTrainingCompletedMap({
    session: trainingState?.session,
    practiceSetStatus,
    practiceSnapshot,
    variantUnlocked,
  });
  const trainingStateModel = deriveSceneTrainingState(completedMap);
  const currentStep = trainingStateModel.currentStep;
  const nextStep = getSceneTrainingNextStep(currentStep);
  const currentStepLabel = getSceneTrainingStepTitle(currentStep);
  const nextStepLabel = nextStep ? getSceneTrainingStepTitle(nextStep) : getSceneTrainingStepTitle("done");
  const supportText = nextStepSupportText[currentStep] ?? nextStepSupportText.listen;

  return (
    <section
      aria-label="当前下一步"
      className="rounded-[22px] border border-[var(--app-border-soft)] bg-[var(--app-scene-panel-bg)] p-[var(--mobile-adapt-space-lg)] shadow-[var(--app-shadow-soft)]"
    >
      <div className="mb-[var(--mobile-adapt-space-md)] flex min-h-[var(--mobile-adapt-button-height)] items-start gap-[var(--mobile-adapt-space-sm)]">
        {onBack ? (
          <button
            type="button"
            aria-label="返回场景列表"
            className="inline-flex size-[var(--mobile-adapt-button-height)] shrink-0 items-center justify-center rounded-full border border-[var(--app-button-secondary-border)] bg-[var(--app-button-secondary-bg)] text-[var(--app-button-secondary-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="truncate text-[length:var(--mobile-adapt-font-title-sm)] font-semibold text-foreground">
            {title}
          </h1>
        </div>
        <button
          type="button"
          aria-label={expanded ? "折叠当前任务" : "展开当前任务"}
          aria-expanded={expanded}
          className="inline-flex size-[var(--mobile-adapt-button-height)] shrink-0 items-center justify-center rounded-full border border-[var(--app-button-secondary-border)] bg-[var(--app-button-secondary-bg)] text-[var(--app-button-secondary-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown className={`size-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col gap-[var(--mobile-adapt-space-md)] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-[var(--mobile-adapt-space-xs)]">
          <p className="text-[length:var(--mobile-adapt-font-meta)] font-semibold text-[var(--app-scene-panel-muted)]">
            当前下一步
          </p>
          <h2 className="text-[length:var(--mobile-adapt-font-title-sm)] font-bold text-foreground">
            {currentStepLabel}
          </h2>
          {expanded ? (
            <p className="text-[length:var(--mobile-adapt-font-body-sm)] leading-6 text-[var(--app-scene-panel-muted)]">
              {supportText} 下一步：{nextStepLabel}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-[var(--mobile-adapt-space-sm)] sm:flex-row sm:items-center">
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
            className="inline-flex min-h-[var(--mobile-adapt-button-height)] flex-row-reverse items-center justify-center gap-[var(--mobile-adapt-space-sm)] rounded-[14px] px-[var(--mobile-adapt-space-lg)] py-[var(--mobile-adapt-space-md)] text-[length:var(--mobile-adapt-font-body-sm)] font-semibold"
            iconClassName="size-4"
            onClick={onSceneLoopPlayback}
          />
          {currentStepActionLabel && onCurrentStepAction ? (
            <button
              type="button"
              aria-label="执行当前下一步"
              className="inline-flex min-h-[var(--mobile-adapt-button-height)] items-center justify-center rounded-[14px] border-0 bg-[var(--app-scene-panel-accent)] px-[var(--mobile-adapt-space-xl)] py-[var(--mobile-adapt-space-md)] text-[length:var(--mobile-adapt-font-body-sm)] font-semibold text-white shadow-[0_4px_15px_color-mix(in_srgb,var(--app-scene-panel-accent)_26%,transparent)] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[var(--app-scene-panel-cta-disabled)] disabled:text-white/80 disabled:shadow-none"
              disabled={currentStepActionDisabled}
              onClick={onCurrentStepAction}
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

      {expanded ? (
        <p className="mt-[var(--mobile-adapt-space-sm)] text-[length:var(--mobile-adapt-font-meta)] text-[var(--app-scene-panel-muted)]">
          完整进度和快捷入口保留在右下角训练入口。
        </p>
      ) : null}
    </section>
  );
}
