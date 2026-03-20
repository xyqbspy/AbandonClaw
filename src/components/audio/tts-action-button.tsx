"use client";

import type { MouseEventHandler } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TtsActionButtonProps = {
  active?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  label?: string;
  activeLabel?: string;
  ariaLabel?: string;
  variant?: "ghost" | "outline" | "secondary" | "default";
  size?: "sm" | "default" | "icon" | "icon-sm";
  className?: string;
  iconClassName?: string;
};

export function TtsActionButton({
  active = false,
  onClick,
  label = "朗读",
  activeLabel = "停止",
  ariaLabel,
  variant = "ghost",
  size = "sm",
  className,
  iconClassName,
}: TtsActionButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("shrink-0", className)}
      onClick={onClick}
      aria-label={ariaLabel ?? (active ? activeLabel : label)}
    >
      <Volume2 className={cn("size-3.5", active && "animate-pulse text-primary", iconClassName)} />
      {active ? activeLabel : label}
    </Button>
  );
}
