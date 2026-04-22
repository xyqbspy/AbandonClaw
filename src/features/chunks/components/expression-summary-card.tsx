"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const CARD_CLASS =
  "relative overflow-hidden rounded-[24px] border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-card-bg)] p-5 shadow-[var(--app-chunks-hero-shadow)] [@media(max-height:760px)]:rounded-[20px] [@media(max-height:760px)]:p-3.5";
const HEADER_CLASS = "mb-[10px] flex items-start justify-between gap-3 [@media(max-height:760px)]:mb-2 [@media(max-height:760px)]:gap-2";
const TITLE_CLASS = "text-[clamp(17px,4.8vw,20px)] font-extrabold tracking-[-0.02em] text-[var(--app-chunks-sheet-title)] [@media(max-height:760px)]:text-[length:var(--mobile-font-title)]";
const MEANING_CLASS = "mb-4 text-[length:var(--mobile-font-sheet-body)] font-medium text-[var(--app-chunks-sheet-muted)] [@media(max-height:760px)]:mb-3 [@media(max-height:760px)]:text-[length:var(--mobile-font-body)]";
const GROUP_CLASS = "rounded-[16px] bg-[var(--app-chunks-sheet-bg)] p-3 [@media(max-height:760px)]:rounded-[14px] [@media(max-height:760px)]:p-2.5";
const GROUP_HEADER_CLASS = "mb-[10px] flex items-center justify-between gap-3 px-1 [@media(max-height:760px)]:mb-2 [@media(max-height:760px)]:gap-2";
const GROUP_LABEL_CLASS = "text-[length:var(--mobile-font-caption)] font-bold text-[var(--app-chunks-sheet-muted)]";
const GROUP_LINK_CLASS = "text-[length:var(--mobile-font-caption)] font-bold text-[var(--app-feedback-success-text)]";
const RELATED_ITEM_CLASS =
  "flex items-center justify-between gap-3 border-b border-[var(--app-chunks-sheet-card-border)] px-1 py-2 last:border-b-0 [@media(max-height:760px)]:gap-2 [@media(max-height:760px)]:py-1.5";
const RELATED_PRIMARY_CLASS = "text-[length:var(--mobile-font-body)] font-semibold text-[var(--app-chunks-sheet-body)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body-sm)]";
const RELATED_SECONDARY_CLASS = "text-[length:var(--mobile-font-body-sm)] text-[var(--app-chunks-sheet-muted)] [@media(max-height:760px)]:text-[length:var(--mobile-font-meta)]";

export function ExpressionSummaryCard({
  title,
  translation,
  badge,
  onTitleClick,
  action,
  children,
  className,
}: {
  title: string;
  translation: string;
  badge?: ReactNode;
  onTitleClick?: () => void;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn(CARD_CLASS, className)}>
      <span className="pointer-events-none absolute inset-y-5 left-0 w-1 rounded-r bg-[var(--app-feedback-success-text)] opacity-60" />
      <div className={HEADER_CLASS}>
        {onTitleClick ? (
          <button type="button" className="min-w-0 flex-1 text-left" onClick={onTitleClick}>
            <p className={TITLE_CLASS}>{title}</p>
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <p className={TITLE_CLASS}>{title}</p>
          </div>
        )}
        {badge ?? action}
        {badge && action ? action : null}
      </div>
      <p className={MEANING_CLASS}>{translation}</p>
      {children}
    </article>
  );
}

export function ExpressionSummaryGroup({
  label,
  actionLabel,
  onAction,
  children,
  footer,
  collapsed = false,
}: {
  label: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  collapsed?: boolean;
}) {
  return (
    <div className={cn(GROUP_CLASS, collapsed ? "flex min-h-[44px] flex-col justify-center" : "")}>
      <div className={cn(GROUP_HEADER_CLASS, collapsed ? "mb-0" : "")}>
        <span className={GROUP_LABEL_CLASS}>{label}</span>
        {actionLabel && onAction ? (
          <button type="button" className={GROUP_LINK_CLASS} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
      {footer}
    </div>
  );
}

export function ExpressionSummaryRelatedItem({
  primary,
  secondary,
  onClick,
}: {
  primary: ReactNode;
  secondary: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={RELATED_PRIMARY_CLASS}>{primary}</span>
      <span className={RELATED_SECONDARY_CLASS}>{secondary}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(RELATED_ITEM_CLASS, "w-full text-left")}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return <div className={RELATED_ITEM_CLASS}>{content}</div>;
}

export const expressionSummaryCardClassName = CARD_CLASS;


