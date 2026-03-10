"use client";

import { useState } from "react";
import { Languages, Volume2 } from "lucide-react";
import { LessonSentence } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SentenceBlock({
  sentence,
  speaking,
  activeChunkKey,
  hoveredChunkKey,
  onPronounce,
  onSelectText,
  onHoverChunk,
  onSentenceTap,
  mobileTapEnabled,
}: {
  sentence: LessonSentence;
  speaking?: boolean;
  activeChunkKey?: string | null;
  hoveredChunkKey?: string | null;
  onPronounce?: (text: string) => void;
  onSelectText: (
    text: string,
    meta?: {
      mode: "chip";
      sourceSentence: string;
      sourceTranslation?: string;
      sourceChunks?: string[];
      sentenceId: string;
    },
  ) => void;
  onHoverChunk: (chunkKey: string | null) => void;
  onSentenceTap?: (sentenceId: string) => void;
  mobileTapEnabled?: boolean;
}) {
  const [translationOpen, setTranslationOpen] = useState(false);
  const translationText = sentence.translation.trim() || "该句翻译暂未提供。";

  return (
    <Card
      className={cn(
        "space-y-3 border-border/70 p-4 transition-all duration-150 hover:border-primary/30 sm:p-5",
        mobileTapEnabled &&
          "cursor-pointer active:scale-[0.998] active:border-primary/40",
      )}
      onClick={() => {
        if (mobileTapEnabled) onSentenceTap?.(sentence.id);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        {sentence.speaker ? (
          <Badge variant="outline" className="text-[10px] tracking-[0.08em] uppercase">
            {sentence.speaker}
          </Badge>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              setTranslationOpen((prev) => !prev);
            }}
          >
            <Languages className="size-3.5" />
            {translationOpen ? "收起" : "翻译"}
          </button>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onPronounce?.(sentence.audioText ?? sentence.text);
            }}
          >
            <Volume2 className={cn("size-3.5", speaking && "animate-pulse text-primary")} />
            {speaking ? "停止" : "播放"}
          </button>
        </div>
      </div>

      <p
        data-sentence-id={sentence.id}
        data-sentence-text={sentence.text}
        data-sentence-translation={sentence.translation}
        className={cn(
          "cursor-text text-[1.04rem] leading-relaxed sm:text-lg",
          mobileTapEnabled && "selection:bg-primary/20",
        )}
      >
        {sentence.text}
      </p>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-200",
          translationOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <p className="min-h-0 rounded-md bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
          {translationText}
        </p>
      </div>

      {sentence.chunks.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sentence.chunks.map((chunk) => {
            const active = activeChunkKey?.toLowerCase() === chunk.toLowerCase();
            const hovered = hoveredChunkKey?.toLowerCase() === chunk.toLowerCase();

            return (
              <button
                key={chunk}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectText(chunk, {
                    mode: "chip",
                    sourceSentence: sentence.text,
                    sourceTranslation: sentence.translation,
                    sourceChunks: sentence.chunks,
                    sentenceId: sentence.id,
                  });
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
                onTouchStart={(event) => {
                  event.stopPropagation();
                }}
                onMouseEnter={() => onHoverChunk(chunk)}
                onMouseLeave={() => onHoverChunk(null)}
                onFocus={() => onHoverChunk(chunk)}
                onBlur={() => onHoverChunk(null)}
                className={cn(
                  "cursor-pointer rounded-full transition-transform active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
              >
                <Badge
                  variant={active ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer border-border/80 px-2.5 py-1 transition-colors",
                    !active && "hover:border-primary/40 hover:bg-accent",
                    hovered && !active && "border-primary/40 bg-accent",
                  )}
                >
                  {chunk}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

