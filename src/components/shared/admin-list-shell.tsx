import Link from "next/link";
import { ReactNode } from "react";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM, APPLE_SURFACE } from "@/lib/ui/apple-style";
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

export function AdminPagination({
  summary,
  prevHref,
  nextHref,
}: {
  summary: ReactNode;
  prevHref?: string | null;
  nextHref?: string | null;
}) {
  const buttonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM} px-2 py-1`;

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <p>{summary}</p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link href={prevHref} className={buttonClassName}>
            上一页
          </Link>
        ) : (
          <span className={`${buttonClassName} opacity-40`}>上一页</span>
        )}
        {nextHref ? (
          <Link href={nextHref} className={buttonClassName}>
            下一页
          </Link>
        ) : (
          <span className={`${buttonClassName} opacity-40`}>下一页</span>
        )}
      </div>
    </div>
  );
}
