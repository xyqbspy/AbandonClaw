"use client";

import type { MouseEventHandler } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TtsActionButtonProps = {
  active?: boolean;
  loading?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  label?: string;
  activeLabel?: string;
  loadingLabel?: string;
  ariaLabel?: string;
  variant?: "ghost" | "outline" | "secondary" | "default";
  size?: "sm" | "default" | "icon" | "icon-sm";
  className?: string;
  iconClassName?: string;
  iconOnly?: boolean;
};

export function TtsActionButton({
  active = false,
  loading = false,
  onClick,
  label = "朗读",
  activeLabel = "停止",
  loadingLabel = "加载中...",
  ariaLabel,
  variant = "ghost",
  size = "icon-sm",
  className,
  iconClassName,
  iconOnly = true,
}: TtsActionButtonProps) {
  const resolvedLabel = loading ? loadingLabel : active ? activeLabel : label;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(
        "shrink-0",
        iconOnly && (size === "sm" || size === "default") && "aspect-square px-0",
        className,
      )}
      onClick={onClick}
      aria-label={ariaLabel ?? resolvedLabel}
    >
      {loading ? (
        <Loader2 className={cn("size-3.5 animate-spin", iconClassName)} />
      ) : (
        <Volume2
          className={cn("size-3.5", active && "animate-pulse text-primary", iconClassName)}
        />
      )}
      {iconOnly ? null : resolvedLabel}
    </Button>
  );
}
