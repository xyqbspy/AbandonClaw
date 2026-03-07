"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Headphones, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { appCopy } from "@/lib/constants/copy";
import { useMobile } from "@/hooks/use-mobile";
import { useSpeech } from "@/hooks/use-speech";
import { ExplainSelectionRequest, Lesson, SelectionExplainResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LessonProgress } from "@/features/lesson/components/lesson-progress";
import { SelectionDetailPanel } from "@/features/lesson/components/selection-detail-panel";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SelectionToolbar } from "@/features/lesson/components/selection-toolbar";
import { SentenceBlock } from "@/features/lesson/components/sentence-block";

type ToolbarState = {
  visible: boolean;
  text: string;
  top: number;
  left: number;
  sourceSentence: string;
  sourceTranslation?: string;
  sourceChunks?: string[];
};

const TOOLBAR_WIDTH = 256;

export function LessonReader({ lesson }: { lesson: Lesson }) {
  const difficultyLabel =
    lesson.difficulty === "Beginner"
      ? "难度 入门"
      : lesson.difficulty === "Advanced"
        ? "难度 进阶"
        : "难度 中级";

  const isMobile = useMobile();
  const { speak, supported, speakingText } = useSpeech();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const [activeText, setActiveText] = useState("");
  const [detail, setDetail] = useState<SelectionExplainResponse | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [toolbar, setToolbar] = useState<ToolbarState>({
    visible: false,
    text: "",
    top: 0,
    left: 0,
    sourceSentence: "",
    sourceTranslation: "",
    sourceChunks: [],
  });

  const sentenceCount = useMemo(
    () => lesson.sections.reduce((total, section) => total + section.sentences.length, 0),
    [lesson.sections],
  );

  const hideToolbar = useCallback(
    () => setToolbar((prev) => ({ ...prev, visible: false })),
    [],
  );

  const findSentenceById = useCallback(
    (sentenceId: string) => {
      for (const section of lesson.sections) {
        const found = section.sentences.find((sentence) => sentence.id === sentenceId);
        if (found) return found;
      }
      return undefined;
    },
    [lesson.sections],
  );

  const locateSourceSentenceFromRange = useCallback(
    (range: Range) => {
      const getSentenceIdFromNode = (node: Node | null) => {
        const element = node instanceof Element ? node : node?.parentElement;
        return (element?.closest("[data-sentence-id]") as HTMLElement | null)?.dataset.sentenceId ?? "";
      };

      const startId = getSentenceIdFromNode(range.startContainer);
      const endId = getSentenceIdFromNode(range.endContainer);
      const sentenceId = startId || endId;
      if (!sentenceId) return undefined;
      return findSentenceById(sentenceId);
    },
    [findSentenceById],
  );

  const showToolbarAtRect = useCallback(
    (
      text: string,
      rect: DOMRect,
      sourceSentence: string,
      sourceTranslation?: string,
      sourceChunks?: string[],
    ) => {
      const viewportWidth = window.innerWidth;
      const preferredTop = rect.top - 38;
      const fallbackTop = rect.bottom + 6;
      const top = preferredTop > 8 ? preferredTop : fallbackTop;
      const centeredLeft = rect.left + rect.width / 2 - TOOLBAR_WIDTH / 2;
      const left = Math.min(viewportWidth - TOOLBAR_WIDTH - 8, Math.max(8, centeredLeft));

      setToolbar({
        visible: true,
        text,
        top,
        left,
        sourceSentence,
        sourceTranslation,
        sourceChunks,
      });
    },
    [],
  );

  const requestExplanation = useCallback(
    async (payload: ExplainSelectionRequest) => {
      setLoadingExplain(true);
      try {
        const response = await fetch("/api/explain-selection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("解释请求失败");
        }

        const data = (await response.json()) as SelectionExplainResponse;
        setDetail(data);
      } catch {
        toast.error("释义暂时不可用，请稍后再试");
      } finally {
        setLoadingExplain(false);
      }
    },
    [],
  );

  const openDetail = useCallback(
    async (
      selectedText: string,
      sourceSentence: string,
      sourceTranslation?: string,
      sourceChunks?: string[],
    ) => {
      const text = selectedText.trim();
      if (!text) return;

      setActiveText(text);

      await requestExplanation({
        selectedText: text,
        sourceSentence: sourceSentence || text,
        sourceTranslation,
        sourceChunks,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonDifficulty: lesson.difficulty,
      });

      if (isMobile) setSheetOpen(true);
    },
    [isMobile, lesson.difficulty, lesson.id, lesson.title, requestExplanation],
  );

  const extractSelectionInReader = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const text = selection.toString().trim();
    if (!text) return null;

    const range = selection.getRangeAt(0);
    const rootNode = range.commonAncestorContainer;
    const element = rootNode.nodeType === Node.TEXT_NODE ? rootNode.parentElement : (rootNode as Element);

    if (!element || !readerRef.current?.contains(element)) return null;

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    const sourceSentence = locateSourceSentenceFromRange(range);
    return {
      text,
      rect,
      sourceSentence: sourceSentence?.text ?? "",
      sourceTranslation: sourceSentence?.translation ?? "",
      sourceChunks: sourceSentence?.chunks ?? [],
    };
  }, [locateSourceSentenceFromRange]);

  const handleChipSelect = useCallback(
    (
      text: string,
      meta?: { sourceSentence: string; sourceTranslation?: string; sourceChunks?: string[] },
    ) => {
      hideToolbar();
      void openDetail(text, meta?.sourceSentence ?? "", meta?.sourceTranslation, meta?.sourceChunks);
    },
    [hideToolbar, openDetail],
  );

  const handlePronounce = useCallback(
    (text: string) => {
      if (!supported) {
        toast.error("当前浏览器不支持发音功能");
        return;
      }
      const success = speak(text, { lang: "en-US" });
      if (!success) {
        toast.error("发音失败，请稍后重试");
      }
    },
    [speak, supported],
  );

  const handleSave = useCallback(() => toast.success("已收藏短语"), []);
  const handleAddReview = useCallback(() => toast.success("已加入复习"), []);

  useEffect(() => {
    if (isMobile) return;

    const syncSelection = () => {
      const current = extractSelectionInReader();
      if (!current) {
        hideToolbar();
        return;
      }
      setActiveText(current.text);
      showToolbarAtRect(
        current.text,
        current.rect,
        current.sourceSentence,
        current.sourceTranslation,
        current.sourceChunks,
      );
    };

    const onMouseUp = () => {
      window.setTimeout(syncSelection, 0);
    };

    const onSelectionChange = () => {
      syncSelection();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        hideToolbar();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) return;
      if (!readerRef.current?.contains(event.target as Node)) hideToolbar();
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [extractSelectionInReader, hideToolbar, isMobile, showToolbarAtRect]);

  return (
    <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <SelectionToolbar
        visible={toolbar.visible && !isMobile}
        top={toolbar.top}
        left={toolbar.left}
        toolbarRef={toolbarRef}
        onExplain={() => {
          void openDetail(
            toolbar.text,
            toolbar.sourceSentence,
            toolbar.sourceTranslation,
            toolbar.sourceChunks,
          );
          hideToolbar();
        }}
        onSave={handleSave}
        onReview={handleAddReview}
        onPronounce={() => handlePronounce(toolbar.text)}
      />

      <div ref={readerRef} className="space-y-5">
        <Card className="bg-card/95">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{difficultyLabel}</Badge>
              <Badge variant="outline">
                <Clock3 className="mr-1 size-3.5" />
                预计时间 {lesson.estimatedMinutes} 分钟
              </Badge>
              <Badge variant="outline">{sentenceCount} 句</Badge>
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{lesson.title}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{lesson.subtitle}</p>
            <LessonProgress value={lesson.completionRate} />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-accent"
                onClick={() => handlePronounce(lesson.sections[0]?.sentences[0]?.text ?? lesson.title)}
              >
                <Headphones className="size-4" />
                播放本节发音
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="cursor-pointer transition-all duration-150 hover:brightness-95"
              >
                <Sparkles className="size-4" />
                快速练习
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{appCopy.lesson.prompt}</p>
          </CardContent>
        </Card>

        {lesson.sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <div className="space-y-1 px-1">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.summary}</p>
            </div>
            <div className="space-y-3">
              {section.sentences.map((sentence) => (
                <SentenceBlock
                  key={sentence.id}
                  sentence={sentence}
                  activeText={activeText}
                  onSelectText={(text, meta) => handleChipSelect(text, meta)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className={cn("transition-all duration-200", detail ? "opacity-100 translate-x-0" : "opacity-95 translate-x-0.5")}>
        <SelectionDetailPanel
          detail={detail}
          loading={loadingExplain}
          speakingText={speakingText}
          onSave={handleSave}
          onReview={handleAddReview}
          onPronounce={handlePronounce}
          onSelectRelated={(chunk) =>
            void openDetail(
              chunk,
              detail?.sentence.text ?? toolbar.sourceSentence,
              detail?.sentence.translation ?? toolbar.sourceTranslation,
              detail ? [detail.chunk.text, ...detail.relatedChunks] : toolbar.sourceChunks,
            )
          }
        />
      </div>

      <SelectionDetailSheet
        detail={detail}
        open={sheetOpen}
        loading={loadingExplain}
        speakingText={speakingText}
        onOpenChange={setSheetOpen}
        onSave={handleSave}
        onReview={handleAddReview}
        onPronounce={handlePronounce}
        onSelectRelated={(chunk) =>
          void openDetail(
            chunk,
            detail?.sentence.text ?? toolbar.sourceSentence,
            detail?.sentence.translation ?? toolbar.sourceTranslation,
            detail ? [detail.chunk.text, ...detail.relatedChunks] : toolbar.sourceChunks,
          )
        }
      />
    </div>
  );
}
