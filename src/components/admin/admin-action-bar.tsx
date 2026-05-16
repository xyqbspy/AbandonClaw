import { ReactNode } from "react";
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
        "flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm",
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
  return <p className={cn("text-xs text-slate-500", className)}>{children}</p>;
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
