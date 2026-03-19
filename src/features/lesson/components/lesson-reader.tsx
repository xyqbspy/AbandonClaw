"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Headphones,
  Languages,
  Play,
  Volume2,
} from "lucide-react";
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
import { Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LessonProgress } from "@/features/lesson/components/lesson-progress";
import { SelectionDetailPanel } from "@/features/lesson/components/selection-detail-panel";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SelectionToolbar } from "@/features/lesson/components/selection-toolbar";
import { SentenceBlock } from "@/features/lesson/components/sentence-block";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_LG, APPLE_SURFACE } from "@/lib/ui/apple-style";

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
  | {
      type: "CHUNK_ACTIVATED";
      payload: { sentenceId: string; chunkKey: string };
    }
  | { type: "CHUNK_HOVERED"; payload: { chunkKey: string | null } };

type MobileSentenceGroup = {
  key: string;
  sentenceIds: string[];
  text: string;
  translation: string;
  relatedChunks: string[];
  speaker?: "A" | "B";
};

const speakerLabel = (speaker?: "A" | "B") => {
  if (speaker === "A") return "A";
  if (speaker === "B") return "B";
  return "";
};

function groupSentencesForMobile(
  sentences: Lesson["sections"][number]["sentences"],
) {
  const groups: Array<typeof sentences> = [];
  let index = 0;

  while (index < sentences.length) {
    const current = sentences[index];
    const next = sentences[index + 1];
    const isCurrentLong = current.text.length > 95;
    const hasSpeaker = Boolean(current.speaker || next?.speaker);

    if (isCurrentLong || !next || hasSpeaker) {
      groups.push([current]);
      index += 1;
      continue;
    }

    const looksLikeQuestion = /[?？！]\s*$/.test(current.text.trim());
    const areBothShort = current.text.length <= 80 && next.text.length <= 80;

    if (looksLikeQuestion || areBothShort) {
      groups.push([current, next]);
      index += 2;
      continue;
    }

    groups.push([current]);
    index += 1;
  }

  return groups;
}

const TOOLBAR_WIDTH = 256;
const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;

function interactionReducer(
  state: InteractionState,
  action: InteractionAction,
): InteractionState {
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

export function LessonReader({
  lesson,
  headerTools,
  savedPhraseTexts,
  onSavePhrase,
  onReviewPhrase,
}: {
  lesson: Lesson;
  headerTools?: ReactNode;
  savedPhraseTexts?: string[];
  onSavePhrase?: (payload: {
    text: string;
    translation?: string;
    usageNote?: string;
    sourceSceneSlug?: string;
    sourceSentenceIndex?: number;
    sourceSentenceText?: string;
    sourceChunkText?: string;
  }) => Promise<{ created?: boolean } | void> | { created?: boolean } | void;
  onReviewPhrase?: (payload: {
    text: string;
    translation?: string;
    usageNote?: string;
    sourceSceneSlug?: string;
    sourceSentenceIndex?: number;
    sourceSentenceText?: string;
    sourceChunkText?: string;
  }) => Promise<{ created?: boolean } | void> | { created?: boolean } | void;
}) {
  const difficultyLabel =
    lesson.difficulty === "Beginner"
      ? "入门"
      : lesson.difficulty === "Advanced"
        ? "进阶"
        : "中级";
  const isDialogueScene = lesson.sceneType === "dialogue";

  const firstSentence = getFirstSentence(lesson) ?? null;
  const isMobile = useMobile();
  const { speak, stop, supported, speakingText } = useSpeech();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const suppressSelectionClearRef = useRef(false);
  const sentenceNodeMapRef = useRef<Record<string, HTMLDivElement | null>>({});
  const autoPlayActiveRef = useRef(false);
  const autoPlayIndexRef = useRef(0);
  const autoPlayWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playFromIndexRef = useRef<(index: number) => void>(() => {});
  const sentenceLoopRef = useRef<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogueTranslationOpenMap, setDialogueTranslationOpenMap] =
    useState<Record<string, boolean>>({});
  const [mobileGroupTranslationOpenMap, setMobileGroupTranslationOpenMap] =
    useState<Record<string, boolean>>({});
  const [mobileActiveGroup, setMobileActiveGroup] =
    useState<MobileSentenceGroup | null>(null);
  const [autoPlayActive, setAutoPlayActive] = useState(false);
  const [, setAutoPlayIndex] = useState(0);
  const [localSavedPhraseTexts, setLocalSavedPhraseTexts] = useState<Set<string>>(new Set());
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
    () =>
      lesson.sections.reduce(
        (total, section) => total + section.sentences.length,
        0,
      ),
    [lesson.sections],
  );
  const sceneTypeMetaLabel = isDialogueScene
    ? `双人对话 · ${sentenceCount}轮`
    : `自述练习 · ${sentenceCount}句`;
  const sceneMetaLabel = `${difficultyLabel} · ${lesson.estimatedMinutes}分钟 · ${sceneTypeMetaLabel}`;
  const sentenceSectionLabel = isDialogueScene ? "当前对话" : "当前表达";
  const sentenceOrder = useMemo(
    () => lesson.sections.flatMap((section) => section.sentences),
    [lesson.sections],
  );

  const currentSentence = useMemo(
    () =>
      state.activeSentenceId
        ? (getSentenceById(lesson, state.activeSentenceId) ?? null)
        : null,
    [lesson, state.activeSentenceId],
  );

  const mobileDisplaySentence = useMemo<LessonSentence | null>(() => {
    if (isDialogueScene) return currentSentence;
    if (!isMobile || !mobileActiveGroup) return currentSentence;
    return {
      id: mobileActiveGroup.key,
      text: mobileActiveGroup.text,
      translation: mobileActiveGroup.translation,
      chunks: mobileActiveGroup.relatedChunks,
      speaker: mobileActiveGroup.speaker,
      audioText: mobileActiveGroup.text,
    };
  }, [currentSentence, isDialogueScene, isMobile, mobileActiveGroup]);

  const currentSection = useMemo(() => {
    if (!state.activeSentenceId) return lesson.sections[0] ?? null;
    return (
      lesson.sections.find((section) =>
        section.sentences.some(
          (sentence) => sentence.id === state.activeSentenceId,
        ),
      ) ?? null
    );
  }, [lesson.sections, state.activeSentenceId]);

  const relatedChunks = isMobile && !isDialogueScene
    ? (mobileActiveGroup?.relatedChunks ?? currentSentence?.chunks ?? [])
    : (currentSentence?.chunks ?? []);

  const chunkDetail = useMemo<SelectionChunkLayer | null>(() => {
    if (!currentSentence || !state.activeChunkKey) return null;
    return getChunkLayerFromLesson(
      lesson,
      currentSentence,
      state.activeChunkKey,
    );
  }, [currentSentence, lesson, state.activeChunkKey]);
  const combinedSavedPhraseTexts = useMemo(() => {
    const fromProps = (savedPhraseTexts ?? [])
      .map((text) => normalizePhraseText(text))
      .filter(Boolean);
    return new Set([...fromProps, ...localSavedPhraseTexts]);
  }, [localSavedPhraseTexts, savedPhraseTexts]);

  const chunkSaved = useMemo(() => {
    if (!chunkDetail?.text) return false;
    return combinedSavedPhraseTexts.has(normalizePhraseText(chunkDetail.text));
  }, [chunkDetail, combinedSavedPhraseTexts]);

  const buildPhrasePayload = useCallback(() => {
    if (!chunkDetail?.text) return null;
    const sentence = currentSentence;
    const sentenceIndex = sentence
      ? sentenceOrder.findIndex((item) => item.id === sentence.id)
      : -1;
    return {
      text: chunkDetail.text,
      translation: chunkDetail.translation,
      usageNote: chunkDetail.usageNote,
      sourceSceneSlug: lesson.slug,
      sourceSentenceIndex: sentenceIndex >= 0 ? sentenceIndex : undefined,
      sourceSentenceText: sentence?.text,
      sourceChunkText: chunkDetail.text,
    };
  }, [chunkDetail, currentSentence, lesson.slug, sentenceOrder]);

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
      explanationRenderSource: state.activeChunkKey
        ? `activeChunk:${state.activeChunkKey}`
        : "neutral",
    });
  }, [
    state.activeSentenceId,
    state.selectionState?.text,
    state.activeChunkKey,
    state.hoveredChunkKey,
  ]);

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
        return (
          (element?.closest("[data-sentence-id]") as HTMLElement | null)
            ?.dataset.sentenceId ?? ""
        );
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
    [dispatchAction, findSentenceById, isMobile, setSheetOpen],
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
    [dispatchAction, isMobile, setSheetOpen],
  );

  const toggleDialogueTranslation = useCallback((sentenceId: string) => {
    setDialogueTranslationOpenMap((prev) => ({
      ...prev,
      [sentenceId]: !prev[sentenceId],
    }));
  }, []);

  const handleMobileGroupTap = useCallback(
    (group: MobileSentenceGroup) => {
      console.log("[mobile-tap] sentence-group", {
        groupKey: group.key,
        sentenceIds: group.sentenceIds,
      });
      const anchorSentenceId = group.sentenceIds[0];
      const anchorSentence = findSentenceById(anchorSentenceId);
      dispatchAction({
        type: "SENTENCE_CONTEXT_SET",
        payload: { sentenceId: anchorSentenceId },
      });
      dispatchAction({ type: "SELECTION_CLEARED" });
      setMobileActiveGroup(group);
      setSheetOpen(true);
      const firstChunk = anchorSentence?.chunks[0];
      if (firstChunk) activateChunk(anchorSentenceId, firstChunk);
    },
    [activateChunk, dispatchAction, findSentenceById, setSheetOpen],
  );

  const extractSelectionInReader = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
      return null;

    const text = selection.toString().trim();
    if (!text) return null;

    const range = selection.getRangeAt(0);
    const rootNode = range.commonAncestorContainer;
    const element =
      rootNode.nodeType === Node.TEXT_NODE
        ? rootNode.parentElement
        : (rootNode as Element);
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
    const left = Math.min(
      viewportWidth - TOOLBAR_WIDTH - 8,
      Math.max(8, centeredLeft),
    );

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

  const handleLoopSentence = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      if (!supported) {
        toast.error("当前浏览器不支持发音功能");
        return;
      }

      if (sentenceLoopRef.current === clean && speakingText === clean) {
        sentenceLoopRef.current = null;
        stop();
        return;
      }

      autoPlayActiveRef.current = false;
      setAutoPlayActive(false);
      sentenceLoopRef.current = clean;

      const speakLoop = () => {
        if (sentenceLoopRef.current !== clean) return;
        const success = speak(clean, {
          lang: "en-US",
          onEnd: () => {
            if (sentenceLoopRef.current !== clean) return;
            window.setTimeout(speakLoop, 80);
          },
          onError: () => {
            sentenceLoopRef.current = null;
          },
        });
        if (!success) {
          sentenceLoopRef.current = null;
          toast.error("播放失败，请稍后重试");
        }
      };

      speakLoop();
    },
    [speak, speakingText, stop, supported],
  );
  const startSequentialPlay = useCallback(
    (startIndex = 0) => {
      if (sentenceOrder.length === 0) return;
      const nextIndex = Math.max(
        0,
        Math.min(startIndex, sentenceOrder.length - 1),
      );
      const target = sentenceOrder[nextIndex];
      autoPlayActiveRef.current = true;
      autoPlayIndexRef.current = nextIndex;
      const success = speak(target.text, {
        lang: "en-US",
        onEnd: () => {
          if (!autoPlayActiveRef.current) return;
          const next = (autoPlayIndexRef.current + 1) % sentenceOrder.length;
          autoPlayIndexRef.current = next;
          setAutoPlayIndex(next);
          window.setTimeout(() => playFromIndexRef.current(next), 80);
        },
        onError: () => {
          if (!autoPlayActiveRef.current) return;
          const next = (autoPlayIndexRef.current + 1) % sentenceOrder.length;
          autoPlayIndexRef.current = next;
          setAutoPlayIndex(next);
          window.setTimeout(() => playFromIndexRef.current(next), 120);
        },
      });
      if (!success) {
        autoPlayActiveRef.current = false;
        setAutoPlayActive(false);
        setAutoPlayIndex(0);
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

  const stopSequentialPlay = useCallback(() => {
    autoPlayActiveRef.current = false;
    if (autoPlayWatchdogRef.current) {
      clearTimeout(autoPlayWatchdogRef.current);
      autoPlayWatchdogRef.current = null;
    }
    stop();
    setAutoPlayActive(false);
    setAutoPlayIndex(0);
  }, [stop]);

  useEffect(() => {
    if (!autoPlayActive) {
      if (autoPlayWatchdogRef.current) {
        clearTimeout(autoPlayWatchdogRef.current);
        autoPlayWatchdogRef.current = null;
      }
      return;
    }
    if (speakingText) return;
    autoPlayWatchdogRef.current = setTimeout(() => {
      if (!autoPlayActiveRef.current) return;
      playFromIndexRef.current(autoPlayIndexRef.current);
    }, 1800);

    return () => {
      if (autoPlayWatchdogRef.current) {
        clearTimeout(autoPlayWatchdogRef.current);
        autoPlayWatchdogRef.current = null;
      }
    };
  }, [autoPlayActive, speakingText]);

  useEffect(() => {
    if (!sheetOpen) return;
    if (state.activeChunkKey) return;

    const activeSentence =
      (state.activeSentenceId
        ? sentenceOrder.find((item) => item.id === state.activeSentenceId)
        : null) ?? firstSentence;
    if (!activeSentence?.id) return;

    const firstChunk = activeSentence.chunks[0];
    if (firstChunk) {
      dispatchAction({
        type: "CHUNK_ACTIVATED",
        payload: { sentenceId: activeSentence.id, chunkKey: firstChunk },
      });
      return;
    }

    dispatchAction({
      type: "SENTENCE_CONTEXT_SET",
      payload: { sentenceId: activeSentence.id },
    });
  }, [
    dispatchAction,
    firstSentence,
    sentenceOrder,
    sheetOpen,
    state.activeChunkKey,
    state.activeSentenceId,
  ]);

  const toggleSequentialPlay = useCallback(() => {
    if (!supported) {
      toast.error("当前浏览器不支持发音功能");
      return;
    }
    if (autoPlayActive) {
      stopSequentialPlay();
      return;
    }
    startSequentialPlay(0);
  }, [autoPlayActive, startSequentialPlay, stopSequentialPlay, supported]);

  const handleSave = useCallback(async () => {
    const payload = buildPhrasePayload();
    if (!payload) return;
    try {
      const result = await onSavePhrase?.(payload);
      setLocalSavedPhraseTexts((prev) => {
        const next = new Set(prev);
        next.add(normalizePhraseText(payload.text));
        return next;
      });
      if (result && typeof result === "object" && result.created === false) {
        toast.message("该短语已在收藏中");
        return;
      }
      toast.success("已收藏短语");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "收藏短语失败");
    }
  }, [buildPhrasePayload, onSavePhrase]);

  const handleAddReview = useCallback(async () => {
    const payload = buildPhrasePayload();
    if (!payload) return;
    try {
      if (onReviewPhrase) {
        await onReviewPhrase(payload);
      } else if (onSavePhrase) {
        await onSavePhrase(payload);
      }
      setLocalSavedPhraseTexts((prev) => {
        const next = new Set(prev);
        next.add(normalizePhraseText(payload.text));
        return next;
      });
      toast.success("已加入复习");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加入复习失败");
    }
  }, [buildPhrasePayload, onReviewPhrase, onSavePhrase]);

  useEffect(() => {
    if (isMobile) return;

    const syncSelection = () => {
      if (suppressSelectionClearRef.current) return;
      const current = extractSelectionInReader();
      if (!current) {
        dispatchAction({ type: "SELECTION_CLEARED" });
        return;
      }

      dispatchAction({
        type: "SENTENCE_SELECTED_FROM_SELECTION",
        payload: current,
      });
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

  const renderDialogueBubble = useCallback(
    (sentence: LessonSentence) => {
      const speaker = sentence.speaker ?? "A";
      const translationOpen = Boolean(dialogueTranslationOpenMap[sentence.id]);
      const showTranslation = translationOpen;
      const sentenceSpeaking = speakingText === (sentence.audioText ?? sentence.text);

      return (
        <div
          key={sentence.id}
          className={cn(
            "flex w-full",
            speaker === "B" ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={cn(
              "w-full max-w-[90%] sm:max-w-[78%]",
              speaker === "B" ? "items-end" : "items-start",
            )}
          >
            <article
              className={cn(
                "rounded-lg px-3 py-2.5 transition-colors",
                "hover:bg-muted/20",
                speaker === "A" && "bg-[rgb(246,246,246)]",
                speaker === "B" && "bg-[rgb(210,255,152)]",
              )}
            >
              <div className="mb-1">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]",
                    speaker === "A"
                      ? "border-sky-200/80 bg-sky-50/40 text-sky-700"
                      : "border-emerald-200/80 bg-emerald-50/40 text-emerald-700",
                  )}
                >
                  {speakerLabel(speaker)}
                </Badge>
              </div>

              <p
                data-sentence-id={sentence.id}
                data-sentence-text={sentence.text}
                data-sentence-translation={sentence.translation}
                className="cursor-pointer text-[1.03rem] leading-relaxed text-foreground/95"
                onClick={() => handleSentenceTap(sentence.id)}
              >
                {sentence.text}
              </p>

              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                  onClick={() => toggleDialogueTranslation(sentence.id)}
                >
                  <Languages className="size-3.5" />
                  翻译
                </button>
                <span className="opacity-40">·</span>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                  onClick={() => handlePronounce(sentence.audioText ?? sentence.text)}
                >
                  <Volume2 className={cn("size-3.5", sentenceSpeaking && "animate-pulse text-primary")} />
                  朗读
                </button>
              </div>

              {showTranslation ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {sentence.translation || "该句翻译暂未提供。"}
                </p>
              ) : null}
            </article>
          </div>
        </div>
      );
    },
    [
      dialogueTranslationOpenMap,
      handlePronounce,
      handleSentenceTap,
      speakingText,
      toggleDialogueTranslation,
    ],
  );

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

      <div
        ref={readerRef}
        className={cn("space-y-5", isMobile && "space-y-1.5")}
      >
        {isDialogueScene ? (
          <div className={cn("py-1.5", isMobile ? "px-1" : "px-1.5")}>
            <div className="flex items-center justify-end gap-2">
              {headerTools}
              <button
                type="button"
                className={cn(
                  `inline-flex items-center gap-1.5 text-foreground/85 ${appleButtonLgClassName}`,
                  "cursor-pointer whitespace-nowrap",
                  isMobile && "px-2 py-1 text-[15px]",
                )}
                onClick={toggleSequentialPlay}
              >
                <Play className={cn("size-4", isMobile && "size-3.5")} />
                {autoPlayActive ? "停止循环" : "循环播放"}
              </button>
            </div>
          </div>
        ) : (
          <Card
            className={cn(
              APPLE_SURFACE,
              isMobile && "border-0 ring-0 bg-primary/[0.035] shadow-none",
            )}
          >
            <CardContent
              className={cn(
                "space-y-4 p-5 sm:p-6",
                isMobile && "space-y-1 p-2.5",
              )}
            >
              {isMobile ? (
                <>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <h1 className="line-clamp-2 text-[1rem] font-semibold leading-6">
                      {lesson.title}
                    </h1>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 cursor-pointer gap-1 px-1.5 text-[10px] text-muted-foreground/80"
                      onClick={toggleSequentialPlay}
                    >
                      <Play className="size-3" />
                      {autoPlayActive ? "停止循环" : "循环播放"}
                    </Button>
                  </div>
                  <p className="text-[10px] leading-4 whitespace-nowrap text-muted-foreground/80">
                    {sceneMetaLabel}
                  </p>
                  {headerTools ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {headerTools}
                    </div>
                  ) : null}
                </>
              ) : null}
              <h1
                className={cn(
                  "text-3xl font-semibold sm:text-4xl",
                  isMobile && "hidden",
                )}
              >
                {lesson.title}
              </h1>
              {isMobile ? null : (
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                  {lesson.subtitle}
                </p>
              )}
              {!isMobile ? (
                <LessonProgress value={lesson.completionRate} />
              ) : null}
              {!isMobile ? (
                <>
                  <p className="text-sm text-muted-foreground">{sceneMetaLabel}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-accent"
                      onClick={toggleSequentialPlay}
                    >
                      <Play className="size-4" />
                      {autoPlayActive ? "停止循环" : "循环播放"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-accent"
                      onClick={() =>
                        handlePronounce(currentSentence?.text ?? lesson.title)
                      }
                    >
                      <Headphones className="size-4" />
                      播放本节发音
                    </Button>
                    {headerTools}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {appCopy.lesson.prompt}
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {isDialogueScene ? (
          <div className={cn("space-y-2", isMobile && "space-y-1.5")}>
            {sentenceOrder.map((sentence) => renderDialogueBubble(sentence))}
          </div>
        ) : isMobile ? (
          <div className="overflow-hidden bg-transparent">
            {lesson.sections.map((section) => {
              const active = currentSection?.id === section.id;
              const groupedSentences = groupSentencesForMobile(section.sentences);

              return (
                <div key={section.id} className="space-y-1.5">
                  {groupedSentences.map((group, groupIndex) => {
                    const groupKey = `${section.id}-group-${groupIndex}`;
                    const groupText = group.map((sentence) => sentence.text).join(" ");
                    const groupTranslation = group.map((sentence) => sentence.translation).join(" ");
                    const groupPlaying = speakingText === groupText;
                    const groupSelected = group.some((sentence) => sentence.id === state.activeSentenceId);
                    const translationOpen = Boolean(mobileGroupTranslationOpenMap[groupKey]);
                    const groupRelatedChunks = Array.from(new Set(group.flatMap((sentence) => sentence.chunks)));
                    const groupContext: MobileSentenceGroup = {
                      key: groupKey,
                      sentenceIds: group.map((sentence) => sentence.id),
                      text: groupText,
                      translation: groupTranslation,
                      relatedChunks: groupRelatedChunks,
                      speaker: group.length === 1 ? group[0]?.speaker : undefined,
                    };

                    return (
                      <div
                        key={groupKey}
                        className={cn(
                          "rounded-lg px-2 py-1 transition-colors duration-150",
                          groupSelected
                            ? "bg-accent/12"
                            : active
                              ? "bg-muted/8"
                              : "hover:bg-muted/20",
                        )}
                      >
                        <div className="px-1.5 py-0.5">
                          <div
                            className={cn(
                              "cursor-pointer transition-colors",
                              groupPlaying ? "text-primary" : "",
                            )}
                            onClick={() => handleMobileGroupTap(groupContext)}
                          >
                            <div className={cn("mb-1 flex items-center justify-end gap-2", groupSelected && "text-primary")}>
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex cursor-pointer items-center gap-1 text-[11px] leading-none transition-colors active:opacity-70",
                                  groupSelected
                                    ? "text-primary/80 hover:text-primary/95"
                                    : "text-muted-foreground/70 hover:text-muted-foreground",
                                )}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setMobileGroupTranslationOpenMap((prev) => ({
                                    ...prev,
                                    [groupKey]: !prev[groupKey],
                                  }));
                                }}
                              >
                                <Languages className="size-3" />
                                {translationOpen ? "收起" : "翻译"}
                              </button>
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex cursor-pointer items-center gap-1 text-[11px] leading-none transition-colors active:opacity-70",
                                  groupSelected
                                    ? "text-primary/80 hover:text-primary/95"
                                    : "text-muted-foreground/70 hover:text-muted-foreground",
                                )}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleLoopSentence(groupText);
                                }}
                              >
                                <Volume2 className={cn("size-3", groupPlaying && "animate-pulse text-primary")} />
                                {groupPlaying ? "停止" : "播放"}
                              </button>
                            </div>

                            <div
                              className={cn(
                                "grid overflow-hidden transition-all duration-200",
                                translationOpen ? "mb-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                              )}
                            >
                              <p className="min-h-0 rounded-sm bg-muted/35 px-2.5 py-1.5 text-[13px] leading-6 text-muted-foreground">
                                {groupTranslation}
                              </p>
                            </div>
                          </div>

                          <div
                            ref={(node) => {
                              for (const sentence of group) {
                                sentenceNodeMapRef.current[sentence.id] = node;
                              }
                            }}
                            className="cursor-pointer transition-colors"
                            onClick={() => handleMobileGroupTap(groupContext)}
                          >
                            <p
                              className={cn(
                                "text-[16px] leading-[1.72] font-normal tracking-[0.01em] text-foreground/95",
                                groupSelected && "text-primary",
                              )}
                            >
                              {groupText}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                    showSpeaker={false}
                    speaking={speakingText === (sentence.audioText ?? sentence.text)}
                    activeChunkKey={state.activeChunkKey}
                    hoveredChunkKey={state.hoveredChunkKey}
                    onPronounce={handlePronounce}
                    onSentenceTap={handleSentenceTap}
                    mobileTapEnabled={isMobile}
                    onSelectText={(chunk, meta) => {
                      if (!meta?.sentenceId) return;
                      activateChunk(meta.sentenceId, chunk);
                    }}
                    onHoverChunk={(chunkKey) =>
                      dispatchAction({
                        type: "CHUNK_HOVERED",
                        payload: { chunkKey },
                      })
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
          currentSentence || chunkDetail
            ? "opacity-100 translate-x-0"
            : "opacity-95 translate-x-0.5",
        )}
      >
        <SelectionDetailPanel
          currentSentence={mobileDisplaySentence}
          chunkDetail={chunkDetail}
          relatedChunks={relatedChunks}
          showSpeaker={isDialogueScene}
          sentenceSectionLabel={sentenceSectionLabel}
          loading={false}
          speakingText={speakingText}
          onSave={handleSave}
          onReview={handleAddReview}
          saved={chunkSaved}
          onPronounce={handlePronounce}
          onSelectRelated={(chunk) => {
            if (isMobile && mobileActiveGroup) {
              const matchSentenceId =
                mobileActiveGroup.sentenceIds.find((id) => {
                  const sentence = findSentenceById(id);
                  return sentence?.chunks.some(
                    (item) => item.toLowerCase() === chunk.toLowerCase(),
                  );
                }) ?? mobileActiveGroup.sentenceIds[0];
              if (!matchSentenceId) return;
              activateChunk(matchSentenceId, chunk);
              return;
            }
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
        currentSentence={mobileDisplaySentence}
        chunkDetail={chunkDetail}
        relatedChunks={relatedChunks}
        open={sheetOpen}
        showSpeaker={isDialogueScene}
        sentenceSectionLabel={sentenceSectionLabel}
        loading={false}
        speakingText={speakingText}
        onOpenChange={setSheetOpen}
        onSave={handleSave}
        onReview={handleAddReview}
        saved={chunkSaved}
        onPronounce={handlePronounce}
        onLoopSentence={handleLoopSentence}
        onSelectRelated={(chunk) => {
          if (isMobile && mobileActiveGroup) {
            const matchSentenceId =
              mobileActiveGroup.sentenceIds.find((id) => {
                const sentence = findSentenceById(id);
                return sentence?.chunks.some(
                  (item) => item.toLowerCase() === chunk.toLowerCase(),
                );
              }) ?? mobileActiveGroup.sentenceIds[0];
            if (!matchSentenceId) return;
            activateChunk(matchSentenceId, chunk);
            return;
          }
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



