"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  APPLE_BODY_TEXT,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_PANEL_RAISED,
} from "@/lib/ui/apple-style";

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
    <div className="fixed inset-0 z-[70] flex items-end bg-black/25 p-3 animate-in fade-in-0 duration-200 sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="关闭确认弹窗"
        className="absolute inset-0"
        onClick={onClose}
      />
      <Card className={`relative z-10 w-full max-w-md animate-in slide-in-from-bottom-6 fade-in-0 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95 ${APPLE_PANEL_RAISED}`}>
        <CardHeader className="space-y-2">
          <div>
            <p className="text-base font-semibold">{title}</p>
            <p className={`mt-1 ${APPLE_META_TEXT}`}>{description}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className={`p-3 ${APPLE_PANEL}`}>
            <p className={`${APPLE_BODY_TEXT} font-medium`}>{text}</p>
            {translation ? (
              <p className={`mt-1 text-xs ${APPLE_META_TEXT}`}>{translation}</p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className={appleButtonClassName}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onConfirm}
            disabled={submitting}
            className={appleButtonClassName}
          >
            {submitting ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
