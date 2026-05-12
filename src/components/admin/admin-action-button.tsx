"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoadingButton, LoadingContent } from "@/components/shared/action-loading";
import { ConfirmButton } from "@/components/shared/confirm-action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADMIN_BUTTON_DANGER,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
} from "@/lib/ui/admin-style";

type AdminActionTone = "secondary" | "primary" | "danger";
type AdminActionClassName = ComponentProps<typeof Button>["className"];
type AdminActionClassNameFunction = Extract<NonNullable<AdminActionClassName>, (state: never) => unknown>;
type AdminActionButtonState = Parameters<AdminActionClassNameFunction>[0];

const adminActionToneClassName: Record<AdminActionTone, string> = {
  secondary: ADMIN_BUTTON_SECONDARY,
  primary: ADMIN_BUTTON_PRIMARY,
  danger: ADMIN_BUTTON_DANGER,
};

export function adminActionButtonClassName(tone: AdminActionTone = "secondary", className?: string) {
  return cn(adminActionToneClassName[tone], "gap-1.5", className);
}

function composeAdminActionClassName(tone: AdminActionTone, className: AdminActionClassName) {
  return (state: AdminActionButtonState) =>
    adminActionButtonClassName(
      tone,
      typeof className === "function" ? className(state) : className,
    );
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
      className={composeAdminActionClassName(tone, className)}
      {...props}
    />
  );
}

type AdminSubmitButtonProps = AdminActionButtonProps & {
  pendingText?: ReactNode;
};

export function AdminSubmitButton({
  tone = "secondary",
  variant = tone === "primary" ? "default" : "ghost",
  size = "sm",
  className,
  disabled,
  children,
  pendingText = "处理中...",
  ...props
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={composeAdminActionClassName(tone, className)}
      aria-busy={pending}
      disabled={disabled || pending}
      {...props}
    >
      <LoadingContent loading={pending} loadingText={pendingText}>
        {children}
      </LoadingContent>
    </Button>
  );
}

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
      className={composeAdminActionClassName(tone, className)}
      {...props}
    />
  );
}

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
      className={composeAdminActionClassName(tone, className)}
      {...props}
    />
  );
}
