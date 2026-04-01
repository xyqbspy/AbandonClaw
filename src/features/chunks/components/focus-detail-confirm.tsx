"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

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
  appleButtonClassName: _appleButtonClassName,
  onClose,
  onConfirm,
}: FocusDetailConfirmProps) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      confirmTone={title.includes("删除") ? "danger" : "default"}
      submitting={submitting}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="rounded-[var(--mobile-adapt-overlay-card-radius)] border border-[var(--app-chunks-sheet-info-border)] bg-[var(--app-chunks-sheet-card-bg)] p-[var(--mobile-space-sheet)]">
        <p className="text-[length:clamp(16px,4.4vw,18px)] font-bold text-[var(--app-chunks-sheet-body)]">
          {text}
        </p>
        {translation ? (
          <p className="mt-[var(--mobile-space-sm)] border-l-2 border-[var(--app-chunks-sheet-info-border)] pl-[var(--mobile-space-md)] text-[length:var(--mobile-font-body)] text-[var(--app-chunks-sheet-muted)]">
            {translation}
          </p>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
