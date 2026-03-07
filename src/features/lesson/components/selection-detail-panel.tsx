import { CirclePlay, Volume2 } from "lucide-react";
import { SelectionExplainResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const highlightSelected = (sentence: string, selected: string) => {
  if (!sentence || !selected) return sentence;
  const lowerSentence = sentence.toLowerCase();
  const lowerSelected = selected.toLowerCase();
  const start = lowerSentence.indexOf(lowerSelected);
  if (start < 0) return sentence;
  const end = start + selected.length;
  return (
    <>
      <span>{sentence.slice(0, start)}</span>
      <mark className="rounded bg-primary/15 px-1 text-foreground">{sentence.slice(start, end)}</mark>
      <span>{sentence.slice(end)}</span>
    </>
  );
};

const isLongChunk = (text: string) => text.length > 22;

export function SelectionDetailPanel({
  detail,
  loading,
  speakingText,
  onSave,
  onReview,
  onPronounce,
  onSelectRelated,
}: {
  detail: SelectionExplainResponse | null;
  loading: boolean;
  speakingText: string | null;
  onSave: () => void;
  onReview: () => void;
  onPronounce: (text: string) => void;
  onSelectRelated: (chunk: string) => void;
}) {
  return (
    <div className="sticky top-20 hidden space-y-4 lg:block">
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/30 pb-3">
          <CardTitle className="text-lg">当前句子</CardTitle>
        </CardHeader>
        {loading ? (
          <CardContent className="space-y-3 pt-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        ) : detail ? (
          <CardContent
            key={`sentence-${detail.chunk.text}`}
            className="space-y-3 pt-4 animate-in fade-in-0 slide-in-from-right-1 duration-200"
          >
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm leading-7 break-words">
              {highlightSelected(detail.sentence.text, detail.chunk.text)}
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs tracking-[0.08em] text-muted-foreground">整句翻译</p>
              <p className="mt-1 text-sm">{detail.sentence.translation}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full cursor-pointer justify-center transition-all duration-150 hover:border-primary/40"
              onClick={() => onPronounce(detail.sentence.ttsText)}
            >
              <Volume2 className={speakingText === detail.sentence.ttsText ? "size-4 animate-pulse" : "size-4"} />
              播放整句发音
            </Button>
          </CardContent>
        ) : (
          <CardContent className="pt-4 text-sm text-muted-foreground">
            在课程中点选短语后，这里会显示整句理解内容。
          </CardContent>
        )}
      </Card>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/30 pb-3">
          <CardTitle className="text-lg">短语解析</CardTitle>
        </CardHeader>
        {loading ? (
          <CardContent className="space-y-3 pt-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        ) : detail ? (
          <CardContent
            key={`chunk-${detail.chunk.text}`}
            className="space-y-4 pt-4 animate-in fade-in-0 slide-in-from-right-1 duration-200"
          >
            <div>
              <p className="text-xs tracking-[0.08em] text-muted-foreground">已选短语</p>
              {isLongChunk(detail.chunk.text) ? (
                <div className="mt-1 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm leading-6 break-words">
                  {detail.chunk.text}
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <Badge>{detail.chunk.text}</Badge>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => onPronounce(detail.chunk.text)}
              >
                <Volume2 className={speakingText === detail.chunk.text ? "size-4 animate-pulse" : "size-4"} />
                发音
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="播放例句发音"
                onClick={() => onPronounce(detail.chunk.examples[0] ?? detail.chunk.text)}
              >
                <CirclePlay className="size-4" />
              </Button>
            </div>

            <div>
              <p className="text-xs tracking-[0.08em] text-muted-foreground">中文释义</p>
              <p className="mt-1 text-sm">{detail.chunk.translation}</p>
            </div>
            <div>
              <p className="text-xs tracking-[0.08em] text-muted-foreground">当前句中含义</p>
              <p className="mt-1 text-sm text-muted-foreground">{detail.chunk.meaningInSentence}</p>
            </div>
            <div>
              <p className="text-xs tracking-[0.08em] text-muted-foreground">常见用法</p>
              <p className="mt-1 text-sm leading-7">{detail.chunk.usageNote}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs tracking-[0.08em] text-muted-foreground">例句</p>
              {detail.chunk.examples.slice(0, 2).map((example) => (
                <div key={example} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
                  <p className="flex-1 break-words">{example}</p>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="播放例句发音"
                    onClick={() => onPronounce(example)}
                  >
                    <CirclePlay className={speakingText === example ? "size-4 animate-pulse" : "size-4"} />
                  </Button>
                </div>
              ))}
            </div>

            {detail.relatedChunks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs tracking-[0.08em] text-muted-foreground">本句相关短语</p>
                <div className="flex flex-wrap gap-2">
                  {detail.relatedChunks.map((chunk) => (
                    <button
                      key={chunk}
                      type="button"
                      onClick={() => onSelectRelated(chunk)}
                      className={cn(
                        "cursor-pointer rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs transition-all duration-150",
                        "hover:border-primary/40 hover:bg-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      )}
                    >
                      {chunk}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" onClick={onSave}>
                收藏短语
              </Button>
              <Button size="sm" variant="secondary" onClick={onReview}>
                加入复习
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="pt-4 text-sm text-muted-foreground">
            选择短语后，这里会显示对应解析内容。
          </CardContent>
        )}
      </Card>
    </div>
  );
}
