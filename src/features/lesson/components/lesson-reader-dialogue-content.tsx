"use client";

import { ReactNode, useState } from "react";
import { ArrowLeft, Languages } from "lucide-react";
import { LoopActionButton } from "@/components/audio/loop-action-button";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { LessonBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const normalizeSpeaker = (speaker?: string) => (speaker ?? "").trim().toUpperCase();
const isPrimarySpeaker = (speaker?: string) => normalizeSpeaker(speaker) === "A";
const speakerLabel = (speaker?: string) => normalizeSpeaker(speaker);

type LessonReaderDialogueContentProps = {
  blockOrder: LessonBlock[];
  isMobile: boolean;
  isTrainingMode: boolean;
  activeTrainingSentenceText?: string | null;
  resolvedHeaderTitle: string;
  topRightTool?: ReactNode;
  onBackToList?: () => void;
  isSceneLooping: boolean;
  isSceneLoopLoading: boolean;
  toggleSceneLoopPlayback: () => void;
  isSentencePlaying: (sentenceId: string) => boolean;
  playbackState: {
    kind: string | null;
    status?: string | null;
    sentenceId?: string | null;
  };
  handleSentenceTap: (sentenceId: string, blockId?: string) => void;
  playBlockTts: (block: LessonBlock) => Promise<void> | void;
};

export function LessonReaderDialogueContent({
  blockOrder,
  isMobile,
  isTrainingMode,
  activeTrainingSentenceText,
  resolvedHeaderTitle,
  topRightTool,
  onBackToList,
  isSceneLooping,
  isSceneLoopLoading,
  toggleSceneLoopPlayback,
  isSentencePlaying,
  playbackState,
  handleSentenceTap,
  playBlockTts,
}: LessonReaderDialogueContentProps) {
  const [openTranslations, setOpenTranslations] = useState<Record<string, boolean>>({});

  return (
    <div
      className={cn(
        isTrainingMode
          ? "min-h-[calc(100vh-clamp(150px,38vw,180px))] bg-[#f4f7f9] pb-[calc(var(--mobile-button-height)+64px)] pt-[var(--mobile-space-sm)]"
          : "space-y-[clamp(20px,5.6vw,30px)]",
        isMobile && !isTrainingMode && "space-y-[var(--mobile-space-sm)]",
        "overflow-x-hidden",
      )}
    >
      {isTrainingMode ? (
        <div className="pb-[var(--mobile-space-2xl)]">
          <div
            className="relative flex min-h-[var(--mobile-control-height)] items-start justify-center"
            data-current-training-sentence={activeTrainingSentenceText}
          >
            {onBackToList ? (
              <button
                type="button"
                aria-label="返回场景列表"
                className="absolute left-0 top-0 inline-flex size-[var(--mobile-icon-button)] items-start justify-start pt-[2px] text-[#2c3e50] transition"
                onClick={onBackToList}
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : null}
            <div className="w-full min-w-0 max-w-full overflow-hidden px-[var(--mobile-header-side)] pt-0.5 text-center">
              <h1 className="truncate whitespace-nowrap text-[length:var(--mobile-font-title)] font-semibold text-[#333]">
                {resolvedHeaderTitle}
              </h1>
            </div>
            {topRightTool ? (
              <div className="absolute right-0 top-0 flex items-center gap-[var(--mobile-space-sm)]">
                {topRightTool}
              </div>
            ) : null}
            {!topRightTool ? (
              <LoopActionButton
                active={isSceneLooping}
                loading={isSceneLoopLoading}
                variant="ghost"
                size="icon-sm"
                iconOnly
                icon="tts"
                ariaLabel={isSceneLooping ? "停止循环播放" : "循环播放场景"}
                className="absolute right-0 top-0 size-[var(--mobile-icon-button)] text-[#2c3e50]"
                iconClassName="size-3.5"
                onClick={toggleSceneLoopPlayback}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "space-y-[clamp(20px,5.6vw,30px)]",
          isMobile && !isTrainingMode && "space-y-[var(--mobile-space-sm)]",
        )}
      >
        {blockOrder.map((block) => {
          const speaker = block.speaker ?? "A";
          const primarySpeaker = isPrimarySpeaker(speaker);
          const blockTranslation =
            block.translation?.trim() ||
            block.sentences
              .map((sentence) => sentence.translation?.trim())
              .filter(Boolean)
              .join(" ");
          const blockPlaybackId = `block-${block.id}`;
          const isBlockSpeaking =
            (playbackState.kind === "sentence" &&
              playbackState.sentenceId === blockPlaybackId) ||
            block.sentences.some((sentence) => isSentencePlaying(sentence.id));
          const isBlockLoading =
            playbackState.kind === "sentence" &&
            playbackState.status === "loading" &&
            playbackState.sentenceId === blockPlaybackId;
          const speakerText = speakerLabel(speaker) || "A";
          const translationOpen = Boolean(openTranslations[block.id]);

          return (
            <div
              key={block.id}
              className={cn("flex w-full flex-col", primarySpeaker ? "items-start" : "items-end")}
            >
              <div
                className={cn(
                  "flex max-w-[var(--mobile-dialogue-width)] flex-col gap-[var(--mobile-space-md)] sm:max-w-[85%]",
                  primarySpeaker ? "items-start" : "items-end",
                )}
              >
                <article
                  className={cn(
                    "w-full break-words px-[var(--mobile-bubble-px)] py-[var(--mobile-bubble-py)] text-[length:var(--mobile-font-body)] leading-[1.42] shadow-[0_4px_15px_rgba(0,0,0,0.03)]",
                    primarySpeaker
                      ? "rounded-[18px_18px_18px_4px] bg-white text-[#333]"
                      : "rounded-[18px_18px_4px_18px] bg-[#b5d1ff] text-[#1a2a40]",
                  )}
                >
                  <div className="flex items-start gap-1.5">
                    <span className="shrink-0 text-[clamp(13px,3.4vw,14px)] font-semibold">
                      {speakerText}:
                    </span>
                    <div className="min-w-0 flex-1 space-y-[var(--mobile-space-sm)]">
                      {block.sentences.map((sentence) => (
                        <div key={sentence.id} className="space-y-[var(--mobile-space-2xs)]">
                          <p
                            data-sentence-id={sentence.id}
                            data-sentence-text={sentence.text}
                            data-sentence-translation={sentence.translation}
                            className={cn(
                              "cursor-pointer break-words text-[length:var(--mobile-font-body)] leading-[1.42]",
                              isSentencePlaying(sentence.id) && "opacity-80",
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSentenceTap(sentence.id, block.id);
                            }}
                          >
                            {sentence.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>

                <div className="flex items-center gap-1 px-[var(--mobile-space-xs)]">
                  <button
                    type="button"
                    aria-label={translationOpen ? "隐藏翻译" : "显示翻译"}
                    className="inline-flex size-[var(--mobile-icon-button)] items-center justify-center text-[#8e9aaf] transition hover:text-[#2c3e50]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenTranslations((prev) => ({
                        ...prev,
                        [block.id]: !prev[block.id],
                      }));
                    }}
                  >
                    <Languages className="size-3.5" />
                  </button>
                  <TtsActionButton
                    active={isBlockSpeaking}
                    loading={isBlockLoading}
                    variant="ghost"
                    size="icon-sm"
                    ariaLabel={isBlockSpeaking ? "停止朗读" : "朗读"}
                    className={cn(
                      "text-[#8e9aaf] hover:text-[#2c3e50]",
                      isBlockSpeaking && "text-[#4a90e2] hover:text-[#4a90e2]",
                    )}
                    iconClassName="size-3.5"
                    onClick={(event) => {
                      event.stopPropagation();
                      void playBlockTts(block);
                    }}
                  />
                </div>

                <div
                  className={cn(
                    "grid overflow-hidden px-[var(--mobile-space-xs)] transition-all duration-200",
                    translationOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <p className="min-h-0 text-[length:var(--mobile-font-body-sm)] leading-[1.55] text-[#8e9aaf]">
                    {blockTranslation || "该段翻译暂未提供。"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
