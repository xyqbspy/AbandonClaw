"use client";

import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { findMatchingChunkInSentence, getSentenceById } from "@/lib/data/mock-lessons";
import { Lesson, LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { trackChunksFromApi } from "@/lib/utils/chunks-api";
import {
  InteractionAction,
  MobileSentenceGroup,
  SelectionState,
} from "./lesson-reader-logic";

const TOOLBAR_WIDTH = 256;

type InteractionState = {
  activeSentenceId: string | null;
  activeChunkKey: string | null;
  hoveredChunkKey: string | null;
  selectionState: SelectionState | null;
};

type UseLessonReaderControllerProps = {
  lesson: Lesson;
  blockOrder: LessonBlock[];
  sentenceOrder: LessonSentence[];
  firstSentence: LessonSentence | null;
  currentSentence: LessonSentence | null;
  currentBlock: LessonBlock | null;
  chunkDetail: SelectionChunkLayer | null;
  isMobile: boolean;
  isDialogueScene: boolean;
  isTrainingMode: boolean;
  sheetOpen: boolean;
  state: InteractionState;
  readerRef: RefObject<HTMLDivElement | null>;
  toolbarRef: RefObject<HTMLDivElement | null>;
  sentenceIndexMap: Map<string, number>;
  dispatchAction: (action: InteractionAction) => void;
  onChunkEncounter?: (payload: {
    lesson: Lesson;
    sentence: LessonSentence;
    chunkText: string;
    blockId?: string;
    source?: "direct" | "related";
  }) => void;
  onSavePhrase?: (payload: {
    text: string;
    translation?: string;
    usageNote?: string;
    sourceSceneSlug?: string;
    sourceType?: "scene" | "manual";
    sourceSentenceIndex?: number;
    sourceSentenceText?: string;
    sourceChunkText?: string;
  }) => Promise<{ created?: boolean } | void> | { created?: boolean } | void;
  onReviewPhrase?: (payload: {
    text: string;
    translation?: string;
    usageNote?: string;
    sourceSceneSlug?: string;
    sourceType?: "scene" | "manual";
    sourceSentenceIndex?: number;
    sourceSentenceText?: string;
    sourceChunkText?: string;
  }) => Promise<{ created?: boolean } | void> | { created?: boolean } | void;
  setSheetOpen: (open: boolean) => void;
  setDetailVisible: (open: boolean) => void;
  setTrainingSentenceId: (sentenceId: string | null) => void;
  setActiveBlockId: (blockId: string | null) => void;
  setLocalSavedPhraseTexts: Dispatch<SetStateAction<Set<string>>>;
};

export function useLessonReaderController({
  lesson,
  blockOrder,
  sentenceOrder,
  firstSentence,
  currentSentence,
  currentBlock,
  chunkDetail,
  isMobile,
  isDialogueScene,
  isTrainingMode,
  sheetOpen,
  state,
  readerRef,
  toolbarRef,
  sentenceIndexMap,
  dispatchAction,
  onChunkEncounter,
  onSavePhrase,
  onReviewPhrase,
  setSheetOpen,
  setDetailVisible,
  setTrainingSentenceId,
  setActiveBlockId,
  setLocalSavedPhraseTexts,
}: UseLessonReaderControllerProps) {
  const [mobileActiveGroup, setMobileActiveGroup] = useState<MobileSentenceGroup | null>(null);
  const suppressSelectionClearRef = useRef(false);
  const trackedEncounterKeysRef = useRef<Set<string>>(new Set());
  const relatedChunks = useMemo(
    () =>
      isMobile && !isDialogueScene
        ? (mobileActiveGroup?.relatedChunks ?? currentSentence?.chunks ?? [])
        : isDialogueScene && currentBlock
          ? Array.from(new Set(currentBlock.sentences.flatMap((sentence) => sentence.chunks)))
          : (currentSentence?.chunks ?? []),
    [currentBlock, currentSentence?.chunks, isDialogueScene, isMobile, mobileActiveGroup],
  );

  const findSentenceById = useCallback(
    (sentenceId: string) => getSentenceById(lesson, sentenceId),
    [lesson],
  );

  const buildPhrasePayload = useCallback(() => {
    if (!chunkDetail?.text) return null;
    const sentenceIndex = currentSentence
      ? sentenceOrder.findIndex((item) => item.id === currentSentence.id)
      : -1;
    return {
      text: chunkDetail.text,
      translation: chunkDetail.translation,
      usageNote: chunkDetail.usageNote,
      sourceSceneSlug: lesson.slug,
      sourceType: "scene" as const,
      sourceSentenceIndex: sentenceIndex >= 0 ? sentenceIndex : undefined,
      sourceSentenceText: currentSentence?.text,
      sourceChunkText: chunkDetail.text,
    };
  }, [chunkDetail, currentSentence, lesson.slug, sentenceOrder]);

  const locateSourceSentenceFromRange = useCallback(
    (range: Range) => {
      const getSentenceIdFromNode = (node: Node | null) => {
        const element = node instanceof Element ? node : node?.parentElement;
        return (
          (element?.closest("[data-sentence-id]") as HTMLElement | null)?.dataset.sentenceId ?? ""
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

  const extractSelectionInReader = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const text = selection.toString().trim();
    if (!text) return null;

    const range = selection.getRangeAt(0);
    const rootNode = range.commonAncestorContainer;
    const element =
      rootNode.nodeType === Node.TEXT_NODE ? rootNode.parentElement : (rootNode as Element);
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
  }, [locateSourceSentenceFromRange, readerRef]);

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
      onChunkEncounter,
      sentenceIndexMap,
      setActiveBlockId,
      setDetailVisible,
      setSheetOpen,
    ],
  );

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
    [activateChunk, dispatchAction, findSentenceById, isMobile, isTrainingMode, setDetailVisible, setSheetOpen],
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
        openDetailForSentence(sentenceId);
        return;
      }
      if (isMobile) setSheetOpen(true);
    },
    [dispatchAction, isMobile, isTrainingMode, openDetailForSentence, setActiveBlockId, setSheetOpen, setTrainingSentenceId],
  );

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
        openDetailForSentence(anchorSentenceId);
        return;
      }
      setSheetOpen(true);
    },
    [dispatchAction, isTrainingMode, openDetailForSentence, setSheetOpen, setTrainingSentenceId],
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
        openDetailForSentence(sentenceId);
        return;
      }
      setSheetOpen(true);
    },
    [dispatchAction, isTrainingMode, openDetailForSentence, setSheetOpen, setTrainingSentenceId],
  );

  useEffect(() => {
    if (!sheetOpen) return;

    const activeSentence =
      (state.activeSentenceId ? sentenceOrder.find((item) => item.id === state.activeSentenceId) : null) ??
      firstSentence;
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
    mobileActiveGroup,
    relatedChunks,
    state.activeChunkKey,
    state.selectionState,
  ]);

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
  }, [dispatchAction, extractSelectionInReader, isMobile, readerRef, toolbarRef]);

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
  }, [buildPhrasePayload, onSavePhrase, setLocalSavedPhraseTexts]);

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
  }, [buildPhrasePayload, onReviewPhrase, onSavePhrase, setLocalSavedPhraseTexts]);

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

  return {
    mobileActiveGroup,
    setMobileActiveGroup,
    handleSentenceTap,
    handleMobileGroupTap,
    handleMobileSentenceTap,
    activateChunk,
    handleSave,
    handleAddReview,
    resolveSentenceIdForChunk,
    openDetailForSentence,
  };
}
