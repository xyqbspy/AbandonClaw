"use client";

import type { MouseEventHandler } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioStateIcon, type AudioVisualState } from "./audio-state-icon";

type TtsActionButtonProps = {
  active?: boolean;
  paused?: boolean;
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
  surface?: "plain" | "soft";
};

export function TtsActionButton({
  active = false,
  paused = false,
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
  surface = "plain",
}: TtsActionButtonProps) {
  const resolvedLabel = loading ? loadingLabel : active ? activeLabel : label;
  const visualState: AudioVisualState = loading
    ? "loading"
    : paused
      ? "paused"
      : active
        ? "playing"
        : "idle";
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
      aria-label={ariaLabel ?? resolvedLabel}
      data-audio-state={visualState}
    >
      {loading ? (
        <Loader2 className={cn("size-3.5 animate-spin", iconClassName)} />
      ) : (
        <AudioStateIcon family="tts" state={visualState} className={cn("size-3.5", iconClassName)} />
      )}
      {iconOnly ? null : resolvedLabel}
    </Button>
  );
}
