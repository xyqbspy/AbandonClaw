"use client";

import { useMemo, useState } from "react";
import { Languages, Loader2, Volume2 } from "lucide-react";
import { LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DetailSheetShell } from "@/components/shared/detail-sheet-shell";

const sheetSectionTitleClassName = "px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]";
const sheetCardClassName =
  "overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]";
const sheetDetailRowClassName = "px-5 py-4";
const sheetDetailLabelClassName = "mb-1.5 block text-xs font-bold text-[#007AFF]";
const sheetDetailValueClassName = "text-[15px] leading-6 text-[#3A3A3C]";
const sheetActionButtonClassName =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border-0 px-3.5 text-[13px] font-semibold transition-all duration-150 active:scale-[0.96] active:opacity-80";
const sheetIconButtonClassName =
  "inline-flex size-9 items-center justify-center rounded-full border-0 bg-[#EEEEF0] text-[#3A3A3C] transition-all duration-150 active:scale-[0.96] active:opacity-80";

const hasChinese = (value?: string) => /[\u4e00-\u9fff]/.test((value ?? "").trim());

function AudioIcon({
  active,
  loading,
}: {
  active?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <Loader2 className="size-4 animate-spin" />;
  }
  return <Volume2 className={cn("size-4", active && "text-[#007AFF]")} />;
}

function AudioButton({
  active = false,
  loading = false,
  label,
  className,
  onClick,
}: {
  active?: boolean;
  loading?: boolean;
  label: string;
  className?: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(className)}
      onClick={onClick}
    >
      <AudioIcon active={active} loading={loading} />
    </button>
  );
}

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
  const selectedChunkDetail = chunkDetail;
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
  const visibleExamples = useMemo(() => chunkDetail?.examples.slice(0, 2) ?? [], [chunkDetail]);

  return (
    <DetailSheetShell
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="学习详情"
      closeLabel="关闭学习详情"
      containerClassName="lg:hidden"
      panelClassName="h-[82vh] max-h-[82vh] rounded-t-[28px] bg-[#F2F2F7]"
      headerClassName="items-center border-b border-black/5 bg-[#F2F2F7] px-4 pb-3 pt-3"
      bodyClassName="h-[calc(82vh-128px)] bg-[#F2F2F7] px-4 pb-6 pt-5"
      footerClassName="border-t border-black/5 bg-[rgba(255,255,255,0.8)] p-4 backdrop-blur-[20px]"
      header={<h2 className="text-[16px] font-semibold text-[#1C1C1E]">学习详情</h2>}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="ghost"
            className="h-12 cursor-pointer rounded-[14px] border border-[#D9D9DE] bg-white text-[15px] font-bold text-[#1C1C1E] transition-all duration-150 active:scale-[0.96]"
            onClick={onSave}
            disabled={!chunkDetail}
          >
            {saved ? "已收藏" : "收藏短语"}
          </Button>
          <Button
            variant="ghost"
            className="h-12 cursor-pointer rounded-[14px] border-0 bg-[#007AFF] text-[15px] font-bold text-white transition-all duration-150 active:scale-[0.96] disabled:bg-[#D0D7E2] disabled:text-white/80"
            onClick={onReview}
            disabled={!chunkDetail}
          >
            加入复习
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className={sheetSectionTitleClassName}>{sentenceSectionLabel}</div>
            <div className={cn("space-y-3 p-5", sheetCardClassName)}>
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <div className={sheetSectionTitleClassName}>{phraseSectionTitle}</div>
            <div className={cn("space-y-3 p-5", sheetCardClassName)}>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <div className={sheetSectionTitleClassName}>短语详情</div>
            <div className={cn("space-y-3 p-5", sheetCardClassName)}>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {showSentenceSection ? (
            <section className="space-y-2">
              <div className={sheetSectionTitleClassName}>{sentenceSectionLabel}</div>
              <div className={cn("p-5", sheetCardClassName)}>
                {currentSentence ? (
                  <>
                    <p className="text-[18px] font-medium leading-8 text-[#1C1C1E]">
                      {currentBlock && currentBlock.sentences.length > 1 ? blockText : currentSentence.text}
                    </p>
                    <div className="mt-4 flex gap-2.5">
                      <button
                        type="button"
                        className={cn(sheetActionButtonClassName, "bg-[#E5E5EA] text-[#1C1C1E]")}
                        onClick={() => setShowSentenceTranslation((prev) => !prev)}
                      >
                        <Languages className="size-4" />
                        {showSentenceTranslation ? "收起" : "翻译"}
                      </button>
                      <button
                        type="button"
                        aria-label="朗读"
                        className={cn(sheetActionButtonClassName, "bg-[#E5F1FF] text-[#007AFF]")}
                        onClick={onPronounceBlock}
                      >
                        <AudioIcon active={speakingText === blockSpeakText} loading={loadingText === blockSpeakText} />
                        朗读
                      </button>
                    </div>
                    {showSentenceTranslation ? (
                      <p className="mt-4 text-[15px] leading-7 text-[#3A3A3C]">
                        {blockTranslation || currentSentence.translation || "该句翻译待补充。"}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[15px] leading-6 text-[#8E8E93]">点击左侧句子开始学习。</p>
                )}
              </div>
            </section>
          ) : null}

          <section className="space-y-2.5">
            <div className={sheetSectionTitleClassName}>{phraseSectionTitle}</div>
            <div className={sheetCardClassName}>
              {relatedChunks.length > 0 ? (
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
                        "relative flex items-center justify-between gap-3 px-5 py-4 transition-colors",
                        active && "bg-[#F0F7FF]",
                      )}
                    >
                      {index < relatedChunks.length - 1 ? (
                        <div className="absolute bottom-0 left-5 right-0 h-px bg-black/5" />
                      ) : null}
                      <button
                        type="button"
                        className={cn(
                          "min-w-0 flex-1 text-left text-[16px] font-bold transition-colors",
                          active ? "text-[#007AFF]" : "text-[#1C1C1E]",
                          hovered && !active && "text-[#007AFF]",
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
                        <AudioButton
                          active={Boolean(playingChunkKey && playingChunkKey.toLowerCase() === normalizedChunk)}
                          loading={Boolean(loadingChunkKey && loadingChunkKey.toLowerCase() === normalizedChunk)}
                          label={`朗读 ${chunk}`}
                          className={cn(
                            sheetIconButtonClassName,
                            sounding && "bg-[#E5F1FF] text-[#007AFF]",
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
                <div className="px-5 py-4 text-[15px] leading-6 text-[#8E8E93]">当前句暂无可用短语。</div>
              )}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className={sheetSectionTitleClassName}>短语详情</div>
            <div className={cn("overflow-visible", sheetCardClassName)}>
              {selectedChunkDetail ? (
                <>
                  <div className={cn(sheetDetailRowClassName, "pt-5")}>
                    <span className={sheetDetailLabelClassName}>中文释义</span>
                    <div className={sheetDetailValueClassName}>{selectedChunkDetail.translation}</div>
                  </div>
                  <div className={cn(sheetDetailRowClassName, "border-t border-black/5")}>
                    <span className={sheetDetailLabelClassName}>当前句中含义</span>
                    <div className={sheetDetailValueClassName}>
                      {hasChinese(selectedChunkDetail.meaningInSentence)
                        ? selectedChunkDetail.meaningInSentence
                        : `这里表示：${selectedChunkDetail.translation || "该表达在本句中的含义。"}`}
                    </div>
                  </div>
                  <div className={cn(sheetDetailRowClassName, "border-t border-black/5")}>
                    <span className={sheetDetailLabelClassName}>常见用法</span>
                    <div className={sheetDetailValueClassName}>
                      {hasChinese(selectedChunkDetail.grammarLabel) ? `${selectedChunkDetail.grammarLabel} · ` : ""}
                      {hasChinese(selectedChunkDetail.usageNote)
                        ? selectedChunkDetail.usageNote
                        : "先理解它在这句话里的作用，再放回整句复述。"}
                    </div>
                  </div>
                  <div className={cn(sheetDetailRowClassName, "border-t border-black/5")}>
                    <span className={sheetDetailLabelClassName}>经典例句</span>
                    <div className="space-y-3">
                      {visibleExamples.map((example, index) => (
                        <div
                          key={`${example.en}-${index}`}
                          className="flex items-start justify-between gap-3 rounded-[12px] bg-[#F8F8FA] p-3.5"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold leading-5.5 text-[#1C1C1E]">
                              {example.en}
                            </span>
                            <span className="mt-1 block text-[12px] leading-5 text-[#8E8E93]">
                              {hasChinese(example.zh) ? example.zh : "该例句翻译待补充。"}
                            </span>
                          </div>
                          <AudioButton
                            active={speakingText === example.en}
                            loading={loadingText === example.en}
                            label="朗读例句"
                            className={sheetIconButtonClassName}
                            onClick={() => onPronounce(example.en)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-5 py-4 text-[15px] leading-6 text-[#8E8E93]">
                  点击下方短语查看解析与例句。
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </DetailSheetShell>
  );
}
