"use client";

import type { MouseEventHandler } from "react";
import { Loader2, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoopActionButtonProps = {
  active?: boolean;
  loading?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  label?: string;
  activeLabel?: string;
  loadingLabel?: string;
  variant?: "ghost" | "outline" | "secondary" | "default";
  size?: "sm" | "default" | "icon" | "icon-sm";
  className?: string;
  iconClassName?: string;
  ariaLabel?: string;
  iconOnly?: boolean;
  icon?: "play" | "tts";
};

export function LoopActionButton({
  active = false,
  loading = false,
  onClick,
  label = "循环播放",
  activeLabel = "停止循环",
  loadingLabel = "加载中...",
  variant = "ghost",
  size = "sm",
  className,
  iconClassName,
  ariaLabel,
  iconOnly = false,
  icon = "play",
}: LoopActionButtonProps) {
  const resolvedLabel = loading ? loadingLabel : active ? activeLabel : label;
  const resolvedAriaLabel = ariaLabel ?? resolvedLabel;
  const Icon = icon === "tts" ? Volume2 : Play;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("shrink-0", active && "text-primary", className)}
      onClick={onClick}
      aria-label={resolvedAriaLabel}
    >
      {loading ? (
        <Loader2 className={cn("size-4 animate-spin", iconClassName)} />
      ) : (
        <Icon className={cn("size-4", active && icon === "tts" && "animate-pulse text-primary", iconClassName)} />
      )}
      {iconOnly ? null : resolvedLabel}
    </Button>
  );
}
