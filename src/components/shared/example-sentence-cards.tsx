"use client";

import { ReactNode } from "react";
import { TtsActionButton } from "@/components/audio/tts-action-button";

type ExampleSentence = {
  en: string;
  zh: string;
};

type ExampleSentenceCardsVariant = "default" | "marketing";

export function ExampleSentenceCards({
  examples,
  expression,
  renderSentenceWithExpressionHighlight,
  speakLabel,
  onSpeak,
  isSpeakingText,
  isLoadingText,
  variant = "default",
}: {
  examples: ExampleSentence[];
  expression: string;
  renderSentenceWithExpressionHighlight: (sentence: string, expression: string) => ReactNode;
  speakLabel: string;
  onSpeak?: (text: string) => void;
  isSpeakingText?: (text: string) => boolean;
  isLoadingText?: (text: string) => boolean;
  variant?: ExampleSentenceCardsVariant;
}) {
  if (examples.length === 0) return null;

  const isMarketingVariant = variant === "marketing";

  return (
    <div className="space-y-4">
      {examples.map((example, index) => (
        <div
          key={`${example.en}-${index}`}
          className={
            isMarketingVariant
              ? "rounded-2xl border border-dashed border-[#c7c7cc] bg-white p-5 shadow-none"
              : "rounded-[24px] border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-card-bg)] p-[18px] shadow-[var(--app-shadow-soft)]"
          }
        >
          <div className="flex items-start justify-between gap-3">
            <p
              className={
                isMarketingVariant
                  ? "min-w-0 flex-1 text-sm italic leading-7 text-[#1d1d1f]"
                  : "min-w-0 flex-1 text-[16px] font-medium leading-[1.45] text-[var(--app-chunks-sheet-body)]"
              }
            >
              {renderSentenceWithExpressionHighlight(example.en, expression)}
            </p>
            {onSpeak ? (
              <TtsActionButton
                active={isSpeakingText?.(example.en) ?? false}
                loading={isLoadingText?.(example.en) ?? false}
                onClick={() => onSpeak(example.en)}
                className="mt-0.5 size-9 shrink-0 rounded-full border-transparent bg-transparent px-0 text-[var(--app-chunks-sheet-secondary-text)] shadow-none hover:bg-transparent hover:text-[var(--app-chunks-sheet-title)]"
                iconClassName="size-4"
                label={speakLabel}
                iconOnly
              />
            ) : null}
          </div>
          {example.zh ? (
            <p
              className={
                isMarketingVariant
                  ? "mt-3 border-l-2 border-[#c7c7cc] pl-3 text-sm leading-6 text-[#86868b]"
                  : "mt-3 border-l-2 border-[var(--app-chunks-sheet-info-border)] pl-3 text-[14px] text-[var(--app-chunks-sheet-muted)]"
              }
            >
              {example.zh}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
