"use client";

import { Button } from "@/components/ui/button";

type SceneEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SceneEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: SceneEmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <Button
          type="button"
          variant="secondary"
          radius="lg"
          className="mt-5 h-11 border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] active:opacity-90"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
