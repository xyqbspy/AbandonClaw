"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const INFO_BLOCK_CLASS =
  "rounded-[24px] border border-[#EEF3FC] bg-[#FAFDFF] p-[var(--mobile-space-xl)] [@media(max-height:760px)]:rounded-[20px] [@media(max-height:760px)]:p-[var(--mobile-space-lg)]";
const LABEL_CLASS = "text-[length:var(--mobile-font-body)] font-semibold text-[#1F4B6E] [@media(max-height:760px)]:text-[length:var(--mobile-font-body-sm)]";

export function DetailInfoBlock({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(INFO_BLOCK_CLASS, className)}>
      <p className={cn(LABEL_CLASS, "mb-3 flex items-center gap-2")}>
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

export function DetailStageBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border-l-4 border-[#E7B85E] bg-[#FEF8E7] px-[var(--mobile-space-xl)] py-[var(--mobile-space-xl)] [@media(max-height:760px)]:rounded-[20px] [@media(max-height:760px)]:px-[var(--mobile-space-lg)] [@media(max-height:760px)]:py-[var(--mobile-space-lg)]">
      <p className="mb-1 text-[length:var(--mobile-font-body)] font-semibold text-[#B8772E]">📝 {title}</p>
      <div className="text-[length:var(--mobile-font-sheet-body)] text-[#7A5D3A] [@media(max-height:760px)]:text-[length:var(--mobile-font-body)]">
        {children}
      </div>
    </div>
  );
}

export function DetailLoadingBlock({ title }: { title: string }) {
  return (
    <div className={cn(INFO_BLOCK_CLASS, "space-y-2")} aria-label={`${title}补全中`}>
      <p className={LABEL_CLASS}>{title}</p>
      <div className="space-y-2 animate-pulse">
        <div className="h-3 w-5/6 rounded bg-[var(--app-surface-hover)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--app-surface-hover)]" />
      </div>
    </div>
  );
}


