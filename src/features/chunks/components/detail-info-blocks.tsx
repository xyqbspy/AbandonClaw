"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const INFO_BLOCK_CLASS =
  "rounded-[24px] border border-[#EEF3FC] bg-[#FAFDFF] p-4 [@media(max-height:760px)]:rounded-[20px] [@media(max-height:760px)]:p-3";
const LABEL_CLASS = "text-[14px] font-semibold text-[#1F4B6E] [@media(max-height:760px)]:text-[13px]";

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
    <div className="rounded-[24px] border-l-4 border-[#E7B85E] bg-[#FEF8E7] px-4 py-4 [@media(max-height:760px)]:rounded-[20px] [@media(max-height:760px)]:px-3 [@media(max-height:760px)]:py-3">
      <p className="mb-1 text-[14px] font-semibold text-[#B8772E]">📝 {title}</p>
      <div className="text-[15px] text-[#7A5D3A] [@media(max-height:760px)]:text-[14px]">
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
