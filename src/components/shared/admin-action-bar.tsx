import { ReactNode } from "react";
import { APPLE_SURFACE } from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

export function AdminActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        `flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-3 py-2 ${APPLE_SURFACE}`,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminActionBarHint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("text-xs text-muted-foreground", className)}>{children}</p>;
}

export function AdminActionBarActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
