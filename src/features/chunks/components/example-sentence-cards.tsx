"use client";

import { ReactNode } from "react";
import { TtsActionButton } from "@/components/audio/tts-action-button";

type ExampleSentence = {
  en: string;
  zh: string;
};

export function ExampleSentenceCards({
  examples,
  expression,
  renderSentenceWithExpressionHighlight,
  speakLabel,
  onSpeak,
  isSpeakingText,
  isLoadingText,
}: {
  examples: ExampleSentence[];
  expression: string;
  renderSentenceWithExpressionHighlight: (sentence: string, expression: string) => ReactNode;
  speakLabel: string;
  onSpeak?: (text: string) => void;
  isSpeakingText?: (text: string) => boolean;
  isLoadingText?: (text: string) => boolean;
}) {
  if (examples.length === 0) return null;

  return (
    <div className="space-y-4">
      {examples.map((example, index) => (
        <div
          key={`${example.en}-${index}`}
          className="rounded-[24px] border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-card-bg)] p-[18px] shadow-[var(--app-shadow-soft)]"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-[16px] font-medium leading-[1.45] text-[var(--app-chunks-sheet-body)]">
              {renderSentenceWithExpressionHighlight(example.en, expression)}
            </p>
            {onSpeak ? (
              <TtsActionButton
                active={isSpeakingText?.(example.en) ?? false}
                loading={isLoadingText?.(example.en) ?? false}
                onClick={() => onSpeak(example.en)}
                className="mt-0.5 h-9 shrink-0 rounded-full border border-[var(--app-chunks-sheet-secondary-border)] bg-[var(--app-chunks-sheet-info-soft)] px-3 text-[13px] text-[var(--app-chunks-sheet-secondary-text)] shadow-none hover:bg-[var(--app-chunks-sheet-secondary-hover)]"
                iconClassName="size-4"
                label={speakLabel}
              />
            ) : null}
          </div>
          {example.zh ? (
            <p className="mt-3 border-l-2 border-[var(--app-chunks-sheet-info-border)] pl-3 text-[14px] text-[var(--app-chunks-sheet-muted)]">
              {example.zh}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
