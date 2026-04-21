"use client";

import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { AnimatedLoadingText } from "@/components/shared/action-loading";
import type { PracticeSet } from "@/lib/types/learning-flow";
import type { ScenePracticeViewLabels } from "./scene-view-labels";

export function ScenePracticeHeader({
  allModulesCompleted,
  headerMenuOpen,
  labels,
  localizedPracticeModeLabel,
  onBack,
  onCloseMenu,
  onComplete,
  onDelete,
  onRegenerate,
  onToggleMenu,
  practiceSet,
  regenerating,
}: {
  allModulesCompleted: boolean;
  headerMenuOpen: boolean;
  labels: ScenePracticeViewLabels;
  localizedPracticeModeLabel: string;
  onBack: () => void;
  onCloseMenu: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onRegenerate?: () => void;
  onToggleMenu: () => void;
  practiceSet: PracticeSet | null;
  regenerating: boolean;
}) {
  return (
    <header className="flex flex-nowrap items-center justify-between gap-[var(--mobile-space-md)] py-[var(--mobile-space-2xs)]">
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-[var(--mobile-space-sm)] whitespace-nowrap text-[length:var(--mobile-font-body-sm)] font-semibold text-[var(--muted-foreground)]"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        <span>{labels.back}</span>
      </button>

      <div className="min-w-0 flex-1 overflow-hidden text-center">
        <p className="truncate whitespace-nowrap text-[length:var(--mobile-font-title)] font-extrabold text-foreground">
          {localizedPracticeModeLabel}
        </p>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="打开练习菜单"
          aria-expanded={headerMenuOpen}
          className="inline-flex size-[var(--mobile-icon-button)] items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--app-button-secondary-bg)]/80 disabled:opacity-50"
          onClick={onToggleMenu}
          disabled={!practiceSet}
        >
          <MoreHorizontal className="size-4" />
        </button>

        {headerMenuOpen ? (
          <>
            <button
              type="button"
              aria-label="关闭练习菜单"
              className="fixed inset-0 z-10"
              onClick={onCloseMenu}
            />
            <div className="absolute right-0 top-10 z-20 min-w-[clamp(160px,42vw,172px)] overflow-hidden rounded-[18px] border border-[var(--app-border-soft)] bg-[var(--app-surface)] shadow-[var(--app-shadow-raised)]">
              <button
                type="button"
                className="flex w-full items-center justify-between px-[var(--mobile-space-xl)] py-[var(--mobile-space-md)] text-left text-[length:var(--mobile-font-body-sm)] font-semibold text-foreground transition-colors hover:bg-[var(--app-surface-subtle)] disabled:text-[var(--muted-foreground)]"
                onClick={() => {
                  if (regenerating) return;
                  onRegenerate?.();
                }}
                disabled={!practiceSet || !onRegenerate || regenerating}
              >
                <span>
                  {regenerating ? (
                    <AnimatedLoadingText text={labels.regenerating} />
                  ) : (
                    labels.regenerate
                  )}
                </span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between border-t border-[var(--app-border-soft)] px-[var(--mobile-space-xl)] py-[var(--mobile-space-md)] text-left text-[length:var(--mobile-font-body-sm)] font-semibold text-foreground transition-colors hover:bg-[var(--app-surface-subtle)]"
                onClick={() => {
                  onCloseMenu();
                  onDelete();
                }}
              >
                <span>{labels.delete}</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between border-t border-[var(--app-border-soft)] px-[var(--mobile-space-xl)] py-[var(--mobile-space-md)] text-left text-[length:var(--mobile-font-body-sm)] font-semibold text-foreground transition-colors hover:bg-[var(--app-surface-subtle)] disabled:text-[var(--muted-foreground)]"
                onClick={() => {
                  onCloseMenu();
                  onComplete();
                }}
                disabled={!practiceSet || practiceSet.status === "completed" || !allModulesCompleted}
              >
                <span>{labels.complete}</span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
