"use client";

import { Button } from "@/components/ui/button";

type FocusDetailConfirmProps = {
  open: boolean;
  title: string;
  description: string;
  text: string;
  translation?: string | null;
  confirmLabel: string;
  cancelLabel: string;
  submitting: boolean;
  appleButtonClassName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function FocusDetailConfirm({
  open,
  title,
  description,
  text,
  translation,
  confirmLabel,
  cancelLabel,
  submitting,
  appleButtonClassName,
  onClose,
  onConfirm,
}: FocusDetailConfirmProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-[rgba(26,44,62,0.12)] p-[var(--mobile-space-md)] animate-in fade-in-0 duration-200 sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="关闭确认弹窗"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[var(--mobile-adapt-overlay-radius)] border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-card-bg)] shadow-[var(--app-chunks-sheet-card-shadow)] animate-in slide-in-from-bottom-6 fade-in-0 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="space-y-[var(--mobile-space-md)] border-b border-[var(--app-chunks-sheet-info-border)] px-[var(--mobile-space-sheet)] pb-[var(--mobile-space-xl)] pt-[var(--mobile-space-sheet)]">
          <div>
            <p className="text-[length:clamp(18px,4.8vw,20px)] font-bold tracking-[-0.02em] text-[var(--app-chunks-sheet-title)]">
              {title}
            </p>
            <p className="mt-[var(--mobile-space-sm)] text-[length:var(--mobile-font-body)] leading-6 text-[var(--app-chunks-sheet-subtitle)]">
              {description}
            </p>
          </div>
        </div>
        <div className="space-y-[var(--mobile-space-md)] px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]">
          <div className="rounded-[var(--mobile-adapt-overlay-card-radius)] border border-[var(--app-chunks-sheet-info-border)] bg-[var(--app-chunks-sheet-card-bg)] p-[var(--mobile-space-sheet)]">
            <p className="text-[length:clamp(16px,4.4vw,18px)] font-bold text-[var(--app-chunks-sheet-body)]">{text}</p>
            {translation ? (
              <p className="mt-[var(--mobile-space-sm)] border-l-2 border-[var(--app-chunks-sheet-info-border)] pl-[var(--mobile-space-md)] text-[length:var(--mobile-font-body)] text-[var(--app-chunks-sheet-muted)]">
                {translation}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-[var(--mobile-space-sm)] border-t border-[var(--app-chunks-sheet-info-border)] bg-[var(--app-chunks-sheet-bg)] px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className={`${appleButtonClassName} h-[var(--mobile-control-height)] rounded-full border border-[var(--app-chunks-sheet-secondary-border)] bg-[var(--app-chunks-sheet-info-soft)] px-[var(--mobile-space-sheet)] text-[var(--app-chunks-sheet-secondary-text)] shadow-none hover:bg-[var(--app-chunks-sheet-secondary-hover)]`}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onConfirm}
            disabled={submitting}
            className={`${appleButtonClassName} h-[var(--mobile-control-height)] rounded-full bg-[var(--app-chunks-sheet-primary-bg)] px-[var(--mobile-adapt-space-xl)] text-[var(--app-chunks-sheet-primary-text)] shadow-[var(--app-chunks-sheet-primary-shadow)] hover:bg-[var(--app-chunks-sheet-primary-hover)]`}
          >
            {submitting ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
