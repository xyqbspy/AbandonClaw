import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM, APPLE_META_TEXT, APPLE_SURFACE } from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

export function AdminTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(`overflow-x-auto rounded-lg ${APPLE_SURFACE}`, className)}>{children}</div>;
}

export function AdminFilterPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-soft)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

export function AdminListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col gap-4 rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-soft)] transition-[border-color,box-shadow,transform] duration-150 hover:border-primary/30 hover:shadow-[var(--app-shadow-raised)] sm:flex-row sm:items-center sm:gap-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminListIcon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminListContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0 flex-1 space-y-2", className)}>{children}</div>;
}

export function AdminListTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0 text-base font-semibold text-foreground sm:text-lg", className)}>{children}</div>;
}

export function AdminListBadges({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function AdminListMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${APPLE_META_TEXT}`, className)}>{children}</div>;
}

export function AdminListActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex shrink-0 flex-wrap items-center gap-2 sm:justify-end", className)}>{children}</div>;
}

export function AdminEmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--app-radius-panel)] border border-dashed border-[var(--app-border-soft)] bg-[var(--app-surface)] px-4 py-10 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminPagination({
  summary,
  prevHref,
  nextHref,
}: {
  summary: ReactNode;
  prevHref?: string | null;
  nextHref?: string | null;
}) {
  const buttonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM} inline-flex size-8 items-center justify-center p-0`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <p>{summary}</p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link href={prevHref} className={buttonClassName} aria-label="上一页">
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className={`${buttonClassName} opacity-40`} aria-label="上一页">
            <ChevronLeft className="size-4" />
          </span>
        )}
        {nextHref ? (
          <Link href={nextHref} className={buttonClassName} aria-label="下一页">
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={`${buttonClassName} opacity-40`} aria-label="下一页">
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
