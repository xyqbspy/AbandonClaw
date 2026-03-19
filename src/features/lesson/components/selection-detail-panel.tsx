import { CirclePlay, Volume2 } from "lucide-react";
import { LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const highlightSelected = (sentence: string, selected?: string) => {
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
const speakerTextClassName = (speaker?: "A" | "B") => {
  if (speaker === "A") return "text-sky-700";
  if (speaker === "B") return "text-emerald-700";
  return "text-muted-foreground";
};
const speakerLabel = (speaker?: "A" | "B") => {
  if (speaker === "A") return "A";
  if (speaker === "B") return "B";
  return "";
};

export function SelectionDetailPanel({
  currentSentence,
  chunkDetail,
  relatedChunks,
  loading,
  speakingText,
  onSave,
  onReview,
  saved = false,
  onPronounce,
  onSelectRelated,
  hoveredChunkKey,
  onHoverChunk,
  showSpeaker = true,
  sentenceSectionLabel = "当前句子",
}: {
  currentSentence: LessonSentence | null;
  chunkDetail: SelectionChunkLayer | null;
  relatedChunks: string[];
  loading: boolean;
  speakingText: string | null;
  onSave: () => void;
  onReview: () => void;
  saved?: boolean;
  onPronounce: (text: string) => void;
  onSelectRelated: (chunk: string) => void;
  hoveredChunkKey: string | null;
  onHoverChunk: (chunkKey: string | null) => void;
  showSpeaker?: boolean;
  sentenceSectionLabel?: string;
}) {
  return (
    <div className="sticky top-20 hidden space-y-4 lg:block">
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/30 pb-3">
          <CardTitle className="text-lg">
            {sentenceSectionLabel}
            {showSpeaker && currentSentence?.speaker
              ? `（${speakerLabel(currentSentence.speaker)}）`
              : ""}
          </CardTitle>
        </CardHeader>
        {loading ? (
          <CardContent className="space-y-3 pt-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        ) : currentSentence ? (
          <CardContent
            key={`sentence-${currentSentence.id}-${chunkDetail?.text ?? "none"}`}
            className="space-y-3 pt-4 animate-in fade-in-0 slide-in-from-right-1 duration-200"
          >
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm leading-7 break-words">
              {showSpeaker && currentSentence.speaker ? (
                <p
                  className={cn(
                    "mb-1 text-[10px] tracking-[0.08em] uppercase",
                    speakerTextClassName(currentSentence.speaker),
                  )}
                >
                  {speakerLabel(currentSentence.speaker)}
                </p>
              ) : null}
              {highlightSelected(currentSentence.text, chunkDetail?.text)}
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs tracking-[0.08em] text-muted-foreground">整句翻译</p>
              <p className="mt-1 text-sm">{currentSentence.translation}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full cursor-pointer justify-center transition-all duration-150 hover:border-primary/40"
              onClick={() => onPronounce(currentSentence.text)}
            >
              <Volume2 className={speakingText === currentSentence.text ? "size-4 animate-pulse" : "size-4"} />
              播放整句发音
            </Button>
          </CardContent>
        ) : (
          <CardContent className="pt-4 text-sm text-muted-foreground">
            先选择一句内容，查看整句理解。
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
        ) : (
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.08em] text-muted-foreground">本句相关短语</p>
              {relatedChunks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {relatedChunks.map((chunk) => (
                    <button
                      key={chunk}
                      type="button"
                      onClick={() => onSelectRelated(chunk)}
                      onMouseEnter={() => onHoverChunk(chunk)}
                      onMouseLeave={() => onHoverChunk(null)}
                      onFocus={() => onHoverChunk(chunk)}
                      onBlur={() => onHoverChunk(null)}
                      className={cn(
                        "cursor-pointer rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs transition-all duration-150",
                        "hover:border-primary/40 hover:bg-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        chunkDetail?.text.toLowerCase() === chunk.toLowerCase() && "border-primary/50 bg-accent",
                        hoveredChunkKey?.toLowerCase() === chunk.toLowerCase() &&
                          chunkDetail?.text.toLowerCase() !== chunk.toLowerCase() &&
                          "border-primary/40 bg-accent",
                      )}
                    >
                      {chunk}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">当前句暂无可用短语。</p>
              )}
            </div>

            {chunkDetail ? (
              <div
                key={`chunk-${chunkDetail.text}`}
                className="space-y-4 animate-in fade-in-0 slide-in-from-right-1 duration-200"
              >
                <div>
                  <p className="text-xs tracking-[0.08em] text-muted-foreground">已选短语</p>
                  {isLongChunk(chunkDetail.text) ? (
                    <div className="mt-1 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm leading-6 break-words">
                      {chunkDetail.text}
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <Badge>{chunkDetail.text}</Badge>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => onPronounce(chunkDetail.text)}
                  >
                    <Volume2 className={speakingText === chunkDetail.text ? "size-4 animate-pulse" : "size-4"} />
                    发音
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="播放例句发音"
                    onClick={() => onPronounce(chunkDetail.examples[0]?.en ?? chunkDetail.text)}
                  >
                    <CirclePlay className="size-4" />
                  </Button>
                </div>

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
                  <p className="mt-1 text-sm leading-7">
                    {chunkDetail.grammarLabel ? `${chunkDetail.grammarLabel} · ` : ""}
                    {chunkDetail.usageNote}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs tracking-[0.08em] text-muted-foreground">例句</p>
                  {chunkDetail.examples.slice(0, 2).map((example, index) => {
                    const key = `${example.en}-${index}`;
                    return (
                      <div key={key} className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <p className="flex-1 break-words">{example.en}</p>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="播放例句发音"
                            onClick={() => onPronounce(example.en)}
                          >
                            <CirclePlay className={speakingText === example.en ? "size-4 animate-pulse" : "size-4"} />
                          </Button>
                        </div>
                        {example.zh ? (
                          <p className="mt-1 text-xs text-muted-foreground">{example.zh}</p>
                        ) : null}
                      </div>
                  )})}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button size="sm" onClick={onSave}>
                    {saved ? "已收藏" : "收藏短语"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={onReview}>
                    加入复习
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">点击下方短语查看解析与例句。</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}




