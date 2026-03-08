"use client";

import { LessonSentence } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SentenceBlock({
  sentence,
  activeChunkKey,
  hoveredChunkKey,
  onSelectText,
  onHoverChunk,
  onSentenceTap,
  mobileTapEnabled,
}: {
  sentence: LessonSentence;
  activeChunkKey?: string | null;
  hoveredChunkKey?: string | null;
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
  return (
    <Card
      className={cn(
        "space-y-4 border-border/70 p-4 transition-all duration-150 hover:border-primary/30 sm:p-5",
        mobileTapEnabled &&
          "cursor-pointer active:scale-[0.998] active:border-primary/40",
      )}
      onClick={() => {
        if (mobileTapEnabled) onSentenceTap?.(sentence.id);
      }}
    >
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
      <p className="text-sm text-muted-foreground">{sentence.translation}</p>
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
                // Keep chunk action independent from sentence-card tap selection.
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
    </Card>
  );
}
