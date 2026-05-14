"use client";

import { ArrowRight, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrimarySceneAction } from "./scene-display";

type ScenesBottomActionBarProps = {
  primaryAction: PrimarySceneAction;
  onPrimaryAction: () => void;
  onSecondaryAction?: (() => void) | null;
  secondaryDisabled?: boolean;
  secondaryLabel: string;
  secondaryAriaLabel: string;
  secondaryTitle?: string;
};

export function ScenesBottomActionBar({
  primaryAction,
  onPrimaryAction,
  onSecondaryAction,
  secondaryDisabled = false,
  secondaryLabel,
  secondaryAriaLabel,
  secondaryTitle,
}: ScenesBottomActionBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent p-6"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <div className="mx-auto flex w-full max-w-md gap-3">
        <Button
          type="button"
          variant="secondary"
          radius="lg"
          aria-label={secondaryAriaLabel}
          title={secondaryTitle}
          disabled={secondaryDisabled}
          className="size-14 shrink-0 rounded-2xl border-2 border-slate-100 bg-white text-slate-600 shadow-lg hover:bg-white active:scale-[0.98] active:opacity-90"
          onClick={() => {
            if (!secondaryDisabled) onSecondaryAction?.();
          }}
        >
          <Repeat2 data-random-review-icon="loop" className="size-5" />
          <span className="sr-only">{secondaryLabel}</span>
        </Button>

        <Button
          type="button"
          radius="lg"
          className="h-14 flex-1 gap-3 rounded-[1.25rem] bg-blue-600 text-sm font-black text-white shadow-2xl shadow-blue-200 hover:bg-blue-600 active:scale-[0.98] active:opacity-90"
          onClick={onPrimaryAction}
        >
          <span>{primaryAction.label}</span>
          <ArrowRight className="size-4 opacity-50" />
        </Button>
      </div>
    </div>
  );
}
