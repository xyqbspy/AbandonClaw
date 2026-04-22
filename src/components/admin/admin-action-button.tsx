"use client";

import type { ComponentProps } from "react";
import { LoadingButton } from "@/components/shared/action-loading";
import { ConfirmButton } from "@/components/shared/confirm-action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_SM,
} from "@/lib/ui/apple-style";

type AdminActionTone = "secondary" | "primary" | "danger";

const adminActionToneClassName: Record<AdminActionTone, string> = {
  secondary: APPLE_BUTTON_BASE,
  primary: APPLE_BUTTON_STRONG,
  danger: APPLE_BUTTON_DANGER,
};

export function adminActionButtonClassName(tone: AdminActionTone = "secondary", className?: string) {
  return cn(adminActionToneClassName[tone], APPLE_BUTTON_TEXT_SM, "min-h-9 gap-1.5", className);
}

type AdminActionButtonProps = ComponentProps<typeof Button> & {
  tone?: AdminActionTone;
};

export function AdminActionButton({
  tone = "secondary",
  variant = tone === "primary" ? "default" : "ghost",
  size = "sm",
  className,
  ...props
}: AdminActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={(state: any) =>
        adminActionButtonClassName(
          tone,
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  );
}

// ====================== LoadingButton 修复 ======================
type AdminLoadingActionButtonProps = ComponentProps<typeof LoadingButton> & {
  tone?: AdminActionTone;
};

export function AdminLoadingActionButton({
  tone = "secondary",
  variant = tone === "primary" ? "default" : "ghost",
  size = "sm",
  className,
  ...props
}: AdminLoadingActionButtonProps) {
  return (
    <LoadingButton
      variant={variant}
      size={size}
      className={(state: any) =>
        adminActionButtonClassName(
          tone,
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  );
}

// ====================== ConfirmButton 修复 ======================
type AdminConfirmActionButtonProps = ComponentProps<typeof ConfirmButton> & {
  tone?: AdminActionTone;
};

export function AdminConfirmActionButton({
  tone = "secondary",
  variant = tone === "primary" ? "default" : "ghost",
  size = "sm",
  className,
  ...props
}: AdminConfirmActionButtonProps) {
  return (
    <ConfirmButton
      variant={variant}
      size={size}
      className={(state: any) =>
        adminActionButtonClassName(
          tone,
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  );
}