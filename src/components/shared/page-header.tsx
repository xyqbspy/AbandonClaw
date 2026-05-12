import { ReactNode } from "react";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  variant = "default",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: "default" | "admin";
}) {
  const isAdmin = variant === "admin";

  return (
    <div className={cn("flex flex-wrap justify-between gap-4", isAdmin ? "mb-8 items-start" : "items-end")}>
      <div className={cn(isAdmin ? "space-y-1" : "space-y-2")}>
        {eyebrow ? (
          <p className={cn(isAdmin ? "text-xs font-bold uppercase tracking-normal text-slate-400" : `text-xs tracking-[0.08em] ${APPLE_META_TEXT}`)}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn(isAdmin ? "text-2xl font-bold text-slate-800" : "text-3xl font-semibold tracking-tight sm:text-4xl")}>
          {title}
        </h1>
        {description ? (
          <p className={cn(isAdmin ? "max-w-2xl text-sm text-slate-500" : `max-w-2xl text-sm sm:text-base ${APPLE_META_TEXT}`)}>
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
