import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterBar({
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

export function FilterBarForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <form className={cn("grid gap-2", className)}>{children}</form>;
}

export function FilterBarMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2 text-xs text-muted-foreground", className)}>
      {children}
    </div>
  );
}
