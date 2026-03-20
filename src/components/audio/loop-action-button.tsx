"use client";

import type { MouseEventHandler } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoopActionButtonProps = {
  active?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  label?: string;
  activeLabel?: string;
  variant?: "ghost" | "outline" | "secondary" | "default";
  size?: "sm" | "default" | "icon" | "icon-sm";
  className?: string;
  iconClassName?: string;
};

export function LoopActionButton({
  active = false,
  onClick,
  label = "循环播放",
  activeLabel = "停止循环",
  variant = "ghost",
  size = "sm",
  className,
  iconClassName,
}: LoopActionButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("shrink-0", active && "text-primary", className)}
      onClick={onClick}
    >
      <Play className={cn("size-4", iconClassName)} />
      {active ? activeLabel : label}
    </Button>
  );
}
