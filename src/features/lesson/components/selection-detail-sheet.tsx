"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CirclePlay, Languages, Volume2, X } from "lucide-react";
import { LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const isLongChunk = (text: string) => text.length > 22;

export function SelectionDetailSheet({
  currentSentence,
  chunkDetail,
  relatedChunks,
  open,
  loading,
  speakingText,
  onOpenChange,
  onSave,
  onReview,
  onPronounce,
  onLoopSentence,
  onSelectRelated,
  hoveredChunkKey,
  onHoverChunk,
}: {
  currentSentence: LessonSentence | null;
  chunkDetail: SelectionChunkLayer | null;
  relatedChunks: string[];
  open: boolean;
  loading: boolean;
  speakingText: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onReview: () => void;
  onPronounce: (text: string) => void;
  onLoopSentence: (text: string) => void;
  onSelectRelated: (chunk: string) => void;
  hoveredChunkKey: string | null;
  onHoverChunk: (chunkKey: string | null) => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [exampleTranslationOpenMap, setExampleTranslationOpenMap] = useState<Record<string, boolean>>({});
  const hasChunk = Boolean(chunkDetail);
  const topHint = useMemo(() => (hasChunk ? "短语解析" : "点击下方短语查看解析与例句"), [hasChunk]);

  const getExampleTranslation = useCallback((example: string) => {
    const translations: Record<string, string> = {
      "Is the meeting still on for tomorrow?": "明天的会议还照常吗？",
      "Are we still on for lunch?": "我们午饭还按原计划吗？",
      "Sorry, something came up at work.": "抱歉，工作上突然有事。",
      "Can we reschedule? Something came up.": "我们能改时间吗？临时有事了。",
      "I'm stuck at the airport.": "我被困在机场了。",
      "She was stuck at work late.": "她在公司拖到很晚才走。",
      "Can we do a rain check?": "我们改天再约可以吗？",
      "Rain check for this weekend?": "这个周末改天约怎么样？",
      "Nothing got decided in the meeting.": "会议里什么都没定下来。",
      "We need this to get decided today.": "这件事今天必须定下来。",
      "By the end, everyone went quiet.": "到最后大家都不说话了。",
      "By the end, I was done.": "到最后我已经彻底没力气了。",
      "I stayed up too late gaming.": "我昨晚打游戏熬太晚了。",
      "He stayed up too late again.": "他昨晚又熬夜太晚了。",
      "I was just messing around online.": "我当时就是在网上随便刷刷。",
      "Stop messing around and start.": "别再磨蹭了，赶紧开始吧。",
      "Let's call it a day.": "今天就到这吧。",
      "I'm calling it a day after this.": "做完这个我今天就收工了。",
      "The train was packed this morning.": "今天早上地铁特别挤。",
      "It gets packed after 8 a.m.": "早上八点后就会变得很拥挤。",
      "It's an hour door to door.": "门到门要一个小时。",
      "Door to door takes 45 minutes.": "门到门大概 45 分钟。",
      "I need water before anything else.": "我现在得先喝点水再说。",
      "Stretch before anything else.": "先拉伸一下，再做别的事。",
      "No wonder you're late.": "难怪你迟到了。",
      "No wonder she looked tired.": "难怪她看起来那么累。",
    };
    return translations[example] ?? "该例句翻译待补充。";
  }, []);

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

  useEffect(() => {
    const rect = panelRef.current?.getBoundingClientRect();
    const style = panelRef.current ? window.getComputedStyle(panelRef.current) : null;
    console.log("[mobile-sheet-stable]", {
      open,
      overlayRendered: open,
      panelRendered: Boolean(panelRef.current),
      panelRectTop: rect?.top ?? null,
      panelRectBottom: rect?.bottom ?? null,
      panelHeight: rect?.height ?? null,
      panelTransform: style?.transform ?? null,
      panelOpacity: style?.opacity ?? null,
      panelVisibility: style?.visibility ?? null,
    });
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] lg:hidden" aria-hidden={!open}>
      <button
        type="button"
        aria-label="关闭学习详情"
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={() => {
          console.log("[mobile-sheet-stable] outside-close");
          onOpenChange(false);
        }}
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="学习详情"
        className="absolute inset-x-0 bottom-0 z-[71] h-[78vh] max-h-[78vh] rounded-t-2xl border border-border/70 bg-background shadow-xl"
      >
        <header className="flex items-start justify-between border-b border-border/70 px-4 pb-3 pt-3">
          <div>
            <h2 className="text-sm font-semibold">学习详情</h2>
            <p className="text-xs text-muted-foreground">点句子看翻译，再点短语看解析。</p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            className="cursor-pointer"
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
              <section className="rounded-xl border border-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">当前句子</h3>
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
                        {speakingText === currentSentence.text ? "停止" : "播放"}
                      </button>
                    </div>
                  ) : null}
                </div>
                {currentSentence ? (
                  <>
                    <p className="mt-1 text-sm leading-7 break-words">{currentSentence.text}</p>
                    <div
                      className={cn(
                        "grid overflow-hidden transition-all duration-200",
                        showSentenceTranslation
                          ? "mt-1.5 grid-rows-[1fr] opacity-100"
                          : "mt-0.5 grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <p className="min-h-0 rounded-lg bg-muted px-3 py-2 text-sm leading-6">{currentSentence.translation}</p>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-xs tracking-[0.08em] text-muted-foreground">本句相关短语</p>
                      <div className="flex flex-wrap gap-2">
                        {relatedChunks.map((chunk) => (
                          <button
                            key={chunk}
                            type="button"
                            className={cn(
                              "cursor-pointer rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs transition",
                              "hover:border-primary/40 hover:bg-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                              chunkDetail?.text.toLowerCase() === chunk.toLowerCase() && "border-primary/50 bg-accent",
                              hoveredChunkKey?.toLowerCase() === chunk.toLowerCase() &&
                                chunkDetail?.text.toLowerCase() !== chunk.toLowerCase() &&
                                "border-primary/40 bg-accent",
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
                  <p className="text-sm text-muted-foreground">点按左侧句子开始学习。</p>
                )}
              </section>

              <section className="space-y-3 rounded-xl border border-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">{topHint}</h3>
                  {chunkDetail ? (
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                      onClick={() => onPronounce(chunkDetail.text)}
                    >
                      <Volume2 className={cn("size-3.5", speakingText === chunkDetail.text && "animate-pulse text-primary")} />
                      发音
                    </button>
                  ) : null}
                </div>
                {chunkDetail ? (
                  <div key={`mobile-chunk-${chunkDetail.text}`} className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                    {isLongChunk(chunkDetail.text) ? (
                      <p className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm leading-6 break-words">
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
                      <p className="mt-1 text-sm text-muted-foreground">{chunkDetail.meaningInSentence}</p>
                    </div>
                    <div>
                      <p className="text-xs tracking-[0.08em] text-muted-foreground">常见用法</p>
                      <p className="mt-1 text-sm leading-7">{chunkDetail.usageNote}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs tracking-[0.08em] text-muted-foreground">例句</p>
                      {chunkDetail.examples.slice(0, 2).map((example) => (
                        <div key={example} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                              onClick={() => toggleExampleTranslation(example)}
                            >
                              <Languages className="size-3.5" />
                              {exampleTranslationOpenMap[example] ? "收起" : "翻译"}
                            </button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="cursor-pointer"
                              aria-label="播放例句发音"
                              onClick={() => onPronounce(example)}
                            >
                              <CirclePlay className={cn("size-4", speakingText === example && "animate-pulse")} />
                            </Button>
                          </div>
                          <p className="mt-1 flex-1 break-words leading-6">{example}</p>
                          <div
                            className={cn(
                              "grid overflow-hidden transition-all duration-200",
                              exampleTranslationOpenMap[example]
                                ? "mt-1.5 grid-rows-[1fr] opacity-100"
                                : "mt-0.5 grid-rows-[0fr] opacity-0",
                            )}
                          >
                            <p className="min-h-0 rounded-lg bg-background px-2.5 py-1.5 text-sm leading-6 text-muted-foreground">
                              {getExampleTranslation(example)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">点击下方短语查看解析与例句</p>
                )}
              </section>
            </div>
          )}
        </div>

        <footer className="border-t border-border/70 bg-background/95 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button className="cursor-pointer" onClick={onSave} disabled={!chunkDetail}>
              收藏短语
            </Button>
            <Button variant="secondary" className="cursor-pointer" onClick={onReview} disabled={!chunkDetail}>
              加入复习
            </Button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
