"use client";

import { LessonSentence } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SentenceBlock({
  sentence,
  activeText,
  onSelectText,
}: {
  sentence: LessonSentence;
  activeText?: string;
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
}) {
  return (
    <Card className="space-y-4 border-border/70 p-4 transition-all duration-150 hover:border-primary/30 sm:p-5">
      <p
        data-sentence-id={sentence.id}
        data-sentence-text={sentence.text}
        data-sentence-translation={sentence.translation}
        className="cursor-text text-[1.04rem] leading-relaxed sm:text-lg"
      >
        {sentence.text}
      </p>
      <p className="text-sm text-muted-foreground">{sentence.translation}</p>
      <div className="flex flex-wrap gap-2">
        {sentence.chunks.map((chunk) => {
          const active = activeText?.toLowerCase() === chunk.toLowerCase();

          return (
            <button
              key={chunk}
              type="button"
              onClick={() =>
                onSelectText(chunk, {
                  mode: "chip",
                  sourceSentence: sentence.text,
                  sourceTranslation: sentence.translation,
                  sourceChunks: sentence.chunks,
                  sentenceId: sentence.id,
                })
              }
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
