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
        "rounded-xl bg-white p-5 shadow-sm sm:p-6",
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
  return <form className={cn("grid gap-4", className)}>{children}</form>;
}

export function FilterBarMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2 text-xs text-slate-500", className)}>
      {children}
    </div>
  );
}
