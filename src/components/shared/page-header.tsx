import { ReactNode } from "react";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow ? <p className={`text-xs tracking-[0.08em] ${APPLE_META_TEXT}`}>{eyebrow}</p> : null}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description ? <p className={`max-w-2xl text-sm sm:text-base ${APPLE_META_TEXT}`}>{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
