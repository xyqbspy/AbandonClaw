"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FocusDetailSheetHeader({
  title,
  detailText,
  trailLength,
  backToCurrentLabel,
  canShowSiblingNav,
  prevLabel,
  nextLabel,
  appleButtonClassName,
  onClose,
  onReopenPrevTrail,
  onOpenPrevSibling,
  onOpenNextSibling,
}: {
  title: string;
  detailText: string;
  trailLength: number;
  backToCurrentLabel: string;
  canShowSiblingNav: boolean;
  prevLabel: string;
  nextLabel: string;
  appleButtonClassName: string;
  onClose: () => void;
  onReopenPrevTrail: () => void;
  onOpenPrevSibling: () => void;
  onOpenNextSibling: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 [@media(max-height:760px)]:gap-1.5">
      <div className="flex items-center gap-4 [@media(max-height:760px)]:gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`${appleButtonClassName} h-11 w-11 rounded-[14px] border border-[#F3F6FA] bg-white px-0 text-[#2C6E9E] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.16)] hover:bg-[#EFF3FA] [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:w-8 [@media(max-height:760px)]:rounded-[11px]`}
          onClick={trailLength > 1 ? onReopenPrevTrail : onClose}
          aria-label={trailLength > 1 ? backToCurrentLabel : "返回"}
        >
          <ChevronLeft className="size-5" />
        </Button>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-3 [@media(max-height:760px)]:gap-1.5">
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#7C97B0] [@media(max-height:760px)]:text-[9px] [@media(max-height:760px)]:tracking-[0.16em]">
            {title}
          </p>
          {detailText ? (
            <p className="truncate text-[13px] text-[#9AAEC2] [@media(max-height:760px)]:hidden">{detailText}</p>
          ) : null}
        </div>
        {canShowSiblingNav ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`${appleButtonClassName} h-10 rounded-full border border-[#E6EDF6] bg-white/90 px-4 text-[#2C6E9E] shadow-none hover:bg-[#EFF3FA] [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:text-[11px]`}
              onClick={onOpenPrevSibling}
            >
              {prevLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`${appleButtonClassName} h-10 rounded-full border border-[#E6EDF6] bg-white/90 px-4 text-[#2C6E9E] shadow-none hover:bg-[#EFF3FA] [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:text-[11px]`}
              onClick={onOpenNextSibling}
            >
              {nextLabel}
            </Button>
          </>
        ) : trailLength > 1 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`${appleButtonClassName} h-10 rounded-full border border-[#E6EDF6] bg-white/90 px-4 text-[#2C6E9E] shadow-none hover:bg-[#EFF3FA] [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:text-[11px]`}
            onClick={onReopenPrevTrail}
          >
            {backToCurrentLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
