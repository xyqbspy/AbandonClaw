"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FocusDetailSheetHeader({
  title,
  trailLength,
  backToCurrentLabel,
  canShowSiblingNav,
  prevLabel,
  nextLabel,
  appleButtonClassName,
  onReopenPrevTrail,
  onOpenPrevSibling,
  onOpenNextSibling,
}: {
  title: string;
  trailLength: number;
  backToCurrentLabel: string;
  canShowSiblingNav: boolean;
  prevLabel: string;
  nextLabel: string;
  appleButtonClassName: string;
  onReopenPrevTrail: () => void;
  onOpenPrevSibling: () => void;
  onOpenNextSibling: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="truncate text-base font-semibold">{title}</p>
      <div className="flex items-center justify-between gap-3">
        {trailLength > 1 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`${appleButtonClassName} h-8 min-w-0 gap-1 px-2 sm:px-3`}
            onClick={onReopenPrevTrail}
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">{backToCurrentLabel}</span>
          </Button>
        ) : (
          <div className="h-8 w-8 sm:w-20" aria-hidden="true" />
        )}
        <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`${appleButtonClassName} ${canShowSiblingNav ? "" : "invisible pointer-events-none"}`}
            onClick={onOpenPrevSibling}
          >
            {prevLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`${appleButtonClassName} ${canShowSiblingNav ? "" : "invisible pointer-events-none"}`}
            onClick={onOpenNextSibling}
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
