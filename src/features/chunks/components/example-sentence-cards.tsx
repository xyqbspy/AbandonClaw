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
          className="rounded-[24px] border border-[#EEF2FC] bg-white p-[18px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-[16px] font-medium leading-[1.45] text-[#1F3F57]">
              {renderSentenceWithExpressionHighlight(example.en, expression)}
            </p>
            {onSpeak ? (
              <TtsActionButton
                active={isSpeakingText?.(example.en) ?? false}
                loading={isLoadingText?.(example.en) ?? false}
                onClick={() => onSpeak(example.en)}
                className="mt-0.5 h-9 shrink-0 rounded-full border border-[#E6EDF6] bg-[#F3F7FB] px-3 text-[13px] text-[#5B7F9E] shadow-none hover:bg-[#EFF3FA]"
                iconClassName="size-4"
                label={speakLabel}
              />
            ) : null}
          </div>
          {example.zh ? (
            <p className="mt-3 border-l-2 border-[#D4E2F0] pl-3 text-[14px] text-[#6B8AAE]">
              {example.zh}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
