"use client";

import type { MouseEventHandler } from "react";
import { Loader2, Play } from "lucide-react";
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
};

export function LoopActionButton({
  active = false,
  loading = false,
  onClick,
  label = "循环播放",
  activeLabel = "停止循环",
  loadingLabel = "生成中",
  variant = "ghost",
  size = "sm",
  className,
  iconClassName,
}: LoopActionButtonProps) {
  const resolvedLabel = loading ? loadingLabel : active ? activeLabel : label;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("shrink-0", active && "text-primary", className)}
      onClick={onClick}
    >
      {loading ? (
        <Loader2 className={cn("size-4 animate-spin", iconClassName)} />
      ) : (
        <Play className={cn("size-4", iconClassName)} />
      )}
      {resolvedLabel}
    </Button>
  );
}
