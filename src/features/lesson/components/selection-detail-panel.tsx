import { useState } from "react";
import { Languages, Loader2, Volume2 } from "lucide-react";
import { LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const panelSectionTitleClassName = "px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]";
const panelCardClassName =
  "overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]";
const panelDetailRowClassName = "px-5 py-4";
const panelDetailLabelClassName = "mb-1.5 block text-xs font-bold text-[#007AFF]";
const panelDetailValueClassName = "text-[15px] leading-6 text-[#3A3A3C]";
const panelActionButtonClassName =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border-0 px-3.5 text-[13px] font-semibold transition-all duration-150 active:scale-[0.96] active:opacity-80";
const panelIconButtonClassName =
  "inline-flex size-8 items-center justify-center rounded-full border-0 bg-[#EEEEF0] text-[#3A3A3C] transition-all duration-150 active:scale-[0.96] active:opacity-80";

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
    <button type="button" aria-label={label} className={cn(className)} onClick={onClick}>
      <AudioIcon active={active} loading={loading} />
    </button>
  );
}

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
  const visibleExamples = chunkDetail?.examples.slice(0, 2) ?? [];

  return (
    <div className="sticky top-20 hidden rounded-[28px] bg-[#F2F2F7] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] lg:block">
      <div className="space-y-6">
      <section className="space-y-2">
        <div className={panelSectionTitleClassName}>{sentenceSectionLabel}</div>
        <div className={cn("p-5", panelCardClassName)}>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : currentSentence ? (
            <>
              <p className="text-[18px] font-medium leading-8 text-[#1C1C1E]">
                {currentBlock && currentBlock.sentences.length > 1 ? blockText : currentSentence.text}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className={cn(panelActionButtonClassName, "bg-[#E5E5EA] text-[#1C1C1E]")}
                  onClick={() => setShowSentenceTranslation((prev) => !prev)}
                >
                  <Languages className="size-4" />
                  {showSentenceTranslation ? "收起" : "翻译"}
                </button>
                <button
                  type="button"
                  aria-label="朗读"
                  className={cn(panelActionButtonClassName, "bg-[#E5F1FF] text-[#007AFF]")}
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
            <p className="text-[15px] leading-6 text-[#8E8E93]">先选择一句内容，查看整句理解。</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className={panelSectionTitleClassName}>{phraseSectionTitle}</div>
        <div className={panelCardClassName}>
          {loading ? (
            <div className="space-y-3 p-5">
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
                  <AudioButton
                    active={Boolean(playingChunkKey && playingChunkKey.toLowerCase() === normalizedChunk)}
                    loading={Boolean(loadingChunkKey && loadingChunkKey.toLowerCase() === normalizedChunk)}
                    label={`朗读 ${chunk}`}
                    className={cn(panelIconButtonClassName, sounding && "bg-[#E5F1FF] text-[#007AFF]")}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPronounce(chunk);
                    }}
                  />
                </div>
              );
            })
          ) : (
            <div className="px-5 py-4 text-[15px] leading-6 text-[#8E8E93]">当前句暂无可用短语。</div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className={panelSectionTitleClassName}>短语详情</div>
        <div className={panelCardClassName}>
          {loading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : chunkDetail ? (
            <>
              <div className={cn(panelDetailRowClassName, "pt-5")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] font-semibold leading-7 text-[#1C1C1E]">{chunkDetail.text}</p>
                  </div>
                  <AudioButton
                    active={speakingText === chunkDetail.text}
                    loading={loadingText === chunkDetail.text}
                    label={`朗读 ${chunkDetail.text}`}
                    className={panelIconButtonClassName}
                    onClick={() => onPronounce(chunkDetail.text)}
                  />
                </div>
              </div>
              <div className={cn(panelDetailRowClassName, "border-t border-black/5")}>
                <span className={panelDetailLabelClassName}>中文释义</span>
                <div className={panelDetailValueClassName}>{chunkDetail.translation}</div>
              </div>
              <div className={cn(panelDetailRowClassName, "border-t border-black/5")}>
                <span className={panelDetailLabelClassName}>当前句中含义</span>
                <div className={panelDetailValueClassName}>
                  {hasChinese(chunkDetail.meaningInSentence)
                    ? chunkDetail.meaningInSentence
                    : `这里表示：${chunkDetail.translation || "该表达在本句中的含义。"}`}
                </div>
              </div>
              <div className={cn(panelDetailRowClassName, "border-t border-black/5")}>
                <span className={panelDetailLabelClassName}>常见用法</span>
                <div className={panelDetailValueClassName}>
                  {hasChinese(chunkDetail.grammarLabel) ? `${chunkDetail.grammarLabel} · ` : ""}
                  {hasChinese(chunkDetail.usageNote)
                    ? chunkDetail.usageNote
                    : "先理解它在这句话里的作用，再放回整句复述。"}
                </div>
              </div>
              <div className={cn(panelDetailRowClassName, "border-t border-black/5")}>
                <span className={panelDetailLabelClassName}>经典例句</span>
                <div className="space-y-3">
                  {visibleExamples.map((example, index) => (
                    <div
                      key={`${example.en}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-[12px] bg-[#F8F8FA] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold leading-6 text-[#1C1C1E]">
                          {example.en}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[#8E8E93]">
                          {hasChinese(example.zh) ? example.zh : "该例句翻译待补充。"}
                        </span>
                      </div>
                      <AudioButton
                        active={speakingText === example.en}
                        loading={loadingText === example.en}
                        label="朗读例句"
                        className={panelIconButtonClassName}
                        onClick={() => onPronounce(example.en)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-black/5 px-5 py-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-12 rounded-[14px] border border-[#D9D9DE] bg-white text-[15px] font-bold text-[#1C1C1E] transition-all duration-150 active:scale-[0.96]"
                  onClick={onSave}
                >
                  {saved ? "已收藏" : "收藏短语"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-12 rounded-[14px] border-0 bg-[#007AFF] text-[15px] font-bold text-white transition-all duration-150 active:scale-[0.96]"
                  onClick={onReview}
                >
                  加入复习
                </Button>
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
    </div>
  );
}
