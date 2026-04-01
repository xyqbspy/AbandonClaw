"use client";

import { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmTone?: "default" | "danger";
  submitting?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
};

const dialogClassName =
  "w-full max-w-[clamp(280px,82vw,320px)] overflow-hidden rounded-[var(--mobile-adapt-overlay-card-radius)] bg-[rgba(255,255,255,0.88)] shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-[24px] transition-transform duration-200";
const dialogButtonClassName =
  "h-[var(--mobile-adapt-overlay-footer-button-height)] cursor-pointer bg-transparent text-[length:var(--mobile-adapt-font-sheet-body)] font-bold";

export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmTone = "default",
  submitting = false,
  children,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div
      data-confirm-dialog="true"
      className={`fixed inset-0 z-[80] flex items-center justify-center bg-black/20 px-6 backdrop-blur-[10px] transition-opacity duration-200 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className={`${dialogClassName} ${
          open ? "translate-y-0 scale-100" : "translate-y-[10px] scale-[0.96]"
        }`}
      >
        <div className="px-[var(--mobile-adapt-space-sheet)] pb-[var(--mobile-adapt-space-lg)] pt-[calc(var(--mobile-adapt-space-lg)+var(--mobile-adapt-space-2xs))] text-center">
          <div className="mb-[var(--mobile-adapt-space-sm)] text-[length:clamp(1rem,4.6vw,1.15rem)] font-extrabold tracking-[-0.02em] text-[#1D1D1F]">
            {title}
          </div>
          <div className="text-[length:var(--mobile-adapt-font-body-sm)] leading-[1.45] text-[var(--app-surface-text-secondary)]">
            {description}
          </div>
        </div>
        {children ? (
          <div className="border-t border-[rgba(60,60,67,0.12)] bg-[rgba(255,255,255,0.45)] px-[var(--mobile-adapt-space-sheet)] py-[var(--mobile-adapt-space-md)]">
            {children}
          </div>
        ) : null}
        <div className="grid grid-cols-2 border-t border-[rgba(60,60,67,0.12)] bg-[rgba(255,255,255,0.6)]">
          <button
            type="button"
            className={`${dialogButtonClassName} text-[#007AFF] disabled:opacity-60`}
            onClick={onClose}
            disabled={submitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${dialogButtonClassName} border-l border-[rgba(60,60,67,0.12)] ${
              confirmTone === "danger" ? "text-[#FF3B30]" : "text-[#007AFF]"
            } disabled:opacity-60`}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
