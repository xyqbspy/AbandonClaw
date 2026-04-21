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
  icon?: "play" | "tts" | "loop";
  surface?: "plain" | "soft" | "bubble";
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
  const family: AudioIconFamily = icon === "tts" ? "tts" : icon === "loop" ? "loop" : "play";
  const useSoftSurface = surface === "soft";
  const useBubbleSurface = surface === "bubble";

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(
        "shrink-0",
        useBubbleSurface
          ? "rounded-full border-[var(--border)] bg-white text-[var(--app-foreground-muted)] shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:bg-white hover:text-[var(--app-foreground)]"
          : useSoftSurface
            ? "border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-foreground)]"
            : "text-[var(--muted-foreground)] hover:text-foreground",
        useBubbleSurface && visualState !== "idle" && "border-primary/20 bg-white text-primary ring-2 ring-primary/10 hover:bg-white hover:text-primary",
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
