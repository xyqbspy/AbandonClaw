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
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[var(--mobile-adapt-overlay-radius)] border border-[#EDF2F7] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-6 fade-in-0 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="space-y-[var(--mobile-space-md)] border-b border-[#EFF3FC] px-[var(--mobile-space-sheet)] pb-[var(--mobile-space-xl)] pt-[var(--mobile-space-sheet)]">
          <div>
            <p className="text-[length:clamp(18px,4.8vw,20px)] font-bold tracking-[-0.02em] text-[#1F4B6E]">
              {title}
            </p>
            <p className="mt-[var(--mobile-space-sm)] text-[length:var(--mobile-font-body)] leading-6 text-[#7C97B0]">
              {description}
            </p>
          </div>
        </div>
        <div className="space-y-[var(--mobile-space-md)] px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]">
          <div className="rounded-[var(--mobile-adapt-overlay-card-radius)] border border-[#EEF3FC] bg-[#FAFDFF] p-[var(--mobile-space-sheet)]">
            <p className="text-[length:clamp(16px,4.4vw,18px)] font-bold text-[#1F4F6E]">{text}</p>
            {translation ? (
              <p className="mt-[var(--mobile-space-sm)] border-l-2 border-[#D4E2F0] pl-[var(--mobile-space-md)] text-[length:var(--mobile-font-body)] text-[#6B8AAE]">
                {translation}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-[var(--mobile-space-sm)] border-t border-[#EFF3FC] bg-[#F8FAFC] px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className={`${appleButtonClassName} h-[var(--mobile-control-height)] rounded-full border border-[#E6EDF6] bg-[#F0F4FC] px-[var(--mobile-space-sheet)] text-[#2C5A7A] shadow-none hover:bg-[#E4ECF6]`}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onConfirm}
            disabled={submitting}
            className={`${appleButtonClassName} h-[var(--mobile-control-height)] rounded-full bg-[#2C6E9E] px-[var(--mobile-adapt-space-xl)] text-white shadow-[0_2px_8px_rgba(44,110,158,0.2)] hover:bg-[#1F557C]`}
          >
            {submitting ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
