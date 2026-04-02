"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { LessonSentence } from "@/lib/types";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { APPLE_BODY_TEXT, APPLE_META_TEXT, APPLE_PANEL } from "@/lib/ui/apple-style";

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
  const translationButton = (
    <button
      type="button"
      className={`mt-0.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground ${APPLE_META_TEXT}`}
      aria-label={translationOpen ? "隐藏翻译" : "显示翻译"}
      onClick={(event) => {
        event.stopPropagation();
        setTranslationOpen((prev) => !prev);
      }}
    >
      <Languages className="size-3.5" />
    </button>
  );
  const audioButton = (
    <TtsActionButton
      active={speaking}
      loading={loading}
      variant="ghost"
      size="icon-sm"
      className={`mt-0.5 ${APPLE_META_TEXT} hover:text-foreground`}
      ariaLabel={speaking ? "停止朗读" : "朗读"}
      onClick={(event) => {
        event.stopPropagation();
        onPronounce?.(getSentenceSpeakText(sentence));
      }}
    />
  );

  return (
    <div
      className={cn(
        "transition-colors duration-150",
        showSpeaker
          ? `rounded-[var(--app-radius-panel)] px-[var(--mobile-adapt-space-sm)] py-[var(--mobile-adapt-space-md)] hover:bg-[var(--app-surface-hover)]`
          : `space-y-[var(--mobile-adapt-space-md)] rounded-[var(--app-radius-card)] border border-[var(--app-border-soft)] p-[var(--mobile-adapt-space-sheet)] hover:border-[var(--app-border-strong)] sm:p-5`,
        mobileTapEnabled &&
          "cursor-pointer active:scale-[0.998] active:border-primary/40",
        showSpeaker && isPrimarySpeaker(sentence.speaker) && "sm:mr-14",
        showSpeaker && !isPrimarySpeaker(sentence.speaker) && "sm:ml-14",
      )}
      onClick={() => {
        if (mobileTapEnabled) onSentenceTap?.(sentence.id);
      }}
    >
      {showSpeaker && sentence.speaker ? (
        <div className="flex items-start gap-[var(--mobile-adapt-space-sm)]">
          <Badge
            variant="outline"
            className={cn(
              "mt-[2px] h-[clamp(18px,4.8vw,20px)] min-w-[clamp(18px,4.8vw,20px)] justify-center px-[var(--mobile-adapt-space-sm)] text-[length:var(--mobile-adapt-font-caption)] tracking-[0.04em]",
              speakerBadgeClassName(sentence.speaker),
            )}
          >
            {speakerLabel(sentence.speaker)}
          </Badge>
          <div className="flex min-w-0 flex-1 items-start gap-[var(--mobile-adapt-space-sm)]">
            <p
              data-sentence-id={sentence.id}
              data-sentence-text={sentence.text}
              data-sentence-translation={sentence.translation}
              className={cn(
                `min-w-0 flex-1 cursor-text text-[length:var(--mobile-adapt-font-body)] leading-relaxed ${APPLE_BODY_TEXT} sm:text-lg`,
                mobileTapEnabled && "selection:bg-primary/20",
              )}
            >
              {sentence.text}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {translationButton}
              {audioButton}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-[var(--mobile-adapt-space-sm)]">
          <p
            data-sentence-id={sentence.id}
            data-sentence-text={sentence.text}
            data-sentence-translation={sentence.translation}
            className={cn(
              `min-w-0 flex-1 cursor-text text-[length:var(--mobile-adapt-font-body)] leading-relaxed ${APPLE_BODY_TEXT} sm:text-lg`,
              mobileTapEnabled && "selection:bg-primary/20",
            )}
          >
            {sentence.text}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {translationButton}
            {audioButton}
          </div>
        </div>
      )}

      <div
        className={cn(
          "mt-[var(--mobile-adapt-space-2xs)] grid overflow-hidden transition-all duration-200",
          translationOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <p className={`min-h-0 rounded-[var(--app-radius-panel)] px-[var(--mobile-adapt-space-md)] py-[var(--mobile-adapt-space-sm)] text-[length:var(--mobile-adapt-font-body-sm)] ${APPLE_META_TEXT} ${APPLE_PANEL}`}>
          {translationText}
        </p>
      </div>

      {sentence.chunks.length > 0 ? (
        <div className="flex flex-wrap gap-[var(--mobile-adapt-space-sm)]">
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
                    "cursor-pointer border-border/80 px-[var(--mobile-adapt-space-md)] py-[var(--mobile-adapt-space-2xs)] text-[length:var(--mobile-adapt-font-meta)] transition-colors",
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


