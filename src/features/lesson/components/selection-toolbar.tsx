"use client";

import type { RefObject } from "react";
import { BookText, BookmarkPlus, RotateCcw } from "lucide-react";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Button } from "@/components/ui/button";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_SM,
  APPLE_META_TEXT,
  APPLE_PANEL_RAISED,
} from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

type SelectionToolbarProps = {
  visible: boolean;
  top: number;
  left: number;
  toolbarRef: RefObject<HTMLDivElement | null>;
  onExplain: () => void;
  onSave: () => void;
  onReview: () => void;
  onPronounce: () => void;
  loadingPronounce?: boolean;
};

export function SelectionToolbar({
  visible,
  top,
  left,
  toolbarRef,
  onExplain,
  onSave,
  onReview,
  onPronounce,
  loadingPronounce = false,
}: SelectionToolbarProps) {
  const toolbarButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM} h-[var(--mobile-adapt-control-height)]`;

  return (
    <div
      ref={toolbarRef}
      className={cn(
        `fixed z-40 hidden w-[clamp(232px,24vw,256px)] items-center gap-[var(--mobile-adapt-space-xs)] p-[var(--mobile-adapt-space-xs)] backdrop-blur lg:flex ${APPLE_PANEL_RAISED}`,
        "transition-all duration-150 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0",
      )}
      style={{ top, left }}
      role="toolbar"
      aria-label="选中文本操作"
    >
      <Button size="sm" variant="ghost" className={`${toolbarButtonClassName} flex-1 px-[var(--mobile-adapt-space-sm)]`} onClick={onExplain}>
        <BookText className="size-3.5" />
        释义
      </Button>
      <Button size="sm" variant="ghost" className={`${toolbarButtonClassName} px-[var(--mobile-adapt-space-sm)]`} onClick={onSave}>
        <BookmarkPlus className="size-3.5" />
        收藏
      </Button>
      <Button size="sm" variant="ghost" className={`${toolbarButtonClassName} px-[var(--mobile-adapt-space-sm)]`} onClick={onReview}>
        <RotateCcw className="size-3.5" />
        复习
      </Button>
      <TtsActionButton
        loading={loadingPronounce}
        size="sm"
        variant="ghost"
        className={`px-[var(--mobile-adapt-space-sm)] ${APPLE_META_TEXT}`}
        label="朗读"
        activeLabel="停止"
        ariaLabel="朗读"
        onClick={onPronounce}
      />
    </div>
  );
}
