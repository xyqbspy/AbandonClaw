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
  ArrowLeft,
  Info,
  Languages,
  Pause,
  Play,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { appCopy } from "@/lib/constants/copy";
import { LoopActionButton } from "@/components/audio/loop-action-button";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import {
  findMatchingChunkInSentence,
  getChunkLayerFromLesson,
  getFirstSentence,
  getSentenceById,
} from "@/lib/data/mock-lessons";
import { useMobile } from "@/hooks/use-mobile";
import { useTtsPlaybackState } from "@/hooks/use-tts-playback-state";
import { Lesson, LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LessonProgress } from "@/features/lesson/components/lesson-progress";
import { SelectionDetailPanel } from "@/features/lesson/components/selection-detail-panel";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SelectionToolbar } from "@/features/lesson/components/selection-toolbar";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { trackChunksFromApi } from "@/lib/utils/chunks-api";
import { getSentenceSpeakText } from "@/lib/utils/audio-warmup";
import { scheduleLessonAudioWarmup } from "@/lib/utils/resource-actions";
import {
  getLessonBlocks,
  getLessonSentences,
  getSectionBlocks,
  getSectionSentences,
} from "@/lib/shared/lesson-content";
import {
  playChunkAudio,
  playSceneLoopAudio,
  playSentenceAudio,
  setTtsLooping,
  stopTtsPlayback,
} from "@/lib/utils/tts-api";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_LG,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_PANEL_RAISED,
  APPLE_SURFACE,
} from "@/lib/ui/apple-style";
import {
  LESSON_DIALOGUE_A_BG_CLASS,
  LESSON_DIALOGUE_B_BG_CLASS,
} from "@/features/lesson/styles/dialogue-theme";
import {
  groupSentencesForMobile,
  interactionReducer,
  InteractionAction,
  MobileSentenceGroup,
  SelectionState,
} from "./lesson-reader-logic";

const normalizeSpeaker = (speaker?: string) => (speaker ?? "").trim().toUpperCase();
const isPrimarySpeaker = (speaker?: string) => normalizeSpeaker(speaker) === "A";
const speakerLabel = (speaker?: string) => normalizeSpeaker(speaker);

const TOOLBAR_WIDTH = 256;
const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;
const hasSpeakerTag = (speaker?: string) => /^[A-Z]$/.test((speaker ?? "").trim().toUpperCase());
const dialogueFooterButtonClassName =
  "inline-flex items-center justify-center border-none bg-transparent text-[#666]";
const dialogueTextButtonClassName =
  "inline-flex cursor-pointer items-center gap-1 text-[12px] leading-none text-[#8e9aaf] transition-colors hover:text-[#2c3e50] active:opacity-70";

export function LessonReader({
  lesson,
  headerTools,
  headerTitle,
  onBackToList,
  topRightTool,
  minimalHeader = false,
  interactionMode = "default",
  savedPhraseTexts,
  onSavePhrase,
  onReviewPhrase,
  onSceneLoopPlayback,
  onChunkEncounter,
  onSentencePracticeComplete,
}: {
  lesson: Lesson;
  headerTools?: ReactNode;
  headerTitle?: string;
  onBackToList?: () => void;
  topRightTool?: ReactNode;
  minimalHeader?: boolean;
  interactionMode?: "default" | "training";
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
  onSceneLoopPlayback?: (payload: { lesson: Lesson }) => void;
  onChunkEncounter?: (payload: {
    lesson: Lesson;
    sentence: LessonSentence;
    chunkText: string;
    blockId?: string;
    source?: "direct" | "related";
  }) => void;
  onSentencePracticeComplete?: (payload: {
    lesson: Lesson;
    sentence: LessonSentence;
    blockId?: string;
  }) => void;
}) {
  const difficultyLabel =
    lesson.difficulty === "Beginner"
      ? "入门"
      : lesson.difficulty === "Advanced"
        ? "进阶"
        : "中级";
  const blockOrder = useMemo(() => getLessonBlocks(lesson), [lesson]);
  const hasDialogueLikeSpeakers =
    blockOrder.length > 0 && blockOrder.every((block) => hasSpeakerTag(block.speaker));
  const isDialogueScene =
    lesson.sceneType === "dialogue" ||
    blockOrder.some((block) => (block.kind ?? lesson.sceneType ?? "monologue") === "dialogue") ||
    hasDialogueLikeSpeakers;
  const firstBlock = blockOrder[0] ?? null;

  const firstSentence = getFirstSentence(lesson) ?? null;
  const isMobile = useMobile();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const suppressSelectionClearRef = useRef(false);
  const sentenceNodeMapRef = useRef<Record<string, HTMLDivElement | null>>({});
  const sentenceLoopRef = useRef<string | null>(null);
  const trackedEncounterKeysRef = useRef<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogueBlockTranslationOpenMap, setDialogueBlockTranslationOpenMap] =
    useState<Record<string, boolean>>({});
  const [mobileGroupTranslationOpenMap, setMobileGroupTranslationOpenMap] =
    useState<Record<string, boolean>>({});
  const [mobileActiveGroup, setMobileActiveGroup] =
    useState<MobileSentenceGroup | null>(null);
  const [localSavedPhraseTexts, setLocalSavedPhraseTexts] = useState<Set<string>>(new Set());
  const [detailVisible, setDetailVisible] = useState(interactionMode !== "training");
  const [trainingPromptSentenceId, setTrainingPromptSentenceId] = useState<string | null>(null);
  const [practicedSentenceIds, setPracticedSentenceIds] = useState<Set<string>>(new Set());
  const [trainingSentenceId, setTrainingSentenceId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(
    isDialogueScene ? firstBlock?.id ?? null : null,
  );
  const [state, dispatch] = useReducer(interactionReducer, {
    activeSentenceId: firstSentence?.id ?? null,
    activeChunkKey: null,
    hoveredChunkKey: null,
    selectionState: null,
  });

  const dispatchAction = useCallback((action: InteractionAction) => {
    dispatch(action);
  }, []);
  const isTrainingMode = interactionMode === "training";

  const sentenceCount = useMemo(
    () => getLessonSentences(lesson).length,
    [lesson],
  );
  const sceneTypeMetaLabel = isDialogueScene
    ? `双人对话 · ${sentenceCount}轮`
    : `自述练习 · ${sentenceCount}句`;
  const sceneMetaLabel = `${difficultyLabel} · ${lesson.estimatedMinutes}分钟 · ${sceneTypeMetaLabel}`;
  const resolvedHeaderTitle = headerTitle?.trim() || lesson.subtitle?.trim() || lesson.title;
  const sentenceSectionLabel = isDialogueScene ? "当前对话块" : "当前表达块";
  const sentenceOrder = useMemo(
    () => getLessonSentences(lesson),
    [lesson],
  );
  const sentenceIndexMap = useMemo(
    () => new Map(sentenceOrder.map((sentence, index) => [sentence.id, index])),
    [sentenceOrder],
  );

  const currentSentence = useMemo(
    () =>
      state.activeSentenceId
        ? (getSentenceById(lesson, state.activeSentenceId) ?? null)
        : null,
    [lesson, state.activeSentenceId],
  );
  const currentBlock = useMemo(
    () => {
      if (isDialogueScene && activeBlockId) {
        return blockOrder.find((block) => block.id === activeBlockId) ?? null;
      }
      return state.activeSentenceId
        ? (blockOrder.find((block) =>
            block.sentences.some((sentence) => sentence.id === state.activeSentenceId),
          ) ?? null)
        : null;
    },
    [activeBlockId, blockOrder, isDialogueScene, state.activeSentenceId],
  );
  const currentSentenceOwnerBlock = useMemo(
    () =>
      state.activeSentenceId
        ? (blockOrder.find((block) =>
            block.sentences.some((sentence) => sentence.id === state.activeSentenceId),
          ) ?? null)
        : null,
    [blockOrder, state.activeSentenceId],
  );
  const currentTrainingSentence = useMemo(
    () =>
      trainingSentenceId
        ? (getSentenceById(lesson, trainingSentenceId) ?? null)
        : null,
    [lesson, trainingSentenceId],
  );
  const currentTrainingSentenceOwnerBlock = useMemo(
    () =>
      trainingSentenceId
        ? (blockOrder.find((block) =>
            block.sentences.some((sentence) => sentence.id === trainingSentenceId),
          ) ?? null)
        : null,
    [blockOrder, trainingSentenceId],
  );
  const activeTrainingSentence = currentTrainingSentence ?? currentSentence ?? firstSentence;

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

  useEffect(() => {
    if (!isDialogueScene || !state.activeSentenceId) return;
    const ownerBlock = blockOrder.find((block) =>
      block.sentences.some((sentence) => sentence.id === state.activeSentenceId),
    );
    if (ownerBlock && ownerBlock.id !== activeBlockId) {
      setActiveBlockId(ownerBlock.id);
    }
  }, [activeBlockId, blockOrder, isDialogueScene, state.activeSentenceId]);

  useEffect(() => {
    if (!isDialogueScene) return;
    if (!activeBlockId && firstBlock?.id) {
      setActiveBlockId(firstBlock.id);
    }
  }, [activeBlockId, firstBlock?.id, isDialogueScene]);

  useEffect(() => {
    setDetailVisible(interactionMode !== "training");
    setTrainingPromptSentenceId(null);
    setPracticedSentenceIds(new Set());
    setTrainingSentenceId(null);
  }, [interactionMode, lesson.id]);

  const currentSection = useMemo(() => {
    if (!state.activeSentenceId) return lesson.sections[0] ?? null;
    return (
      lesson.sections.find((section) =>
        getSectionSentences(section, lesson.sceneType ?? "monologue").some(
          (sentence) => sentence.id === state.activeSentenceId,
        ),
      ) ?? null
    );
  }, [lesson, state.activeSentenceId]);

  const relatedChunks = isMobile && !isDialogueScene
    ? (mobileActiveGroup?.relatedChunks ?? currentSentence?.chunks ?? [])
    : isDialogueScene && currentBlock
      ? Array.from(new Set(currentBlock.sentences.flatMap((sentence) => sentence.chunks)))
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

  const playbackState = useTtsPlaybackState();
  const isSceneLooping =
    playbackState.kind === "scene" &&
    playbackState.sceneSlug === lesson.slug &&
    Boolean(playbackState.isLooping);
  const effectiveSpeakingText = playbackState.text ?? null;
  const effectiveLoadingText = playbackState.status === "loading" ? playbackState.text ?? null : null;
  const isSentencePlaying = useCallback(
    (sentenceId: string, mode?: "normal" | "slow") => {
      if (playbackState.kind !== "sentence") return false;
      if (playbackState.sentenceId !== sentenceId) return false;
      if (!mode) return true;
      return (playbackState.mode ?? "normal") === mode;
    },
    [playbackState.kind, playbackState.mode, playbackState.sentenceId],
  );
  const isSentenceLoading = useCallback(
    (sentenceId: string, mode?: "normal" | "slow") => {
      if (playbackState.kind !== "sentence") return false;
      if (playbackState.status !== "loading") return false;
      if (playbackState.sentenceId !== sentenceId) return false;
      if (!mode) return true;
      return (playbackState.mode ?? "normal") === mode;
    },
    [playbackState.kind, playbackState.mode, playbackState.sentenceId, playbackState.status],
  );
  const isChunkLoading = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return false;
      return playbackState.kind === "chunk" && playbackState.status === "loading" && effectiveLoadingText === clean;
    },
    [effectiveLoadingText, playbackState.kind, playbackState.status],
  );
  const loadingChunkKey =
    playbackState.kind === "chunk" && playbackState.status === "loading" && effectiveLoadingText
      ? effectiveLoadingText
      : null;
  const isSceneLoopLoading =
    playbackState.kind === "scene" &&
    playbackState.sceneSlug === lesson.slug &&
    playbackState.status === "loading" &&
    Boolean(playbackState.isLooping);
  const stopAudio = useCallback(() => {
    stopTtsPlayback();
    setTtsLooping(false);
  }, []);

  const playBlockTts = useCallback(
    async (block: LessonBlock) => {
      const blockReadText =
        block.tts?.trim() ||
        block.sentences
          .map((sentence) => sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text)
          .filter(Boolean)
          .join(" ");
      if (!blockReadText) return;

      const blockPlaybackId = `block-${block.id}`;
      if (
        playbackState.kind === "sentence" &&
        playbackState.sentenceId === blockPlaybackId &&
        (playbackState.mode ?? "normal") === "normal"
      ) {
        stopAudio();
        return;
      }

      sentenceLoopRef.current = null;
      stopTtsPlayback();
      setTtsLooping(false);
      try {
        await playSentenceAudio({
          sceneSlug: lesson.slug,
          sentenceId: blockPlaybackId,
          text: blockReadText,
          mode: "normal",
          speaker: block.speaker,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "发音失败，请稍后重试");
      }
    },
    [lesson.slug, playbackState.kind, playbackState.mode, playbackState.sentenceId, stopAudio],
  );

  useEffect(
    () => () => {
      stopAudio();
    },
    [stopAudio],
  );

  useEffect(() => {
    const anchorSentence =
      (state.activeSentenceId
        ? sentenceOrder.find((item) => item.id === state.activeSentenceId)
        : null) ?? firstSentence;
    if (!anchorSentence) return;

    const anchorIndex = sentenceOrder.findIndex((item) => item.id === anchorSentence.id);
    const candidateSentences = [
      anchorSentence,
      anchorIndex >= 0 ? sentenceOrder[anchorIndex + 1] ?? null : null,
    ].filter((item): item is LessonSentence => Boolean(item));

    const timer = window.setTimeout(() => {
      scheduleLessonAudioWarmup(
        {
          ...lesson,
          sections: [
            {
              id: "warmup-section",
              title: "warmup",
              summary: "",
              blocks: [
                {
                  id: "warmup-block",
                  speaker: anchorSentence.speaker,
                  sentences: candidateSentences,
                },
              ],
            },
          ],
        },
        {
          sentenceLimit: candidateSentences.length,
          chunkLimit: 2,
          key: `lesson-reader:${lesson.id}:${anchorSentence.id}`,
        },
      );
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [firstSentence, lesson.slug, sentenceOrder, state.activeSentenceId]);

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
    (
      sentenceId: string,
      chunkText: string,
      options?: { openSheet?: boolean; source?: "direct" | "related" },
    ) => {
      const sentence = findSentenceById(sentenceId);
      if (!sentence) return;
      const ownerBlock = blockOrder.find((block) =>
        block.sentences.some((item) => item.id === sentenceId),
      );

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
      if (process.env.NODE_ENV !== "test") {
        const encounterKey = `${lesson.slug}:${sentence.id}:${realChunk.trim().toLowerCase()}`;
        if (!trackedEncounterKeysRef.current.has(encounterKey)) {
          trackedEncounterKeysRef.current.add(encounterKey);
          void trackChunksFromApi({
            sceneSlug: lesson.slug,
            sentenceIndex: sentenceIndexMap.get(sentence.id),
            sentenceText: sentence.text,
            chunks: [realChunk],
            interactionType: "encounter",
          }).catch(() => {
            trackedEncounterKeysRef.current.delete(encounterKey);
          });
        }
      }
      onChunkEncounter?.({
        lesson,
        sentence,
        chunkText: realChunk,
        blockId: ownerBlock?.id,
        source: options?.source ?? "direct",
      });
      if (ownerBlock) {
        setActiveBlockId(ownerBlock.id);
      }
      if (isTrainingMode) {
        setDetailVisible(true);
      }
      if (isMobile && options?.openSheet !== false) setSheetOpen(true);
      window.setTimeout(() => {
        suppressSelectionClearRef.current = false;
      }, 80);
    },
    [
      blockOrder,
      dispatchAction,
      findSentenceById,
      isMobile,
      isTrainingMode,
      lesson,
      lesson.slug,
      onChunkEncounter,
      sentenceIndexMap,
      setSheetOpen,
    ],
  );

  const handleSentenceTap = useCallback(
    (sentenceId: string, blockId?: string) => {
      dispatchAction({
        type: "SENTENCE_CONTEXT_SET",
        payload: { sentenceId },
      });
      dispatchAction({ type: "SELECTION_CLEARED" });
      if (blockId) {
        setActiveBlockId(blockId);
      }
      if (isTrainingMode) {
        setTrainingSentenceId(sentenceId);
        setDetailVisible(false);
        setTrainingPromptSentenceId(null);
        return;
      }
      if (isMobile) setSheetOpen(true);
    },
    [dispatchAction, isMobile, isTrainingMode, setSheetOpen],
  );

  const toggleDialogueBlockTranslation = useCallback((blockId: string) => {
    setDialogueBlockTranslationOpenMap((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  }, []);

  const handleMobileGroupTap = useCallback(
    (group: MobileSentenceGroup) => {
      const anchorSentenceId = group.sentenceIds[0];
      dispatchAction({
        type: "SENTENCE_CONTEXT_SET",
        payload: { sentenceId: anchorSentenceId },
      });
      dispatchAction({ type: "SELECTION_CLEARED" });
      setMobileActiveGroup(group);
      if (isTrainingMode) {
        setTrainingSentenceId(anchorSentenceId);
        setDetailVisible(false);
        setTrainingPromptSentenceId(null);
        return;
      }
      setSheetOpen(true);
    },
    [dispatchAction, isTrainingMode, setSheetOpen],
  );

  const handleMobileSentenceTap = useCallback(
    (sentenceId: string, group: MobileSentenceGroup) => {
      dispatchAction({
        type: "SENTENCE_CONTEXT_SET",
        payload: { sentenceId },
      });
      dispatchAction({ type: "SELECTION_CLEARED" });
      setMobileActiveGroup(group);
      if (isTrainingMode) {
        setTrainingSentenceId(sentenceId);
        setDetailVisible(false);
        setTrainingPromptSentenceId(null);
        return;
      }
      setSheetOpen(true);
    },
    [dispatchAction, isTrainingMode, setSheetOpen],
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
      const clean = text.trim();
      if (!clean) return;
      if (effectiveSpeakingText === clean) {
        stopAudio();
        return;
      }
      const sentence = sentenceOrder.find((item) => item.text.trim() === clean);
      setTtsLooping(false);
      void (async () => {
        try {
          if (sentence) {
            await playSentenceAudio({
              sceneSlug: lesson.slug,
              sentenceId: sentence.id,
              text: getSentenceSpeakText(sentence),
              mode: "normal",
              speaker: sentence.speaker,
            });
          } else {
            await playChunkAudio({
              chunkText: clean,
              chunkKey: buildChunkAudioKey(clean),
            });
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "发音失败，请稍后重试");
        }
      })();
    },
    [effectiveSpeakingText, lesson.slug, sentenceOrder, stopAudio],
  );

  const handleLoopSentence = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      if (sentenceLoopRef.current === clean && effectiveSpeakingText === clean) {
        sentenceLoopRef.current = null;
        stopAudio();
        return;
      }

      sentenceLoopRef.current = clean;
      stopAudio();
      setTtsLooping(true);

      void (async () => {
        while (sentenceLoopRef.current === clean) {
          try {
            await playChunkAudio({
              chunkText: clean,
              chunkKey: buildChunkAudioKey(clean),
            });
          } catch (error) {
            sentenceLoopRef.current = null;
            toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
            break;
          }
          if (sentenceLoopRef.current !== clean) break;
          await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
        }
        setTtsLooping(false);
      })();
    },
    [effectiveSpeakingText, stopAudio],
  );

  const toggleSceneLoopPlayback = useCallback(() => {
    if (isSceneLooping) {
      stopAudio();
      return;
    }

    const segments = blockOrder
      .flatMap((block) =>
        block.sentences.map((sentence) => ({
          text: (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim(),
          speaker: (block.speaker ?? sentence.speaker ?? "").trim().toUpperCase() || undefined,
        })),
      )
      .filter((segment) => Boolean(segment.text));
    if (segments.length === 0) {
      toast.message("当前场景没有可播放内容。");
      return;
    }

    void (async () => {
      try {
        onSceneLoopPlayback?.({ lesson });
        await playSceneLoopAudio({
          sceneSlug: lesson.slug,
          sceneType: lesson.sceneType ?? "monologue",
          segments,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "完整场景音频暂不可用");
      }
    })();
  }, [blockOrder, isSceneLooping, lesson, lesson.sceneType, lesson.slug, onSceneLoopPlayback, stopAudio]);

  useEffect(() => {
    if (!sheetOpen) return;

    const activeSentence =
      (state.activeSentenceId
        ? sentenceOrder.find((item) => item.id === state.activeSentenceId)
        : null) ?? firstSentence;
    if (!activeSentence?.id) return;

    if (isMobile) {
      if (state.activeChunkKey) return;
      const firstChunk = activeSentence.chunks[0];
      if (firstChunk) {
        dispatchAction({
          type: "CHUNK_ACTIVATED",
          payload: { sentenceId: activeSentence.id, chunkKey: firstChunk },
        });
      }
      return;
    }

    dispatchAction({
      type: "SENTENCE_CONTEXT_SET",
      payload: { sentenceId: activeSentence.id },
    });
  }, [
    dispatchAction,
    firstSentence,
    isMobile,
    sentenceOrder,
    sheetOpen,
    state.activeChunkKey,
    state.activeSentenceId,
  ]);

  useEffect(() => {
    if (isTrainingMode) return;
    if (state.selectionState) return;
    const normalizedActiveChunk = state.activeChunkKey?.trim().toLowerCase() ?? "";
    const firstChunk = relatedChunks[0]?.trim();
    if (!firstChunk) return;

    const hasActiveChunkInCurrentContext = relatedChunks.some(
      (chunk) => chunk.trim().toLowerCase() === normalizedActiveChunk,
    );
    if (hasActiveChunkInCurrentContext) return;

    const targetSentenceId = (() => {
      if (isDialogueScene && currentBlock) {
        return (
          currentBlock.sentences.find((sentence) =>
            sentence.chunks.some((chunk) => chunk.trim().toLowerCase() === firstChunk.toLowerCase()),
          )?.id ?? currentBlock.sentences[0]?.id
        );
      }
      if (isMobile && !isDialogueScene && mobileActiveGroup) {
        return (
          mobileActiveGroup.sentenceIds.find((id) => {
            const sentence = findSentenceById(id);
            return sentence?.chunks.some((chunk) => chunk.trim().toLowerCase() === firstChunk.toLowerCase());
          }) ?? mobileActiveGroup.sentenceIds[0]
        );
      }
      return currentSentence?.id ?? null;
    })();

    if (!targetSentenceId) return;

    dispatchAction({
      type: "CHUNK_ACTIVATED",
      payload: { sentenceId: targetSentenceId, chunkKey: firstChunk },
    });
  }, [
    currentBlock,
    currentSentence?.id,
    dispatchAction,
    findSentenceById,
    isDialogueScene,
    isMobile,
    isTrainingMode,
    mobileActiveGroup,
    relatedChunks,
    state.activeChunkKey,
    state.selectionState,
  ]);

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

  const openDetailForSentence = useCallback(
    (sentenceId: string) => {
      const sentence = findSentenceById(sentenceId);
      if (!sentence) return;

      dispatchAction({
        type: "SENTENCE_CONTEXT_SET",
        payload: { sentenceId: sentence.id },
      });

      const firstChunk = sentence.chunks[0];
      if (firstChunk) {
        activateChunk(sentence.id, firstChunk, { openSheet: true });
      }

      if (isTrainingMode) {
        setDetailVisible(true);
      }
      if (isMobile) {
        setSheetOpen(true);
      }
    },
    [activateChunk, dispatchAction, findSentenceById, isMobile, isTrainingMode],
  );

  const handlePracticeSentence = useCallback(() => {
    if (!currentTrainingSentence) return;
    handlePronounce(getSentenceSpeakText(currentTrainingSentence));
    setTrainingPromptSentenceId(currentTrainingSentence.id);
  }, [currentTrainingSentence, handlePronounce]);

  const handleConfirmSentencePractice = useCallback(() => {
    if (!currentTrainingSentence) return;
    setPracticedSentenceIds((prev) => {
      const next = new Set(prev);
      next.add(currentTrainingSentence.id);
      return next;
    });
    setTrainingPromptSentenceId(null);
    onSentencePracticeComplete?.({
      lesson,
      sentence: currentTrainingSentence,
      blockId: currentTrainingSentenceOwnerBlock?.id,
    });
  }, [
    currentTrainingSentence,
    currentTrainingSentenceOwnerBlock?.id,
    lesson,
    onSentencePracticeComplete,
  ]);

  const resolveSentenceIdForChunk = useCallback(
    (chunk: string) => {
      if (isMobile && !isDialogueScene && mobileActiveGroup) {
        return (
          mobileActiveGroup.sentenceIds.find((id) => {
            const sentence = findSentenceById(id);
            return sentence?.chunks.some((item) => item.toLowerCase() === chunk.toLowerCase());
          }) ?? mobileActiveGroup.sentenceIds[0]
        );
      }
      if (currentBlock) {
        return (
          currentBlock.sentences.find((sentence) =>
            sentence.chunks.some((item) => item.toLowerCase() === chunk.toLowerCase()),
          )?.id ?? state.activeSentenceId
        );
      }
      return state.activeSentenceId;
    },
    [currentBlock, findSentenceById, isDialogueScene, isMobile, mobileActiveGroup, state.activeSentenceId],
  );

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

  const renderDialogueBlock = useCallback(
    (block: LessonBlock) => {
      const speaker = block.speaker ?? "A";
      const primarySpeaker = isPrimarySpeaker(speaker);
      const translationOpen = Boolean(dialogueBlockTranslationOpenMap[block.id]);
      const blockTranslation =
        block.translation?.trim() ||
        block.sentences
          .map((sentence) => sentence.translation?.trim())
          .filter(Boolean)
          .join(" ");
      const blockPlaybackId = `block-${block.id}`;
      const isBlockSpeaking =
        (playbackState.kind === "sentence" &&
          playbackState.sentenceId === blockPlaybackId) ||
        block.sentences.some((sentence) => isSentencePlaying(sentence.id));
      const isBlockLoading =
        playbackState.kind === "sentence" &&
        playbackState.status === "loading" &&
        playbackState.sentenceId === blockPlaybackId;
      const speakerText = speakerLabel(speaker) || "A";

      return (
        <div
          key={block.id}
          className={cn(
            "flex w-full flex-col",
            primarySpeaker ? "items-start" : "items-end",
          )}
        >
          <div
            className={cn(
              "flex max-w-[85%] flex-col gap-2",
              primarySpeaker ? "items-start" : "items-end",
            )}
          >
            <article
              className={cn(
                "w-full px-[18px] py-[14px] text-[16px] leading-[1.4] shadow-[0_4px_15px_rgba(0,0,0,0.03)]",
                primarySpeaker
                  ? "rounded-[18px_18px_18px_4px] bg-white text-[#333]"
                  : "rounded-[18px_18px_4px_18px] bg-[#b5d1ff] text-[#1a2a40]",
              )}
            >
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 font-semibold">{speakerText}:</span>
                <div className="min-w-0 flex-1 space-y-2">
                  {block.sentences.map((sentence) => {
                    return (
                      <div key={sentence.id} className="space-y-1">
                        <p
                          data-sentence-id={sentence.id}
                          data-sentence-text={sentence.text}
                          data-sentence-translation={sentence.translation}
                          className={cn(
                            "cursor-pointer text-[16px] leading-[1.4]",
                            isSentencePlaying(sentence.id) && "opacity-80",
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSentenceTap(sentence.id, block.id);
                          }}
                        >
                          {sentence.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>

            <div className="flex items-center gap-3 px-[5px]">
              <button
                type="button"
                aria-label="翻译"
                className={cn(dialogueTextButtonClassName, translationOpen && "text-[#4a90e2]")}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleDialogueBlockTranslation(block.id);
                }}
              >
                <Languages className="size-3.5" />
                {translationOpen ? "收起" : "翻译"}
              </button>
              <TtsActionButton
                active={isBlockSpeaking}
                loading={isBlockLoading}
                label="朗读"
                activeLabel="停止"
                loadingLabel="加载中..."
                ariaLabel="朗读"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-auto px-0 text-[12px] leading-none text-[#8e9aaf] hover:text-[#2c3e50]",
                  isBlockSpeaking && "text-[#4a90e2] hover:text-[#4a90e2]",
                )}
                iconClassName="size-3.5"
                onClick={(event) => {
                  event.stopPropagation();
                  void playBlockTts(block);
                }}
              />
            </div>

            {translationOpen ? (
              <p className="px-[5px] text-[14px] leading-6 text-[#8e9aaf]">
                {blockTranslation || "该段翻译暂未提供。"}
              </p>
            ) : null}
          </div>
        </div>
      );
    },
    [
      handleSentenceTap,
      playBlockTts,
      isSentencePlaying,
      playbackState.kind,
      playbackState.status,
      playbackState.sentenceId,
      toggleDialogueBlockTranslation,
      dialogueBlockTranslationOpenMap,
    ],
  );

  const showDesktopDetailPanel = !isMobile && (!isTrainingMode || detailVisible);

  return (
    <div
      className={cn(
        "relative grid gap-6 lg:gap-8",
        showDesktopDetailPanel ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "lg:grid-cols-[minmax(0,1fr)]",
      )}
    >
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
        loadingPronounce={Boolean(
          state.selectionState?.text &&
            ((playbackState.kind === "sentence" &&
              playbackState.status === "loading" &&
              effectiveLoadingText === state.selectionState.text) ||
              isChunkLoading(state.selectionState.text)),
        )}
      />

      <div
        ref={readerRef}
        className={cn("space-y-5", isMobile && "space-y-1.5")}
      >
        {minimalHeader ? (
          <div className={cn("space-y-2 py-1.5", isMobile ? "px-1" : "px-1.5")}>
            {topRightTool ? (
              <div className="flex items-center justify-end gap-2">{topRightTool}</div>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              {headerTools}
              {!isTrainingMode ? (
                <LoopActionButton
                  active={isSceneLooping}
                  loading={isSceneLoopLoading}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    appleButtonLgClassName,
                    "whitespace-nowrap text-foreground/85",
                    isMobile && "px-2 py-1 text-[15px]",
                  )}
                  iconClassName={cn("size-4", isMobile && "size-3.5")}
                  onClick={toggleSceneLoopPlayback}
                />
              ) : null}
            </div>
          </div>
        ) : isDialogueScene && isTrainingMode ? null : isDialogueScene ? (
          <div className={cn("py-1.5", isMobile ? "px-1" : "px-1.5")}>
            <div className="flex items-center justify-end gap-2">
              {headerTools}
              {!isTrainingMode ? (
                <LoopActionButton
                  active={isSceneLooping}
                  loading={isSceneLoopLoading}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    appleButtonLgClassName,
                    "whitespace-nowrap text-foreground/85",
                    isMobile && "px-2 py-1 text-[15px]",
                  )}
                  iconClassName={cn("size-4", isMobile && "size-3.5")}
                  onClick={toggleSceneLoopPlayback}
                />
              ) : null}
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
                    <LoopActionButton
                      active={isSceneLooping}
                      loading={isSceneLoopLoading}
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-1.5 text-[10px] ${APPLE_META_TEXT}`}
                      iconClassName="size-3"
                      onClick={toggleSceneLoopPlayback}
                    />
                  </div>
                  <p className={`text-[10px] leading-4 whitespace-nowrap ${APPLE_META_TEXT}`}>
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
                <p className={`max-w-2xl ${APPLE_META_TEXT} sm:text-base`}>
                  {lesson.subtitle}
                </p>
              )}
              {!isMobile ? (
                <LessonProgress value={lesson.completionRate} />
              ) : null}
              {!isMobile ? (
                <>
                  <p className={APPLE_META_TEXT}>{sceneMetaLabel}</p>
                  <div className="flex flex-wrap gap-2">
                    <LoopActionButton
                      active={isSceneLooping}
                      loading={isSceneLoopLoading}
                      variant="outline"
                      className="cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-accent"
                      onClick={toggleSceneLoopPlayback}
                    />
                    <TtsActionButton
                      loading={
                        currentSentence
                          ? isSentenceLoading(currentSentence.id, "normal")
                          : false
                      }
                      variant="outline"
                      className="cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-accent"
                      onClick={() =>
                        handlePronounce(currentSentence?.text ?? lesson.title)
                      }
                    />
                    {headerTools}
                  </div>
                  <p className={`text-xs ${APPLE_META_TEXT}`}>
                    {appCopy.lesson.prompt}
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {isDialogueScene ? (
          <div
            className={cn(
              isTrainingMode
                ? "min-h-[calc(100vh-180px)] bg-[#f4f7f9] pb-28 pt-3"
                : "space-y-[30px]",
              isMobile && !isTrainingMode && "space-y-1.5",
            )}
          >
            {isTrainingMode ? (
              <div className="px-5 pb-5">
                <div className="relative flex min-h-10 items-start justify-center">
                  {onBackToList ? (
                    <button
                      type="button"
                      aria-label="返回场景列表"
                      className="absolute left-0 top-0 inline-flex size-10 items-start justify-start pt-0.5 text-[#2c3e50] transition"
                      onClick={onBackToList}
                    >
                      <ArrowLeft className="size-5" />
                    </button>
                  ) : null}
                  <div className="px-12 pt-0.5 text-center">
                    <h1 className="text-[18px] font-semibold text-[#333]">{resolvedHeaderTitle}</h1>
                  </div>
                  {topRightTool ? (
                    <div className="absolute right-0 top-0 flex items-center gap-2">{topRightTool}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div
              className={cn(
                "space-y-[30px]",
                isTrainingMode && "px-5",
                isMobile && !isTrainingMode && "space-y-1.5",
              )}
            >
              {blockOrder.map((block) => renderDialogueBlock(block))}
            </div>
          </div>
        ) : isMobile ? (
          <div className="overflow-hidden bg-transparent">
            {lesson.sections.map((section) => {
              const active = currentSection?.id === section.id;
              const groupedSentences = groupSentencesForMobile(
                getSectionSentences(section, lesson.sceneType ?? "monologue"),
              );

              return (
                <div key={section.id} className="space-y-1.5">
                  {groupedSentences.map((group, groupIndex) => {
                    const groupKey = `${section.id}-group-${groupIndex}`;
                    const groupText = group.map((sentence) => sentence.text).join(" ");
                    const groupTranslation = group.map((sentence) => sentence.translation).join(" ");
                    const groupPlaying = effectiveSpeakingText === groupText;
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
                          "rounded-[var(--app-radius-panel)] px-2 py-1 transition-colors duration-150",
                          groupSelected
                            ? "bg-accent/12"
                            : active
                              ? "bg-[var(--app-surface-subtle)]"
                              : "hover:bg-[var(--app-surface-hover)]",
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
                                    : `${APPLE_META_TEXT} hover:text-foreground`,
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
                              <TtsActionButton
                                active={groupPlaying}
                                loading={isChunkLoading(groupText)}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-auto px-0 text-[11px] leading-none",
                                  groupSelected
                                    ? "text-primary/80 hover:text-primary/95"
                                    : `${APPLE_META_TEXT} hover:text-foreground`,
                                )}
                                iconClassName="size-3"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleLoopSentence(groupText);
                                }}
                              />
                            </div>

                            <div
                              className={cn(
                                "grid overflow-hidden transition-all duration-200",
                                translationOpen ? "mb-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                              )}
                            >
                              <p className={`min-h-0 rounded-[var(--app-radius-panel)] px-2.5 py-1.5 text-[13px] leading-6 ${APPLE_META_TEXT} ${APPLE_PANEL}`}>
                                {groupTranslation}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {group.map((sentence) => {
                              const sentenceSelected = sentence.id === state.activeSentenceId;
                              return (
                                <div
                                  key={sentence.id}
                                  ref={(node) => {
                                    sentenceNodeMapRef.current[sentence.id] = node;
                                  }}
                                  className="transition-colors"
                                >
                                  <p
                                    data-sentence-id={sentence.id}
                                    data-sentence-text={sentence.text}
                                    data-sentence-translation={sentence.translation}
                                    className={cn(
                                      "cursor-pointer text-[16px] leading-[1.72] font-normal tracking-[0.01em] text-foreground/95",
                                      sentenceSelected && "text-primary",
                                    )}
                                    onClick={() => handleMobileSentenceTap(sentence.id, groupContext)}
                                  >
                                    {sentence.text}
                                  </p>
                                </div>
                              );
                            })}
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
                <p className={APPLE_META_TEXT}>{section.summary}</p>
              </div>
              <div className="space-y-3">
                {getSectionBlocks(section, lesson.sceneType ?? "monologue").map((block) => (
                  <div key={block.id} className="space-y-2">
                    <article className={cn("rounded-[var(--app-radius-card)] px-3 py-2.5 transition-colors hover:bg-[var(--app-surface-hover)]", LESSON_DIALOGUE_A_BG_CLASS)}>
                      <div className="space-y-2">
                        {block.sentences.map((sentence) => (
                          <p
                            key={sentence.id}
                            data-sentence-id={sentence.id}
                            data-sentence-text={sentence.text}
                            data-sentence-translation={sentence.translation}
                            className="cursor-pointer text-[1.03rem] leading-relaxed text-foreground/95"
                            onClick={() => handleSentenceTap(sentence.id)}
                          >
                            {sentence.text}
                          </p>
                        ))}
                      </div>

                      <div className={`mt-1 flex items-center gap-2 text-[11px] ${APPLE_META_TEXT}`}>
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
                          onClick={() => toggleDialogueBlockTranslation(block.id)}
                        >
                          <Languages className="size-3.5" />
                          翻译
                        </button>
                        <span className="opacity-40">·</span>
                        <TtsActionButton
                          loading={isChunkLoading(
                            block.tts?.trim() ||
                              block.sentences
                                .map((sentence) => sentence.tts?.trim() || sentence.audioText || sentence.text)
                                .filter(Boolean)
                                .join(" "),
                          )}
                          variant="ghost"
                          size="sm"
                          className="h-auto px-0 text-inherit hover:text-foreground"
                          onClick={() => handlePronounce(
                            block.tts?.trim() ||
                              block.sentences
                                .map((sentence) => sentence.tts?.trim() || sentence.audioText || sentence.text)
                                .filter(Boolean)
                                .join(" "),
                          )}
                        />
                      </div>

                      {dialogueBlockTranslationOpenMap[block.id] ? (
                        <p className={`mt-2 leading-6 ${APPLE_META_TEXT}`}>
                          {block.translation?.trim() ||
                            block.sentences
                              .map((sentence) => sentence.translation?.trim())
                              .filter(Boolean)
                              .join(" ") ||
                            "该段翻译暂未提供。"}
                        </p>
                      ) : null}
                    </article>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {isTrainingMode && activeTrainingSentence ? (
        <div className="sticky bottom-0 z-20 lg:col-span-1">
          <div
            className="rounded-t-[30px] bg-white px-[25px] pb-5 pt-5 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]"
            data-current-training-sentence={activeTrainingSentence.text}
          >
            <span className="sr-only">当前训练句</span>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                aria-label={isSceneLooping ? "停止循环播放" : "循环播放场景"}
                className={cn(
                  dialogueFooterButtonClassName,
                  "shrink-0 text-[20px]",
                  isSceneLooping && "text-[#4a90e2]",
                )}
                onClick={toggleSceneLoopPlayback}
              >
                ↺
              </button>
              <button
                type="button"
                aria-label={isSentencePlaying(activeTrainingSentence.id, "normal") ? "暂停朗读" : "朗读当前句子"}
                className={cn(
                  "inline-flex size-[55px] shrink-0 items-center justify-center rounded-full border-none bg-[#edf2f7] text-[#2d3436] shadow-[0_4px_10px_rgba(0,0,0,0.05)]",
                  isSentencePlaying(activeTrainingSentence.id, "normal") && "bg-[#dfe9f3]",
                )}
                onClick={() => handlePronounce(getSentenceSpeakText(activeTrainingSentence))}
              >
                {isSentenceLoading(activeTrainingSentence.id, "normal") ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isSentencePlaying(activeTrainingSentence.id, "normal") ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="ml-1 size-5 fill-current" />
                )}
              </button>
              <button
                type="button"
                aria-label="看解释"
                className={cn(dialogueFooterButtonClassName, "gap-2")}
                onClick={() => openDetailForSentence(activeTrainingSentence.id)}
              >
                <Info className="size-4" />
                看解释
              </button>
              <button
                type="button"
                aria-label={
                  trainingPromptSentenceId === activeTrainingSentence.id
                    ? "我练过了"
                    : practicedSentenceIds.has(activeTrainingSentence.id)
                      ? "再练一次"
                      : "练这句"
                }
                className={cn(dialogueFooterButtonClassName, "gap-2")}
                onClick={
                  trainingPromptSentenceId === activeTrainingSentence.id
                    ? handleConfirmSentencePractice
                    : handlePracticeSentence
                }
              >
                <Volume2 className="size-4" />
                {trainingPromptSentenceId === activeTrainingSentence.id
                  ? "我练过了"
                  : practicedSentenceIds.has(activeTrainingSentence.id)
                    ? "再练一次"
                    : "练这句"}
              </button>
            </div>
            <div className="pt-3 text-[13px] leading-6 text-[#8e9aaf]">
              {trainingPromptSentenceId === activeTrainingSentence.id ? (
                <p>先跟读或复述一遍，再点“我练过了”。</p>
              ) : practicedSentenceIds.has(activeTrainingSentence.id) ? (
                <>
                  <p>这句已经练过了</p>
                  <p>如果想再巩固一次，可以直接再练一遍。</p>
                </>
              ) : (
                <p>先听一句，再自己跟读或复述一遍。</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showDesktopDetailPanel ? (
        <div
          className={cn(
            "transition-all duration-200",
            currentSentence || chunkDetail
              ? "opacity-100 translate-x-0"
              : "opacity-95 translate-x-0.5",
          )}
        >
          <SelectionDetailPanel
            currentBlock={isDialogueScene ? currentBlock : null}
            currentSentence={mobileDisplaySentence}
            chunkDetail={chunkDetail}
            relatedChunks={relatedChunks}
            showSpeaker={isDialogueScene}
            sentenceSectionLabel={sentenceSectionLabel}
            loading={false}
            speakingText={effectiveSpeakingText}
            loadingText={effectiveLoadingText}
            onSave={handleSave}
            onReview={handleAddReview}
            saved={chunkSaved}
            onPronounce={handlePronounce}
            onPronounceBlock={() => {
              if (currentBlock) {
                void playBlockTts(currentBlock);
                return;
              }
              if (mobileDisplaySentence) {
                handlePronounce(
                  mobileDisplaySentence.tts?.trim() ||
                    mobileDisplaySentence.audioText?.trim() ||
                    mobileDisplaySentence.text,
                );
              }
            }}
            onSelectRelated={(chunk) => {
              const targetSentenceId = resolveSentenceIdForChunk(chunk);
              if (!targetSentenceId) return;
            activateChunk(targetSentenceId, chunk, { source: "related" });
            }}
            hoveredChunkKey={state.hoveredChunkKey}
            onHoverChunk={(chunkKey) =>
              dispatchAction({ type: "CHUNK_HOVERED", payload: { chunkKey } })
            }
            playingChunkKey={playbackState.kind === "chunk" ? (playbackState.text ?? null) : null}
            loadingChunkKey={loadingChunkKey}
          />
        </div>
      ) : null}

      <SelectionDetailSheet
        currentBlock={isDialogueScene ? currentBlock : null}
        currentSentence={mobileDisplaySentence}
        chunkDetail={chunkDetail}
        relatedChunks={relatedChunks}
        open={sheetOpen}
        showSpeaker={isDialogueScene}
        sentenceSectionLabel={sentenceSectionLabel}
        loading={false}
        speakingText={effectiveSpeakingText}
        loadingText={effectiveLoadingText}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open && isTrainingMode) {
            setDetailVisible(false);
          }
        }}
        onSave={handleSave}
        onReview={handleAddReview}
        saved={chunkSaved}
        onPronounce={handlePronounce}
        onPronounceBlock={() => {
          if (currentBlock) {
            void playBlockTts(currentBlock);
            return;
          }
          if (mobileDisplaySentence) {
            handlePronounce(
              mobileDisplaySentence.tts?.trim() ||
                mobileDisplaySentence.audioText?.trim() ||
                mobileDisplaySentence.text,
            );
          }
        }}
        onSelectRelated={(chunk) => {
          const targetSentenceId = resolveSentenceIdForChunk(chunk);
          if (!targetSentenceId) return;
          activateChunk(targetSentenceId, chunk, { source: "related" });
        }}
        hoveredChunkKey={state.hoveredChunkKey}
        onHoverChunk={(chunkKey) =>
          dispatchAction({ type: "CHUNK_HOVERED", payload: { chunkKey } })
        }
        playingChunkKey={playbackState.kind === "chunk" ? (playbackState.text ?? null) : null}
        loadingChunkKey={loadingChunkKey}
      />
    </div>
  );
}



