"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Languages, Volume2, X } from "lucide-react";
import { LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  currentSentence,
  blockSentences = [],
  chunkDetail,
  relatedChunks,
  open,
  loading,
  speakingText,
  onOpenChange,
  onSave,
  onReview,
  saved = false,
  onPronounce,
  onLoopSentence,
  onSelectRelated,
  hoveredChunkKey,
  onHoverChunk,
  playingChunkKey,
  showSentenceSection = true,
  showSpeaker = true,
  sentenceSectionLabel = "当前句子",
  onSelectSentence,
}: {
  currentSentence: LessonSentence | null;
  blockSentences?: LessonSentence[];
  chunkDetail: SelectionChunkLayer | null;
  relatedChunks: string[];
  open: boolean;
  loading: boolean;
  speakingText: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onReview: () => void;
  saved?: boolean;
  onPronounce: (text: string) => void;
  onLoopSentence: (text: string) => void;
  onSelectRelated: (chunk: string) => void;
  hoveredChunkKey: string | null;
  onHoverChunk: (chunkKey: string | null) => void;
  playingChunkKey?: string | null;
  showSentenceSection?: boolean;
  showSpeaker?: boolean;
  sentenceSectionLabel?: string;
  onSelectSentence?: (sentenceId: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [exampleTranslationOpenMap, setExampleTranslationOpenMap] = useState<Record<string, boolean>>({});
  const hasChunk = Boolean(chunkDetail);
  const topHint = useMemo(
    () => (hasChunk ? "短语解析" : "点击下方短语查看解析与例句"),
    [hasChunk],
  );

  const toggleExampleTranslation = useCallback((example: string) => {
    setExampleTranslationOpenMap((prev) => ({
      ...prev,
      [example]: !prev[example],
    }));
  }, []);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] lg:hidden" aria-hidden={!open}>
      <button
        type="button"
        aria-label="关闭学习详情"
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
        onClick={() => {
          onOpenChange(false);
        }}
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="学习详情"
        className="absolute inset-x-0 bottom-0 z-[71] h-[78vh] max-h-[78vh] rounded-t-2xl bg-white shadow-xl animate-in slide-in-from-bottom-6 fade-in-0 duration-200"
      >
        <header className="flex items-start justify-between px-4 pb-3 pt-3">
          <div>
            <h2 className="text-sm font-semibold">学习详情</h2>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            className={cn("cursor-pointer", appleButtonClassName)}
            aria-label="关闭学习详情"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="h-[calc(78vh-124px)] overflow-y-auto px-4 py-4">
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
                      <button
                        type="button"
                        className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                        onClick={() => onLoopSentence(currentSentence.text)}
                      >
                        <Volume2 className={cn("size-3.5", speakingText === currentSentence.text && "animate-pulse text-primary")} />
                        {speakingText === currentSentence.text ? "停止" : "朗读"}
                      </button>
                    </div>
                  ) : null}
                </div>
                {currentSentence ? (
                  <>
                    <div className={cn("mt-1 rounded-lg px-0 py-2", LESSON_DETAIL_BLOCK_BG_CLASS)}>
                      <p className="text-sm leading-7 break-words">{currentSentence.text}</p>
                    </div>
                    <div
                      className={cn(
                        "grid overflow-hidden transition-all duration-200",
                        showSentenceTranslation
                          ? "mt-1.5 grid-rows-[1fr] opacity-100"
                          : "mt-0.5 grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <p className={cn("min-h-0 rounded-lg px-0 py-2 text-sm leading-6", LESSON_DETAIL_BLOCK_BG_CLASS)}>{currentSentence.translation}</p>
                    </div>
                    {blockSentences.length > 1 ? (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {blockSentences.map((sentence, index) => {
                          const active = sentence.id === currentSentence.id;
                          return (
                            <button
                              key={sentence.id}
                              type="button"
                              className={cn(
                                LESSON_CHIP_BASE_CLASS,
                                active ? LESSON_CHIP_ACTIVE_CLASS : LESSON_CHIP_INACTIVE_CLASS,
                              )}
                              onClick={() => onSelectSentence?.(sentence.id)}
                            >
                              {`句子${index + 1}`}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

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
                              playingChunkKey?.toLowerCase() === chunk.toLowerCase() &&
                                "ring-1 ring-primary/45 text-primary",
                              !(
                                chunkDetail?.text.toLowerCase() === chunk.toLowerCase() ||
                                hoveredChunkKey?.toLowerCase() === chunk.toLowerCase() ||
                                playingChunkKey?.toLowerCase() === chunk.toLowerCase()
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
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                      onClick={() => onPronounce(chunkDetail.text)}
                    >
                      <Volume2 className={cn("size-3.5", speakingText === chunkDetail.text && "animate-pulse text-primary")} />
                      朗读
                    </button>
                  ) : null}
                </div>
                {chunkDetail ? (
                  <div key={`mobile-chunk-${chunkDetail.text}`} className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                    {isLongChunk(chunkDetail.text) ? (
                      <p className={cn("rounded-lg px-3 py-2 text-sm leading-6 break-words", LESSON_DETAIL_BLOCK_BG_CLASS)}>
                        {chunkDetail.text}
                      </p>
                    ) : (
                      <Badge>{chunkDetail.text}</Badge>
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
                              <button
                                type="button"
                                className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                                aria-label="朗读例句"
                                onClick={() => onPronounce(exampleText)}
                              >
                                <Volume2 className={cn("size-4", speakingText === exampleText && "animate-pulse")} />
                                朗读
                              </button>
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
        </div>

        <footer className="bg-background/95 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" className={cn("cursor-pointer", appleButtonClassName)} onClick={onSave} disabled={!chunkDetail}>
              {saved ? "已收藏" : "收藏短语"}
            </Button>
            <Button variant="ghost" className={cn("cursor-pointer", appleButtonClassName)} onClick={onReview} disabled={!chunkDetail}>
              加入复习
            </Button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}





