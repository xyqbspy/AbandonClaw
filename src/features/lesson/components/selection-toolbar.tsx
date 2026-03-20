"use client";

import type { RefObject } from "react";
import { BookText, BookmarkPlus, RotateCcw } from "lucide-react";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Button } from "@/components/ui/button";
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
}: SelectionToolbarProps) {
  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed z-40 hidden w-[256px] items-center gap-1 rounded-xl border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur lg:flex",
        "transition-all duration-150 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0",
      )}
      style={{ top, left }}
      role="toolbar"
      aria-label="选中文本操作"
    >
      <Button size="sm" variant="secondary" className="h-7 flex-1 px-2" onClick={onExplain}>
        <BookText className="size-3.5" />
        释义
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onSave}>
        <BookmarkPlus className="size-3.5" />
        收藏
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onReview}>
        <RotateCcw className="size-3.5" />
        复习
      </Button>
      <TtsActionButton size="sm" variant="ghost" className="h-7 px-2" onClick={onPronounce} />
    </div>
  );
}
