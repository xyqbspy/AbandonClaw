"use client";

import { useMemo, useState } from "react";
import { DetailSheetShell } from "@/components/shared/detail-sheet-shell";
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

export function SelectionDetailSheet({
  currentBlock,
  currentSentence,
  chunkDetail,
  relatedChunks,
  open,
  loading,
  speakingText,
  loadingText,
  onOpenChange,
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
  showSentenceSection = true,
  showSpeaker = true,
  sentenceSectionLabel = "当前句子",
  showRelatedChunkAudio = true,
}: {
  currentBlock?: LessonBlock | null;
  currentSentence: LessonSentence | null;
  chunkDetail: SelectionChunkLayer | null;
  relatedChunks: string[];
  open: boolean;
  loading: boolean;
  speakingText: string | null;
  loadingText?: string | null;
  onOpenChange: (open: boolean) => void;
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
  showSentenceSection?: boolean;
  showSpeaker?: boolean;
  sentenceSectionLabel?: string;
  showRelatedChunkAudio?: boolean;
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
  const visibleRelatedChunks = useMemo(() => relatedChunks, [relatedChunks]);
  const sentenceText = currentSentence
    ? currentBlock && currentBlock.sentences.length > 1
      ? blockText
      : currentSentence.text
    : null;
  const translationText = blockTranslation || currentSentence?.translation || null;

  return (
    <DetailSheetShell
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="学习详情"
      closeLabel="关闭学习详情"
      containerClassName="lg:hidden"
      panelClassName="h-[82vh] max-h-[82vh] rounded-t-[28px]"
      headerClassName="items-center border-b-0 bg-transparent px-4 pb-3 pt-3"
      bodyClassName="h-[calc(82vh-128px)] px-4 pb-6 pt-5"
      footerClassName="border-t border-[var(--app-border-soft)] !bg-white p-4"
      header={<h2 className="text-[16px] font-semibold text-[var(--app-foreground)]">学习详情</h2>}
      footer={
        <SelectionDetailActions
          saved={saved}
          disabled={!chunkDetail}
          onSave={onSave}
          onReview={onReview}
        />
      }
    >
      {loading ? (
        <div className="space-y-6">
          {showSentenceSection ? (
            <div className="space-y-2">
              <div className={selectionSectionTitleClassName}>{sentenceSectionLabel}</div>
              <div className={cn(selectionCardClassName, "space-y-3 p-5")}>
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <div className={selectionSectionTitleClassName}>{phraseSectionTitle}</div>
            <div className={cn(selectionCardClassName, "space-y-3 p-5")}>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <div className={selectionSectionTitleClassName}>短语详情</div>
            <SelectionChunkDetailBlocks
              chunkDetail={chunkDetail}
              loading
              speakingText={speakingText}
              loadingText={loadingText}
              onPronounce={onPronounce}
              emptyText="点击下方短语查看解析与例句。"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {showSentenceSection ? (
            <section className="space-y-2">
              <div className={selectionSectionTitleClassName}>{sentenceSectionLabel}</div>
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
            </section>
          ) : null}

          <section className="space-y-2.5">
            <div className={selectionSectionTitleClassName}>{phraseSectionTitle}</div>
            <div className={selectionCardClassName}>
              {visibleRelatedChunks.length > 0 ? (
                visibleRelatedChunks.map((chunk, index) => {
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
                        "relative flex items-center justify-between gap-3 px-5 py-4 transition-colors",
                        active && "bg-[var(--app-chunks-sheet-info-soft)]",
                      )}
                    >
                      {index < visibleRelatedChunks.length - 1 ? (
                        <div className="absolute bottom-0 left-5 right-0 h-px bg-[var(--app-border-soft)]" />
                      ) : null}
                      <button
                        type="button"
                        className={cn(
                          "min-w-0 flex-1 text-left text-[16px] font-bold transition-colors",
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
                      {showRelatedChunkAudio ? (
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
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-4 text-[15px] leading-6 text-[var(--app-foreground-muted)]">
                  当前句暂无可用短语。
                </div>
              )}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className={selectionSectionTitleClassName}>短语详情</div>
            <SelectionChunkDetailBlocks
              chunkDetail={chunkDetail}
              loading={false}
              speakingText={speakingText}
              loadingText={loadingText}
              onPronounce={onPronounce}
              emptyText="点击下方短语查看解析与例句。"
            />
          </section>
        </div>
      )}
    </DetailSheetShell>
  );
}
