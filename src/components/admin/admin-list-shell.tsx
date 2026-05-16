import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("overflow-x-auto rounded-xl bg-white shadow-sm", className)}>{children}</div>;
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
        "rounded-xl bg-white p-5 shadow-sm sm:p-6",
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
        "group flex flex-col gap-6 rounded-xl bg-white p-5 shadow-sm transition-all sm:flex-row sm:items-center",
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
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500",
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
  return <div className={cn("min-w-0 text-base font-bold text-slate-700 sm:text-lg", className)}>{children}</div>;
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
  return <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500", className)}>{children}</div>;
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
        "rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm",
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
  const buttonClassName = "inline-flex size-8 cursor-pointer items-center justify-center rounded-xl bg-white p-0 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
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
