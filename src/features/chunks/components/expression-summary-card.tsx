"use client";

import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CARD_CLASS =
  "phrase-card relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all duration-300 hover:translate-x-1 hover:shadow-lg hover:shadow-slate-200/70 [@media(max-height:760px)]:p-4";
const HEADER_CLASS = "mb-1 flex items-start justify-between gap-3";
const TITLE_CLASS = "text-xl font-bold text-slate-800";
const MEANING_CLASS = "mb-4 text-sm font-medium text-slate-500";
const GROUP_CLASS = "rounded-xl bg-blue-50/50 p-3 transition-colors hover:bg-blue-50";
const GROUP_COLLAPSED_CLASS =
  "min-h-[44px] px-3 py-0";
const GROUP_HEADER_CLASS = "mb-2 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3";
const GROUP_HEADER_COLLAPSED_CLASS = "mb-0 min-h-[44px] w-full px-0";
const GROUP_LABEL_CLASS = "min-w-0 text-[11px] font-bold tracking-wider text-blue-600/70 uppercase";
const GROUP_LINK_CLASS =
  "inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap justify-self-end text-right text-[11px] font-bold leading-none text-blue-600";
const RELATED_ITEM_CLASS =
  "flex items-center justify-between gap-3 px-1 py-2";
const RELATED_PRIMARY_CLASS = "text-sm font-semibold text-slate-700";
const RELATED_SECONDARY_CLASS = "text-xs text-slate-400";

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
      <span className="pointer-events-none absolute inset-y-5 left-0 w-1 rounded-r bg-emerald-500 opacity-90" />
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
    <div className={cn(GROUP_CLASS, collapsed ? GROUP_COLLAPSED_CLASS : "")}>
      <div className={cn(GROUP_HEADER_CLASS, collapsed ? GROUP_HEADER_COLLAPSED_CLASS : "")}>
        <span className={GROUP_LABEL_CLASS}>{label}</span>
        {actionLabel && onAction ? (
          <button type="button" className={GROUP_LINK_CLASS} onClick={onAction}>
            {actionLabel}
            <ArrowRight className="size-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {children}
      {footer}
    </div>
  );
}

export function SimilarExpressionGroupLabel({
  label,
  count,
}: {
  label: string;
  count?: number;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
        <span className="size-3 rounded-full border-2 border-white bg-blue-200" />
        <span className="size-3 rounded-full border-2 border-white bg-blue-300" />
      </span>
      <span className="truncate">
        {label}
        {count && count > 0 ? ` · ${count}` : ""}
      </span>
    </span>
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


