import { useState } from "react";
import { Languages, Loader2, Volume2 } from "lucide-react";
import { LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const panelSectionTitleClassName =
  "px-1 text-[length:var(--mobile-font-body-sm)] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]";
const panelCardClassName =
  "overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]";
const panelDetailRowClassName = "px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]";
const panelDetailLabelClassName = "mb-1.5 block text-xs font-bold text-[#007AFF]";
const panelDetailValueClassName =
  "text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[#3A3A3C]";
const panelActionButtonClassName =
  "inline-flex h-[var(--mobile-control-height)] items-center justify-center gap-[var(--mobile-space-sm)] rounded-[10px] border-0 px-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body-sm)] font-semibold transition-all duration-150 active:scale-[0.96] active:opacity-80";
const panelIconButtonClassName =
  "inline-flex size-[var(--mobile-icon-button)] items-center justify-center rounded-full border-0 bg-[#EEEEF0] text-[#3A3A3C] transition-all duration-150 active:scale-[0.96] active:opacity-80";

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
    <div className="sticky top-20 hidden rounded-[28px] bg-[#F2F2F7] p-[var(--mobile-space-sheet)] shadow-[0_18px_42px_rgba(15,23,42,0.08)] lg:block">
      <div className="space-y-[var(--mobile-space-2xl)]">
      <section className="space-y-[var(--mobile-space-sm)]">
        <div className={panelSectionTitleClassName}>{sentenceSectionLabel}</div>
        <div className={cn("p-[var(--mobile-space-sheet)]", panelCardClassName)}>
          {loading ? (
            <div className="space-y-[var(--mobile-space-md)]">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : currentSentence ? (
            <>
              <p className="text-[length:clamp(16px,4.4vw,18px)] font-medium leading-[var(--mobile-adapt-overlay-body-line-height)] text-[#1C1C1E]">
                {currentBlock && currentBlock.sentences.length > 1 ? blockText : currentSentence.text}
              </p>
              <div className="mt-[var(--mobile-space-xl)] flex gap-[var(--mobile-space-sm)]">
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
                <p className="mt-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[#3A3A3C]">
                  {blockTranslation || currentSentence.translation || "该句翻译待补充。"}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[#8E8E93]">先选择一句内容，查看整句理解。</p>
          )}
        </div>
      </section>

      <section className="space-y-[var(--mobile-space-sm)]">
        <div className={panelSectionTitleClassName}>{phraseSectionTitle}</div>
        <div className={panelCardClassName}>
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
                    active && "bg-[#F0F7FF]",
                  )}
                >
                  {index < relatedChunks.length - 1 ? (
                    <div className="absolute bottom-0 left-[var(--mobile-space-sheet)] right-0 h-px bg-black/5" />
                  ) : null}
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 text-left text-[length:var(--mobile-font-body)] font-bold transition-colors",
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
            <div className="px-[var(--mobile-space-sheet)] py-[var(--mobile-adapt-overlay-related-row-py)] text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[#8E8E93]">当前句暂无可用短语。</div>
          )}
        </div>
      </section>

      <section className="space-y-[var(--mobile-space-sm)]">
        <div className={panelSectionTitleClassName}>短语详情</div>
        <div className={panelCardClassName}>
          {loading ? (
            <div className="space-y-[var(--mobile-space-md)] p-[var(--mobile-space-sheet)]">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : chunkDetail ? (
            <>
              <div className={cn(panelDetailRowClassName, "pt-5")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[length:clamp(16px,4.4vw,18px)] font-semibold leading-7 text-[#1C1C1E]">{chunkDetail.text}</p>
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
                  {hasChinese(chunkDetail.grammarLabel) ? `${chunkDetail.grammarLabel} 路 ` : ""}
                  {hasChinese(chunkDetail.usageNote)
                    ? chunkDetail.usageNote
                    : "先理解它在这句话里的作用，再放回整句复述。"}
                </div>
              </div>
              <div className={cn(panelDetailRowClassName, "border-t border-black/5")}>
                <span className={panelDetailLabelClassName}>经典例句</span>
                <div className="space-y-[var(--mobile-space-md)]">
                  {visibleExamples.map((example, index) => (
                    <div
                      key={`${example.en}-${index}`}
                      className="flex items-start justify-between gap-[var(--mobile-space-md)] rounded-[12px] bg-[#F8F8FA] p-[var(--mobile-space-md)]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-[length:var(--mobile-font-body)] font-semibold leading-[var(--mobile-adapt-overlay-example-line-height)] text-[#1C1C1E]">
                          {example.en}
                        </span>
                        <span className="mt-1 block text-xs leading-[var(--mobile-adapt-overlay-example-line-height)] text-[#8E8E93]">
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
              <div className="grid grid-cols-2 gap-[var(--mobile-space-md)] border-t border-black/5 px-[var(--mobile-space-sheet)] py-[var(--mobile-space-xl)]">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-[var(--mobile-adapt-overlay-footer-button-height)] rounded-[var(--mobile-adapt-overlay-footer-button-radius)] border border-[#D9D9DE] bg-white text-[length:var(--mobile-font-body)] font-bold text-[#1C1C1E] transition-all duration-150 active:scale-[0.96]"
                  onClick={onSave}
                >
                  {saved ? "已收藏" : "收藏短语"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-[var(--mobile-adapt-overlay-footer-button-height)] rounded-[var(--mobile-adapt-overlay-footer-button-radius)] border-0 bg-[#007AFF] text-[length:var(--mobile-font-body)] font-bold text-white transition-all duration-150 active:scale-[0.96]"
                  onClick={onReview}
                >
                  加入复习
                </Button>
              </div>
            </>
          ) : (
            <div className="px-[var(--mobile-space-sheet)] py-[var(--mobile-adapt-overlay-related-row-py)] text-[length:var(--mobile-font-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[#8E8E93]">
              点击下方短语查看解析与例句。
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}


