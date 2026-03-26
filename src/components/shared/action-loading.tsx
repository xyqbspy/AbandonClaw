"use client";

import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoadingContentProps = {
  loading: boolean;
  children: ReactNode;
  loadingText?: ReactNode;
  className?: string;
  spinnerClassName?: string;
};

export function formatLoadingText(label: string, suffix = "...") {
  return label.endsWith("...") ? label : `${label}${suffix}`;
}

export function LoadingContent({
  loading,
  children,
  loadingText,
  className,
  spinnerClassName,
}: LoadingContentProps) {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <span className={cn("inline-flex items-center justify-center gap-1.5", className)}>
      <Loader2 className={cn("size-3.5 animate-spin", spinnerClassName)} aria-hidden="true" />
      <span>{loadingText ?? children}</span>
    </span>
  );
}

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: ReactNode;
};

export function LoadingButton({
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      aria-busy={loading}
      disabled={disabled || loading}
      {...props}
    >
      <LoadingContent loading={loading} loadingText={loadingText}>
        {children}
      </LoadingContent>
    </Button>
  );
}

type LoadingOverlayProps = {
  loading: boolean;
  loadingText: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function LoadingOverlay({
  loading,
  loadingText,
  className,
  contentClassName,
}: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/72 backdrop-blur-[1px]",
        className,
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-white/96 px-3 py-1.5 text-xs font-medium text-foreground shadow-[0_6px_18px_rgba(0,0,0,0.08)]",
          contentClassName,
        )}
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        <span>{loadingText}</span>
      </div>
    </div>
  );
}

type LoadingStateProps = {
  text: ReactNode;
  className?: string;
  textClassName?: string;
  spinnerClassName?: string;
  centered?: boolean;
};

export function LoadingState({
  text,
  className,
  textClassName,
  spinnerClassName,
  centered = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        centered ? "justify-center" : "",
        className,
      )}
      aria-live="polite"
    >
      <Loader2 className={cn("size-4 animate-spin", spinnerClassName)} aria-hidden="true" />
      <span className={textClassName}>{text}</span>
    </div>
  );
}
