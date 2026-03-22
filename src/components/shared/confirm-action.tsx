"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ConfirmButtonProps = ComponentProps<typeof Button> & {
  confirmText: string;
  finalConfirmText?: string;
  pendingText?: string;
  onConfirm?: () => void | Promise<void>;
};

export async function confirmAction(confirmText: string, finalConfirmText?: string) {
  const firstConfirmed = window.confirm(confirmText);
  if (!firstConfirmed) return false;
  if (!finalConfirmText) return true;
  return window.confirm(finalConfirmText);
}

export function ConfirmButton({
  confirmText,
  finalConfirmText,
  pendingText,
  onConfirm,
  children,
  disabled,
  onClick,
  type,
  ...props
}: ConfirmButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      {...props}
      type={type}
      disabled={disabled || pending}
      onClick={async (event) => {
        const confirmed = await confirmAction(confirmText, finalConfirmText);
        if (!confirmed) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
        if (event.defaultPrevented) return;

        if (onConfirm) {
          event.preventDefault();
          try {
            setPending(true);
            await onConfirm();
          } finally {
            setPending(false);
          }
          return;
        }

        if (type === "submit") {
          setPending(true);
        }
      }}
    >
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
