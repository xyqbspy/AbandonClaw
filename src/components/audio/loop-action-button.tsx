"use client";

import type { MouseEventHandler } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioStateIcon, type AudioIconFamily, type AudioVisualState } from "./audio-state-icon";

type LoopActionButtonProps = {
  active?: boolean;
  paused?: boolean;
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
  surface?: "plain" | "soft";
};

export function LoopActionButton({
  active = false,
  paused = false,
  loading = false,
  onClick,
  label = "循环播放",
  activeLabel = "停止循环",
  loadingLabel = "加载中...",
  variant = "ghost",
  size = "icon-sm",
  className,
  iconClassName,
  ariaLabel,
  iconOnly = true,
  icon = "play",
  surface = "plain",
}: LoopActionButtonProps) {
  const resolvedLabel = loading ? loadingLabel : active ? activeLabel : label;
  const resolvedAriaLabel = ariaLabel ?? resolvedLabel;
  const visualState: AudioVisualState = loading
    ? "loading"
    : paused
      ? "paused"
      : active
        ? "playing"
        : "idle";
  const family: AudioIconFamily = icon === "tts" ? "tts" : "play";
  const useSoftSurface = surface === "soft";

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(
        "shrink-0",
        useSoftSurface
          ? "border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-foreground)]"
          : "text-[var(--muted-foreground)] hover:text-foreground",
        useSoftSurface && visualState !== "idle" && "border-primary/10 bg-primary/12 text-primary hover:bg-primary/16 hover:text-primary",
        !useSoftSurface && visualState !== "idle" && "text-primary hover:text-primary",
        iconOnly && (size === "sm" || size === "default") && "aspect-square px-0",
        className,
      )}
      onClick={onClick}
      aria-label={resolvedAriaLabel}
      data-audio-state={visualState}
    >
      {loading ? (
        <Loader2 className={cn("size-4 animate-spin", iconClassName)} />
      ) : (
        <AudioStateIcon family={family} state={visualState} className={iconClassName} />
      )}
      {iconOnly ? null : resolvedLabel}
    </Button>
  );
}
