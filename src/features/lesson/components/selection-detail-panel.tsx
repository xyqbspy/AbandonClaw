import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import {
  SelectionAudioButton,
  SelectionChunkDetailBlocks,
  SelectionDetailActions,
  SelectionSentenceCard,
  selectionCardClassName,
  selectionIconButtonClassName,
  selectionSectionTitleClassName,
} from "./selection-detail-primitives";

export function SelectionDetailPanel({
  currentBlock,
  currentSentence,
  chunkDetail,
  relatedChunks,
  loading,
  speakingText,
  loadingText,
  onSave,
  onReview,
  saved = false,
  onPronounce,
  onPronounceBlock,
  onSelectRelated,
  hoveredChunkKey,
  onHoverChunk,
  playingChunkKey,
  loadingChunkKey,
  showSpeaker = true,
  sentenceSectionLabel = "当前句子",
}: {
  currentBlock?: LessonBlock | null;
  currentSentence: LessonSentence | null;
  chunkDetail: SelectionChunkLayer | null;
  relatedChunks: string[];
  loading: boolean;
  speakingText: string | null;
  loadingText?: string | null;
  onSave: () => void;
  onReview: () => void;
  saved?: boolean;
  onPronounce: (text: string) => void;
  onPronounceBlock: () => void;
  onSelectRelated: (chunk: string) => void;
  hoveredChunkKey: string | null;
  onHoverChunk: (chunkKey: string | null) => void;
  playingChunkKey?: string | null;
  loadingChunkKey?: string | null;
  showSpeaker?: boolean;
  sentenceSectionLabel?: string;
}) {
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const blockText = currentBlock?.sentences.map((sentence) => sentence.text).join(" ");
  const blockTranslation =
    currentBlock?.translation?.trim() ||
    currentBlock?.sentences
      .map((sentence) => sentence.translation?.trim())
      .filter(Boolean)
      .join(" ");
  const blockSpeakText =
    currentBlock?.tts?.trim() ||
    currentBlock?.sentences
      .map((sentence) => sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text)
      .filter(Boolean)
      .join(" ") ||
    currentSentence?.tts?.trim() ||
    currentSentence?.audioText?.trim() ||
    currentSentence?.text ||
    "";

  const selectedChunkText = chunkDetail?.text.toLowerCase() ?? null;
  const phraseSectionTitle = showSpeaker ? "本轮相关短语" : "本句相关短语";
  const sentenceText = currentSentence
    ? currentBlock && currentBlock.sentences.length > 1
      ? blockText
      : currentSentence.text
    : null;
  const translationText = blockTranslation || currentSentence?.translation || null;

  return (
    <div className="sticky top-20 hidden rounded-[28px] bg-[rgba(242,242,247,0.96)] p-[var(--mobile-space-sheet)] shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-[24px] lg:block">
      <div className="space-y-[var(--mobile-space-2xl)]">
        <section className="space-y-[var(--mobile-space-sm)]">
          <div className={selectionSectionTitleClassName}>{sentenceSectionLabel}</div>
          {loading ? (
            <div
              className={cn(
                selectionCardClassName,
                "space-y-[var(--mobile-space-md)] p-[var(--mobile-space-sheet)]",
              )}
            >
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <SelectionSentenceCard
              sentenceText={sentenceText}
              translationText={translationText}
              speakingText={speakingText}
              loadingText={loadingText}
              blockSpeakText={blockSpeakText}
              showTranslation={showSentenceTranslation}
              onToggleTranslation={() => setShowSentenceTranslation((prev) => !prev)}
              onPronounceBlock={onPronounceBlock}
              emptyText="先选择一句内容，查看整句理解。"
            />
          )}
        </section>

        <section className="space-y-[var(--mobile-space-sm)]">
          <div className={selectionSectionTitleClassName}>{phraseSectionTitle}</div>
          <div className={selectionCardClassName}>
            {loading ? (
              <div className="space-y-[var(--mobile-space-md)] p-[var(--mobile-space-sheet)]">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : relatedChunks.length > 0 ? (
              relatedChunks.map((chunk, index) => {
                const normalizedChunk = chunk.toLowerCase();
                const active = selectedChunkText === normalizedChunk;
                const hovered = hoveredChunkKey?.toLowerCase() === normalizedChunk;
                const sounding =
                  playingChunkKey?.toLowerCase() === normalizedChunk ||
                  loadingChunkKey?.toLowerCase() === normalizedChunk;
                return (
                  <div
                    key={chunk}
                    className={cn(
                      "relative flex items-center justify-between gap-[var(--mobile-space-md)] px-[var(--mobile-space-sheet)] py-[var(--mobile-adapt-overlay-related-row-py)] transition-colors",
                      active && "bg-[var(--app-chunks-sheet-info-soft)]",
                    )}
                  >
                    {index < relatedChunks.length - 1 ? (
                      <div className="absolute bottom-0 left-[var(--mobile-space-sheet)] right-0 h-px bg-[var(--app-border-soft)]" />
                    ) : null}
                    <button
                      type="button"
                      className={cn(
                        "min-w-0 flex-1 text-left text-[length:var(--mobile-font-body)] font-bold transition-colors",
                        active ? "text-[var(--app-primary)]" : "text-[var(--app-foreground)]",
                        hovered && !active && "text-[var(--app-primary)]",
                      )}
                      onClick={() => onSelectRelated(chunk)}
                      onMouseEnter={() => onHoverChunk(chunk)}
                      onMouseLeave={() => onHoverChunk(null)}
                      onFocus={() => onHoverChunk(chunk)}
                      onBlur={() => onHoverChunk(null)}
                    >
                      {chunk}
                    </button>
                    <SelectionAudioButton
                      active={Boolean(
                        playingChunkKey && playingChunkKey.toLowerCase() === normalizedChunk,
                      )}
                      loading={Boolean(
                        loadingChunkKey && loadingChunkKey.toLowerCase() === normalizedChunk,
                      )}
                      label={`朗读 ${chunk}`}
                      className={cn(
                        selectionIconButtonClassName,
                        sounding &&
                          "bg-[var(--app-chunks-sheet-info-soft)] text-[var(--app-primary)]",
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        onPronounce(chunk);
                      }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="px-[var(--mobile-space-sheet)] py-[var(--mobile-adapt-overlay-related-row-py)] text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[var(--app-foreground-muted)]">
                当前句暂无可用短语。
              </div>
            )}
          </div>
        </section>

        <section className="space-y-[var(--mobile-space-sm)]">
          <div className={selectionSectionTitleClassName}>短语详情</div>
          <SelectionChunkDetailBlocks
            chunkDetail={chunkDetail}
            loading={loading}
            speakingText={speakingText}
            loadingText={loadingText}
            onPronounce={onPronounce}
            emptyText="点击下方短语查看解析与例句。"
          />
          {!loading ? (
            <SelectionDetailActions
              saved={saved}
              disabled={!chunkDetail}
              onSave={onSave}
              onReview={onReview}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
