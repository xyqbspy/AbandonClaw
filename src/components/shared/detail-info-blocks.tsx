"use client";

import { ReactNode } from "react";
import { APPLE_BODY_TEXT, APPLE_META_TEXT, APPLE_PANEL_RAISED } from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

const DETAIL_BLOCK_CLASS = cn(
  APPLE_PANEL_RAISED,
  "rounded-[24px] px-[var(--mobile-space-xl)] py-[var(--mobile-space-xl)] [@media(max-height:760px)]:rounded-[20px] [@media(max-height:760px)]:px-[var(--mobile-space-lg)] [@media(max-height:760px)]:py-[var(--mobile-space-lg)]",
);
const LABEL_CLASS = cn(
  APPLE_META_TEXT,
  "mb-3 flex items-center gap-2 text-[length:var(--mobile-font-body)] font-semibold uppercase tracking-[0.02em] text-[var(--app-chunks-sheet-title)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body-sm)]",
);
const BODY_CLASS = cn(
  APPLE_BODY_TEXT,
  "text-[length:var(--mobile-font-sheet-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[var(--app-chunks-sheet-body)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body)]",
);
const ICON_CLASS =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-surface-subtle)] text-[length:var(--mobile-font-body)] leading-none text-[var(--app-foreground)]";

function DetailBlockLabel({
  title,
  icon,
}: {
  title: string;
  icon?: ReactNode;
}) {
  return (
    <p className={LABEL_CLASS}>
      {icon ? <span className={ICON_CLASS}>{icon}</span> : null}
      {title}
    </p>
  );
}

export function DetailInfoBlock({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(DETAIL_BLOCK_CLASS, className)}>
      <DetailBlockLabel title={title} icon={icon} />
      {children}
    </div>
  );
}

export function DetailStageBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={DETAIL_BLOCK_CLASS}>
      <DetailBlockLabel title={title} icon={icon ?? "🪜"} />
      <div className={BODY_CLASS}>{children}</div>
    </div>
  );
}

export function DetailLoadingBlock({
  title,
  icon,
}: {
  title: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn(DETAIL_BLOCK_CLASS, "space-y-2")} aria-label={`${title}补全中`}>
      <DetailBlockLabel title={title} icon={icon} />
      <div className="space-y-2 animate-pulse">
        <div className="h-3 w-5/6 rounded bg-[var(--app-surface-hover)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--app-surface-hover)]" />
      </div>
    </div>
  );
}
