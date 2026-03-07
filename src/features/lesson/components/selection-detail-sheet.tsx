"use client";

import { CirclePlay, Volume2 } from "lucide-react";
import { SelectionExplainResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const isLongChunk = (text: string) => text.length > 22;

export function SelectionDetailSheet({
  detail,
  open,
  loading,
  speakingText,
  onOpenChange,
  onSave,
  onReview,
  onPronounce,
  onSelectRelated,
}: {
  detail: SelectionExplainResponse | null;
  open: boolean;
  loading: boolean;
  speakingText: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onReview: () => void;
  onPronounce: (text: string) => void;
  onSelectRelated: (chunk: string) => void;
}) {
  return (
    <div className="lg:hidden">
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>已选内容</DrawerTitle>
            <DrawerDescription>查看整句理解与短语解析，不打断阅读。</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="max-h-[65vh] px-4 pb-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : detail ? (
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-sm font-medium">当前句子</p>
                  <p className="mt-2 text-sm leading-7 break-words">{detail.sentence.text}</p>
                  <p className="mt-2 text-xs tracking-[0.08em] text-muted-foreground">整句翻译</p>
                  <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">{detail.sentence.translation}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => onPronounce(detail.sentence.ttsText)}
                  >
                    <Volume2 className={speakingText === detail.sentence.ttsText ? "size-4 animate-pulse" : "size-4"} />
                    播放整句发音
                  </Button>
                </div>

                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-sm font-medium">短语解析</p>
                  <div className="mt-2">
                    <p className="text-xs tracking-[0.08em] text-muted-foreground">已选短语</p>
                    {isLongChunk(detail.chunk.text) ? (
                      <p className="mt-1 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm leading-6 break-words">
                        {detail.chunk.text}
                      </p>
                    ) : (
                      <Badge className="mt-1">{detail.chunk.text}</Badge>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => onPronounce(detail.chunk.text)}>
                      <Volume2 className={speakingText === detail.chunk.text ? "size-4 animate-pulse" : "size-4"} />
                      发音
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPronounce(detail.chunk.examples[0] ?? detail.chunk.text)}
                    >
                      <CirclePlay className="size-4" />
                      例句发音
                    </Button>
                  </div>
                  <p className="mt-3 text-xs tracking-[0.08em] text-muted-foreground">中文释义</p>
                  <p className="text-sm">{detail.chunk.translation}</p>
                  <p className="mt-3 text-xs tracking-[0.08em] text-muted-foreground">当前句中含义</p>
                  <p className="text-sm text-muted-foreground">{detail.chunk.meaningInSentence}</p>
                  <p className="mt-3 text-xs tracking-[0.08em] text-muted-foreground">常见用法</p>
                  <p className="text-sm leading-7">{detail.chunk.usageNote}</p>
                  <p className="mt-3 text-xs tracking-[0.08em] text-muted-foreground">例句</p>
                  <div className="mt-1 space-y-2">
                    {detail.chunk.examples.slice(0, 2).map((example) => (
                      <p key={example} className="rounded-lg bg-muted p-3 text-sm">
                        {example}
                      </p>
                    ))}
                  </div>

                  {detail.relatedChunks.length > 0 ? (
                    <>
                      <p className="mt-3 text-xs tracking-[0.08em] text-muted-foreground">本句相关短语</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {detail.relatedChunks.map((chunk) => (
                          <button
                            key={chunk}
                            type="button"
                            className="cursor-pointer rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs transition hover:border-primary/40 hover:bg-accent active:scale-95"
                            onClick={() => onSelectRelated(chunk)}
                          >
                            {chunk}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <div className="sticky bottom-0 mt-3 grid grid-cols-2 gap-2 border-t border-border/70 bg-background py-3">
                    <Button onClick={onSave}>收藏短语</Button>
                    <Button variant="secondary" onClick={onReview}>
                      加入复习
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">在课程中点选短语后，这里会显示详细解释。</p>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
