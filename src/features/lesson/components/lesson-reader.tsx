"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Clock3, Headphones, Languages, Play, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { appCopy } from "@/lib/constants/copy";
import {
  findMatchingChunkInSentence,
  getChunkLayerFromLesson,
  getFirstSentence,
  getSentenceById,
} from "@/lib/data/mock-lessons";
import { useMobile } from "@/hooks/use-mobile";
import { useSpeech } from "@/hooks/use-speech";
import { Lesson, SelectionChunkLayer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LessonProgress } from "@/features/lesson/components/lesson-progress";
import { SelectionDetailPanel } from "@/features/lesson/components/selection-detail-panel";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SelectionToolbar } from "@/features/lesson/components/selection-toolbar";
import { SentenceBlock } from "@/features/lesson/components/sentence-block";

type SelectionState = {
  text: string;
  sentenceId: string;
  top: number;
  left: number;
};

type InteractionState = {
  activeSentenceId: string | null;
  activeChunkKey: string | null;
  hoveredChunkKey: string | null;
  selectionState: SelectionState | null;
};

type InteractionAction =
  | { type: "SENTENCE_SELECTED_FROM_SELECTION"; payload: SelectionState }
  | { type: "SENTENCE_CONTEXT_SET"; payload: { sentenceId: string } }
  | { type: "SELECTION_CLEARED" }
  | { type: "CHUNK_ACTIVATED"; payload: { sentenceId: string; chunkKey: string } }
  | { type: "CHUNK_HOVERED"; payload: { chunkKey: string | null } };

const TOOLBAR_WIDTH = 256;

function interactionReducer(state: InteractionState, action: InteractionAction): InteractionState {
  switch (action.type) {
    case "SENTENCE_SELECTED_FROM_SELECTION":
      return {
        activeSentenceId: action.payload.sentenceId,
        activeChunkKey: null,
        hoveredChunkKey: null,
        selectionState: action.payload,
      };
    case "SENTENCE_CONTEXT_SET":
      return {
        ...state,
        activeSentenceId: action.payload.sentenceId,
        activeChunkKey: null,
        hoveredChunkKey: null,
      };
    case "SELECTION_CLEARED":
      return {
        ...state,
        selectionState: null,
      };
    case "CHUNK_ACTIVATED":
      return {
        activeSentenceId: action.payload.sentenceId,
        activeChunkKey: action.payload.chunkKey,
        hoveredChunkKey: null,
        selectionState: null,
      };
    case "CHUNK_HOVERED":
      return {
        ...state,
        hoveredChunkKey: action.payload.chunkKey,
      };
    default:
      return state;
  }
}

export function LessonReader({ lesson }: { lesson: Lesson }) {
  const difficultyLabel =
    lesson.difficulty === "Beginner"
      ? "难度 入门"
      : lesson.difficulty === "Advanced"
        ? "难度 进阶"
        : "难度 中级";

  const firstSentence = getFirstSentence(lesson) ?? null;
  const isMobile = useMobile();
  const { speak, stop, supported, speakingText } = useSpeech();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const suppressSelectionClearRef = useRef(false);
  const sentenceNodeMapRef = useRef<Record<string, HTMLDivElement | null>>({});
  const autoPlayActiveRef = useRef(false);
  const playFromIndexRef = useRef<(index: number) => void>(() => {});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobileTranslationOpenMap, setMobileTranslationOpenMap] = useState<Record<string, boolean>>({});
  const [autoPlayActive, setAutoPlayActive] = useState(false);
  const [, setAutoPlayIndex] = useState(0);
  const shortSectionTagMap: Record<string, string> = {
    "醒来与起步": "清晨启动",
    "早餐与专注": "进入状态",
    "通勤与输入": "通勤输入",
    "到达与进入状态": "出门前整理",
  };

  const [state, dispatch] = useReducer(interactionReducer, {
    activeSentenceId: firstSentence?.id ?? null,
    activeChunkKey: null,
    hoveredChunkKey: null,
    selectionState: null,
  });

  const dispatchAction = useCallback((action: InteractionAction) => {
    console.log("[lesson-action]", action.type, action);
    dispatch(action);
  }, []);

  const sentenceCount = useMemo(
    () => lesson.sections.reduce((total, section) => total + section.sentences.length, 0),
    [lesson.sections],
  );
  const sentenceOrder = useMemo(
    () => lesson.sections.flatMap((section) => section.sentences),
    [lesson.sections],
  );

  const currentSentence = useMemo(
    () => (state.activeSentenceId ? getSentenceById(lesson, state.activeSentenceId) ?? null : null),
    [lesson, state.activeSentenceId],
  );

  const currentSection = useMemo(() => {
    if (!state.activeSentenceId) return lesson.sections[0] ?? null;
    return (
      lesson.sections.find((section) =>
        section.sentences.some((sentence) => sentence.id === state.activeSentenceId),
      ) ?? null
    );
  }, [lesson.sections, state.activeSentenceId]);

  const relatedChunks = currentSentence?.chunks ?? [];

  const chunkDetail = useMemo<SelectionChunkLayer | null>(() => {
    if (!currentSentence || !state.activeChunkKey) return null;
    return getChunkLayerFromLesson(lesson, currentSentence, state.activeChunkKey);
  }, [currentSentence, lesson, state.activeChunkKey]);
  const speakingSentenceId = useMemo(
    () => sentenceOrder.find((sentence) => sentence.text === speakingText)?.id ?? null,
    [sentenceOrder, speakingText],
  );

  useEffect(() => {
    autoPlayActiveRef.current = autoPlayActive;
  }, [autoPlayActive]);

  useEffect(() => {
    // Temporary debugging aid for race/ownership validation.
    console.log("[lesson-state]", {
      activeSentenceId: state.activeSentenceId,
      selectionText: state.selectionState?.text ?? null,
      activeChunkKey: state.activeChunkKey,
      hoveredChunkKey: state.hoveredChunkKey,
      explanationRenderSource: state.activeChunkKey ? `activeChunk:${state.activeChunkKey}` : "neutral",
    });
  }, [state.activeSentenceId, state.selectionState?.text, state.activeChunkKey, state.hoveredChunkKey]);

  useEffect(() => {
    console.log("[mobile-sheet-state]", { isMobile, sheetOpen });
  }, [isMobile, sheetOpen]);

  const findSentenceById = useCallback(
    (sentenceId: string) => getSentenceById(lesson, sentenceId),
    [lesson],
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

  const activateChunk = useCallback(
    (sentenceId: string, chunkText: string) => {
      const sentence = findSentenceById(sentenceId);
      if (!sentence) return;

      const realChunk = findMatchingChunkInSentence(sentence, chunkText);
      if (!realChunk) {
        toast.message("请点击下方短语查看解析与例句");
        return;
      }

      suppressSelectionClearRef.current = true;
      window.getSelection()?.removeAllRanges();
      dispatchAction({
        type: "CHUNK_ACTIVATED",
        payload: { sentenceId: sentence.id, chunkKey: realChunk },
      });
      if (isMobile) setSheetOpen(true);
      window.setTimeout(() => {
        suppressSelectionClearRef.current = false;
      }, 80);
    },
    [dispatchAction, findSentenceById, isMobile],
  );

  const handleSentenceTap = useCallback(
    (sentenceId: string) => {
      dispatchAction({
        type: "SENTENCE_CONTEXT_SET",
        payload: { sentenceId },
      });
      dispatchAction({ type: "SELECTION_CLEARED" });
      if (isMobile) setSheetOpen(true);
    },
    [dispatchAction, isMobile],
  );

  const handleMobileSentenceTap = useCallback(
    (sentenceId: string) => {
      console.log("[mobile-tap] sentence", { sentenceId });
      const sentence = findSentenceById(sentenceId);
      handleSentenceTap(sentenceId);
      setSheetOpen(true);
      const firstChunk = sentence?.chunks[0];
      if (firstChunk) activateChunk(sentenceId, firstChunk);
    },
    [activateChunk, findSentenceById, handleSentenceTap],
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

    const sentence = locateSourceSentenceFromRange(range);
    if (!sentence) return null;

    const viewportWidth = window.innerWidth;
    const preferredTop = rect.top - 38;
    const fallbackTop = rect.bottom + 6;
    const top = preferredTop > 8 ? preferredTop : fallbackTop;
    const centeredLeft = rect.left + rect.width / 2 - TOOLBAR_WIDTH / 2;
    const left = Math.min(viewportWidth - TOOLBAR_WIDTH - 8, Math.max(8, centeredLeft));

    return {
      text,
      sentenceId: sentence.id,
      top,
      left,
    } satisfies SelectionState;
  }, [locateSourceSentenceFromRange]);

  const handlePronounce = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (!supported) {
        toast.error("当前浏览器不支持发音功能");
        return;
      }

      if (speakingText === text) {
        stop();
        return;
      }

      const success = speak(text, { lang: "en-US" });
      if (!success) toast.error("发音失败，请稍后重试");
    },
    [speak, speakingText, stop, supported],
  );
  const toggleMobileTranslation = useCallback((sentenceId: string) => {
    setMobileTranslationOpenMap((prev) => ({
      ...prev,
      [sentenceId]: !prev[sentenceId],
    }));
  }, []);

  const startSequentialPlay = useCallback(
    (startIndex = 0) => {
      if (sentenceOrder.length === 0) return;
      const nextIndex = Math.max(0, Math.min(startIndex, sentenceOrder.length - 1));
      const target = sentenceOrder[nextIndex];
      autoPlayActiveRef.current = true;
      const success = speak(target.text, {
        lang: "en-US",
        onEnd: () => {
          setAutoPlayIndex((prevIndex) => {
            const next = (prevIndex + 1) % sentenceOrder.length;
            if (!autoPlayActiveRef.current) return prevIndex;
            window.setTimeout(() => playFromIndexRef.current(next), 80);
            return next;
          });
        },
      });
      if (!success) {
        toast.error("连播启动失败，请稍后重试");
        return;
      }
      setAutoPlayIndex(nextIndex);
      setAutoPlayActive(true);
    },
    [sentenceOrder, speak],
  );
  useEffect(() => {
    playFromIndexRef.current = startSequentialPlay;
  }, [startSequentialPlay]);

  const toggleSequentialPlay = useCallback(() => {
    if (!supported) {
      toast.error("当前浏览器不支持发音功能");
      return;
    }
    if (autoPlayActive) {
      autoPlayActiveRef.current = false;
      stop();
      setAutoPlayActive(false);
      setAutoPlayIndex(0);
      return;
    }
    startSequentialPlay(0);
  }, [autoPlayActive, startSequentialPlay, stop, supported]);

  const handleSave = useCallback(() => toast.success("已收藏短语"), []);
  const handleAddReview = useCallback(() => toast.success("已加入复习"), []);

  useEffect(() => {
    if (!isMobile) return;
    if (!speakingSentenceId) return;
    const node = sentenceNodeMapRef.current[speakingSentenceId];
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isMobile, speakingSentenceId]);

  useEffect(() => {
    if (isMobile) return;

    const syncSelection = () => {
      if (suppressSelectionClearRef.current) return;
      const current = extractSelectionInReader();
      if (!current) {
        dispatchAction({ type: "SELECTION_CLEARED" });
        return;
      }

      dispatchAction({ type: "SENTENCE_SELECTED_FROM_SELECTION", payload: current });
    };

    const onMouseUp = () => window.setTimeout(syncSelection, 0);
    const onSelectionChange = () => syncSelection();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        dispatchAction({ type: "SELECTION_CLEARED" });
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) return;
      if (!readerRef.current?.contains(event.target as Node)) {
        dispatchAction({ type: "SELECTION_CLEARED" });
      }
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
  }, [dispatchAction, extractSelectionInReader, isMobile]);

  return (
    <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <SelectionToolbar
        visible={Boolean(state.selectionState) && !isMobile}
        top={state.selectionState?.top ?? 0}
        left={state.selectionState?.left ?? 0}
        toolbarRef={toolbarRef}
        onExplain={() => {
          if (state.selectionState?.sentenceId) {
            dispatchAction({
              type: "SENTENCE_CONTEXT_SET",
              payload: { sentenceId: state.selectionState.sentenceId },
            });
            if (isMobile) setSheetOpen(true);
            toast.message("请点击下方短语查看解析与例句");
          }
          dispatchAction({ type: "SELECTION_CLEARED" });
        }}
        onSave={handleSave}
        onReview={handleAddReview}
        onPronounce={() => handlePronounce(state.selectionState?.text ?? "")}
      />

      <div ref={readerRef} className={cn("space-y-5", isMobile && "space-y-3")}>
        <Card className={cn("bg-card/95", isMobile && "border-primary/15 bg-gradient-to-b from-card to-muted/30 shadow-sm")}>
          <CardContent className={cn("space-y-4 p-5 sm:p-6", isMobile && "space-y-1.5 p-3")}>
            {isMobile ? (
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-[1.2rem] font-semibold leading-tight">
                  {lesson.title}
                </h1>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 cursor-pointer gap-1 px-2 text-xs text-muted-foreground"
                  onClick={toggleSequentialPlay}
                >
                  <Play className="size-3.5" />
                  {autoPlayActive ? "停止循环" : "循环播放"}
                </Button>
              </div>
            ) : null}
            <h1 className={cn("text-3xl font-semibold sm:text-4xl", isMobile && "hidden")}>
              {lesson.title}
            </h1>
            {isMobile ? (
              <p className="text-xs text-muted-foreground">
                {lesson.difficulty === "Beginner" ? "入门" : lesson.difficulty === "Advanced" ? "进阶" : "中级"} · {lesson.estimatedMinutes} 分钟 · {sentenceCount} 句
              </p>
            ) : (
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{lesson.subtitle}</p>
            )}
            {!isMobile ? <LessonProgress value={lesson.completionRate} /> : null}
            {!isMobile ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{difficultyLabel}</Badge>
                  <Badge variant="outline">
                    <Clock3 className="mr-1 size-3.5" />
                    预计时间 {lesson.estimatedMinutes} 分钟
                  </Badge>
                  <Badge variant="outline">{sentenceCount} 句</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-accent"
                    onClick={() => handlePronounce(currentSentence?.text ?? lesson.title)}
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
              </>
            ) : null}
          </CardContent>
        </Card>

        {isMobile ? (
          <div className="space-y-2.5">
            {lesson.sections.map((section) => {
              const active = currentSection?.id === section.id;

              return (
                <Card
                  key={section.id}
                  className={cn(
                    "border-border/70 p-3 transition-all duration-150",
                    "bg-card/95 shadow-sm",
                    active && "border-primary/40 bg-accent/20",
                  )}
                >
                  <div className="space-y-1.5">
                    <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {shortSectionTagMap[section.title] ?? "学习片段"}
                    </span>
                    <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-background/80">
                      {section.sentences.map((sentence) => {
                        const selected = currentSentence?.id === sentence.id;
                        const translationOpen = Boolean(mobileTranslationOpenMap[sentence.id]);
                        const playing = speakingSentenceId === sentence.id;

                        return (
                          <div
                            key={sentence.id}
                            ref={(node) => {
                              sentenceNodeMapRef.current[sentence.id] = node;
                            }}
                            className={cn(
                              "px-3 py-2 transition-colors",
                              playing ? "bg-primary/10" : selected ? "bg-accent/40" : "hover:bg-muted/40",
                            )}
                          >
                            <div className="mb-1 flex items-center justify-end gap-3">
                              <button
                                type="button"
                                className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleMobileTranslation(sentence.id);
                                }}
                              >
                                <Languages className="size-3.5" />
                                {translationOpen ? "收起" : "翻译"}
                              </button>
                              <button
                                type="button"
                                className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handlePronounce(sentence.text);
                                }}
                              >
                                <Volume2 className={cn("size-3.5", playing && "animate-pulse text-primary")} />
                                {playing ? "停止" : "播放"}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                console.log("[mobile-tap] sentence-button", { sentenceId: sentence.id });
                                handleMobileSentenceTap(sentence.id);
                              }}
                              className="block w-full cursor-pointer text-left focus-visible:outline-none"
                            >
                              <p className={cn("text-[1rem] leading-7 text-foreground", selected && "text-primary")}>
                                {sentence.text}
                              </p>
                            </button>
                            <div
                              className={cn(
                                "grid overflow-hidden transition-all duration-200",
                                translationOpen ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                              )}
                            >
                              <p className="min-h-0 rounded-md bg-muted/65 px-2 py-1.5 text-sm leading-6 text-muted-foreground">
                                {sentence.translation}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          lesson.sections.map((section) => (
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
                    activeChunkKey={state.activeChunkKey}
                    hoveredChunkKey={state.hoveredChunkKey}
                    onSentenceTap={handleSentenceTap}
                    mobileTapEnabled={isMobile}
                    onSelectText={(chunk, meta) => {
                      if (!meta?.sentenceId) return;
                      activateChunk(meta.sentenceId, chunk);
                    }}
                    onHoverChunk={(chunkKey) =>
                      dispatchAction({ type: "CHUNK_HOVERED", payload: { chunkKey } })
                    }
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <div
        className={cn(
          "transition-all duration-200",
          currentSentence || chunkDetail ? "opacity-100 translate-x-0" : "opacity-95 translate-x-0.5",
        )}
      >
        <SelectionDetailPanel
          currentSentence={currentSentence}
          chunkDetail={chunkDetail}
          relatedChunks={relatedChunks}
          loading={false}
          speakingText={speakingText}
          onSave={handleSave}
          onReview={handleAddReview}
          onPronounce={handlePronounce}
          onSelectRelated={(chunk) => {
            if (!state.activeSentenceId) return;
            activateChunk(state.activeSentenceId, chunk);
          }}
          hoveredChunkKey={state.hoveredChunkKey}
          onHoverChunk={(chunkKey) =>
            dispatchAction({ type: "CHUNK_HOVERED", payload: { chunkKey } })
          }
        />
      </div>

      <SelectionDetailSheet
        currentSentence={currentSentence}
        chunkDetail={chunkDetail}
        relatedChunks={relatedChunks}
        open={sheetOpen}
        loading={false}
        speakingText={speakingText}
        onOpenChange={setSheetOpen}
        onSave={handleSave}
        onReview={handleAddReview}
        onPronounce={handlePronounce}
        onSelectRelated={(chunk) => {
          if (!state.activeSentenceId) return;
          activateChunk(state.activeSentenceId, chunk);
        }}
        hoveredChunkKey={state.hoveredChunkKey}
        onHoverChunk={(chunkKey) =>
          dispatchAction({ type: "CHUNK_HOVERED", payload: { chunkKey } })
        }
      />
    </div>
  );
}
