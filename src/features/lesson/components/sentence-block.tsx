"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { LessonSentence } from "@/lib/types";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const normalizeSpeaker = (speaker?: string) => (speaker ?? "").trim().toUpperCase();
const isPrimarySpeaker = (speaker?: string) => normalizeSpeaker(speaker) === "A";

const speakerBadgeClassName = (speaker?: string) => {
  if (isPrimarySpeaker(speaker)) {
    return "border-sky-200/80 bg-sky-50/50 text-sky-700";
  }
  return "border-emerald-200/80 bg-emerald-50/50 text-emerald-700";
};

const speakerLabel = (speaker?: string) => normalizeSpeaker(speaker) || "A";
const getSentenceSpeakText = (sentence: LessonSentence) =>
  (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim();

export function SentenceBlock({
  sentence,
  showSpeaker = true,
  speaking,
  loading = false,
  activeChunkKey,
  hoveredChunkKey,
  onPronounce,
  onSelectText,
  onHoverChunk,
  onSentenceTap,
  mobileTapEnabled,
}: {
  sentence: LessonSentence;
  showSpeaker?: boolean;
  speaking?: boolean;
  loading?: boolean;
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
    <div
      className={cn(
        "transition-colors duration-150",
        showSpeaker
          ? "rounded-lg px-2 py-2.5 hover:bg-muted/35"
          : "space-y-3 border border-border/70 p-4 hover:border-primary/30 sm:p-5",
        mobileTapEnabled &&
          "cursor-pointer active:scale-[0.998] active:border-primary/40",
        showSpeaker && isPrimarySpeaker(sentence.speaker) && "sm:mr-14",
        showSpeaker && !isPrimarySpeaker(sentence.speaker) && "sm:ml-14",
      )}
      onClick={() => {
        if (mobileTapEnabled) onSentenceTap?.(sentence.id);
      }}
    >
      <div className="mb-1 flex items-center justify-end gap-3 text-xs text-muted-foreground">
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
          <TtsActionButton
            active={speaking}
            loading={loading}
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onPronounce?.(getSentenceSpeakText(sentence));
            }}
          />
        </div>
      </div>

      {showSpeaker && sentence.speaker ? (
        <div className="flex items-start gap-2">
          <Badge
            variant="outline"
            className={cn(
              "mt-0.5 h-5 min-w-5 justify-center px-1.5 text-[10px] tracking-[0.04em]",
              speakerBadgeClassName(sentence.speaker),
            )}
          >
            {speakerLabel(sentence.speaker)}
          </Badge>
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
        </div>
      ) : (
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
      )}

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
    </div>
  );
}


