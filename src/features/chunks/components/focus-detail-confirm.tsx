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
    <div className="fixed inset-0 z-[70] flex items-end bg-[rgba(26,44,62,0.12)] p-3 animate-in fade-in-0 duration-200 sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="关闭确认弹窗"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[32px] border border-[#EDF2F7] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-6 fade-in-0 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="space-y-3 border-b border-[#EFF3FC] px-5 pb-4 pt-5">
          <div>
            <p className="text-[20px] font-bold tracking-[-0.02em] text-[#1F4B6E]">{title}</p>
            <p className="mt-2 text-[14px] leading-6 text-[#7C97B0]">{description}</p>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="rounded-[24px] border border-[#EEF3FC] bg-[#FAFDFF] p-4">
            <p className="text-[18px] font-bold text-[#1F4F6E]">{text}</p>
            {translation ? (
              <p className="mt-2 border-l-2 border-[#D4E2F0] pl-3 text-[14px] text-[#6B8AAE]">
                {translation}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#EFF3FC] bg-[#F8FAFC] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className={`${appleButtonClassName} h-10 rounded-full border border-[#E6EDF6] bg-[#F0F4FC] px-5 text-[#2C5A7A] shadow-none hover:bg-[#E4ECF6]`}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onConfirm}
            disabled={submitting}
            className={`${appleButtonClassName} h-10 rounded-full bg-[#2C6E9E] px-6 text-white shadow-[0_2px_8px_rgba(44,110,158,0.2)] hover:bg-[#1F557C]`}
          >
            {submitting ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
