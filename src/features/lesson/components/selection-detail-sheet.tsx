"use client";

import { useCallback, useMemo, useState } from "react";
import { Languages } from "lucide-react";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DetailSheetShell } from "@/components/shared/detail-sheet-shell";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_SM,
} from "@/lib/ui/apple-style";
import {
  LESSON_CHIP_ACTIVE_CLASS,
  LESSON_CHIP_BASE_CLASS,
  LESSON_CHIP_HOVER_CLASS,
  LESSON_CHIP_INACTIVE_CLASS,
  LESSON_DETAIL_BLOCK_BG_CLASS,
} from "@/features/lesson/styles/dialogue-theme";

const isLongChunk = (text: string) => text.length > 22;
const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
const hasChinese = (value?: string) => /[\u4e00-\u9fff]/.test((value ?? "").trim());

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
}) {
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [exampleTranslationOpenMap, setExampleTranslationOpenMap] = useState<Record<string, boolean>>({});
  const hasChunk = Boolean(chunkDetail);
  const topHint = useMemo(
    () => (hasChunk ? "短语解析" : "点击下方短语查看解析与例句"),
    [hasChunk],
  );
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

  const toggleExampleTranslation = useCallback((example: string) => {
    setExampleTranslationOpenMap((prev) => ({
      ...prev,
      [example]: !prev[example],
    }));
  }, []);

  return (
    <DetailSheetShell
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="学习详情"
      closeLabel="关闭学习详情"
      containerClassName="lg:hidden"
      panelClassName="h-[78vh] max-h-[78vh]"
      bodyClassName="h-[calc(78vh-124px)]"
      header={<h2 className="text-sm font-semibold">学习详情</h2>}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className={cn("cursor-pointer", appleButtonClassName)} onClick={onSave} disabled={!chunkDetail}>
            {saved ? "已收藏" : "收藏短语"}
          </Button>
          <Button variant="ghost" className={cn("cursor-pointer", appleButtonClassName)} onClick={onReview} disabled={!chunkDetail}>
            加入复习
          </Button>
        </div>
      }
    >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
              {showSentenceSection ? (
                <section
                  className={cn(
                    "rounded-xl p-3",
                    LESSON_DETAIL_BLOCK_BG_CLASS,
                  )}
                >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">{sentenceSectionLabel}</h3>
                  {currentSentence ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                        onClick={() => setShowSentenceTranslation((prev) => !prev)}
                      >
                        <Languages className="size-3.5" />
                        {showSentenceTranslation ? "收起" : "翻译"}
                      </button>
                      <TtsActionButton
                        active={speakingText === blockSpeakText}
                        loading={loadingText === blockSpeakText}
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={onPronounceBlock}
                      />
                    </div>
                  ) : null}
                </div>
                {currentSentence ? (
                  <>
                    <div className={cn("mt-1 rounded-lg px-0 py-2", LESSON_DETAIL_BLOCK_BG_CLASS)}>
                      <p className="text-sm leading-7 break-words">
                        {currentBlock && currentBlock.sentences.length > 1 ? blockText : currentSentence.text}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "grid overflow-hidden transition-all duration-200",
                        showSentenceTranslation
                          ? "mt-1.5 grid-rows-[1fr] opacity-100"
                          : "mt-0.5 grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <p className={cn("min-h-0 rounded-lg px-0 py-2 text-sm leading-6", LESSON_DETAIL_BLOCK_BG_CLASS)}>
                        {blockTranslation || currentSentence.translation}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-xs tracking-[0.08em] text-muted-foreground">
                        {showSpeaker ? "本轮相关短语" : "本句相关短语"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {relatedChunks.map((chunk) => (
                          <button
                            key={chunk}
                            type="button"
                            className={cn(
                              LESSON_CHIP_BASE_CLASS,
                              "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                              chunkDetail?.text.toLowerCase() === chunk.toLowerCase() && LESSON_CHIP_ACTIVE_CLASS,
                              hoveredChunkKey?.toLowerCase() === chunk.toLowerCase() &&
                                chunkDetail?.text.toLowerCase() !== chunk.toLowerCase() &&
                                LESSON_CHIP_HOVER_CLASS,
                              (playingChunkKey?.toLowerCase() === chunk.toLowerCase() ||
                                loadingChunkKey?.toLowerCase() === chunk.toLowerCase()) &&
                                "ring-1 ring-primary/45 text-primary",
                              !(
                                chunkDetail?.text.toLowerCase() === chunk.toLowerCase() ||
                                hoveredChunkKey?.toLowerCase() === chunk.toLowerCase() ||
                                playingChunkKey?.toLowerCase() === chunk.toLowerCase() ||
                                loadingChunkKey?.toLowerCase() === chunk.toLowerCase()
                              ) && LESSON_CHIP_INACTIVE_CLASS,
                            )}
                            onClick={() => onSelectRelated(chunk)}
                            onMouseEnter={() => onHoverChunk(chunk)}
                            onMouseLeave={() => onHoverChunk(null)}
                            onFocus={() => onHoverChunk(chunk)}
                            onBlur={() => onHoverChunk(null)}
                          >
                            {chunk}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">点击左侧句子开始学习。</p>
                )}
                </section>
              ) : null}

              <section className={cn("space-y-3 rounded-xl p-3", LESSON_DETAIL_BLOCK_BG_CLASS)}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">{topHint}</h3>
                  {chunkDetail ? (
                    <TtsActionButton
                      active={speakingText === chunkDetail.text}
                      loading={loadingText === chunkDetail.text}
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => onPronounce(chunkDetail.text)}
                    />
                  ) : null}
                </div>
                {chunkDetail ? (
                  <div key={`mobile-chunk-${chunkDetail.text}`} className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                    {isLongChunk(chunkDetail.text) ? (
                      <p
                        className={cn(
                          "inline-flex max-w-full rounded-2xl px-3 py-2 text-sm leading-6 break-words",
                          LESSON_CHIP_BASE_CLASS,
                          LESSON_CHIP_ACTIVE_CLASS,
                        )}
                      >
                        {chunkDetail.text}
                      </p>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center",
                          LESSON_CHIP_BASE_CLASS,
                          LESSON_CHIP_ACTIVE_CLASS,
                        )}
                      >
                        {chunkDetail.text}
                      </span>
                    )}
                    <div>
                      <p className="text-xs tracking-[0.08em] text-muted-foreground">中文释义</p>
                      <p className="mt-1 text-sm">{chunkDetail.translation}</p>
                    </div>
                    <div>
                      <p className="text-xs tracking-[0.08em] text-muted-foreground">当前句中含义</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {hasChinese(chunkDetail.meaningInSentence)
                          ? chunkDetail.meaningInSentence
                          : `这里表示：${chunkDetail.translation || "该表达在本句中的含义。"}`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-[0.08em] text-muted-foreground">常见用法</p>
                      <p className="mt-1 text-sm leading-7">
                        {hasChinese(chunkDetail.grammarLabel) ? `${chunkDetail.grammarLabel} · ` : ""}
                        {hasChinese(chunkDetail.usageNote)
                          ? chunkDetail.usageNote
                          : "先理解它在这句话里的作用，再放回整句复述。"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {chunkDetail.examples.slice(0, 2).map((example, index) => {
                        const exampleText = example.en;
                        const translation = example.zh;
                        return (
                        <div key={`${example.en}-${index}`} className={cn("rounded-lg py-2 text-sm", LESSON_DETAIL_BLOCK_BG_CLASS)}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs tracking-[0.08em] text-muted-foreground">例句</p>
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                                onClick={() => toggleExampleTranslation(exampleText)}
                              >
                                <Languages className="size-3.5" />
                                {exampleTranslationOpenMap[exampleText] ? "收起" : "翻译"}
                              </button>
                              <TtsActionButton
                                active={speakingText === exampleText}
                                loading={loadingText === exampleText}
                                variant="ghost"
                                size="sm"
                                className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                                ariaLabel="朗读例句"
                                iconClassName="size-4"
                                onClick={() => onPronounce(exampleText)}
                              />
                            </div>
                          </div>
                          <p className="mt-1 break-words leading-6">{exampleText}</p>
                          <div
                            className={cn(
                              "grid overflow-hidden transition-all duration-200",
                              exampleTranslationOpenMap[exampleText]
                                ? "mt-1.5 grid-rows-[1fr] opacity-100"
                                : "mt-0.5 grid-rows-[0fr] opacity-0",
                            )}
                          >
                            <p className="min-h-0 text-sm leading-6 text-muted-foreground">
                              {hasChinese(translation) ? translation : "该例句翻译待补充。"}
                            </p>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">点击下方短语查看解析与例句。</p>
                )}
              </section>
            </div>
          )}
    </DetailSheetShell>
  );
}





