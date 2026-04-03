"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { appCopy } from "@/lib/constants/copy";
import { LoopActionButton } from "@/components/audio/loop-action-button";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { useLessonReaderPlayback } from "@/features/lesson/audio/use-lesson-reader-playback";
import {
  getChunkLayerFromLesson,
  getFirstSentence,
  getSentenceById,
} from "@/lib/data/mock-lessons";
import { useMobile } from "@/hooks/use-mobile";
import { Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LessonProgress } from "@/features/lesson/components/lesson-progress";
import { SelectionDetailPanel } from "@/features/lesson/components/selection-detail-panel";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SelectionToolbar } from "@/features/lesson/components/selection-toolbar";
import { normalizePhraseText } from "@/lib/shared/phrases";
import {
  getLessonBlocks,
  getLessonSentences,
  getSectionBlocks,
  getSectionSentences,
} from "@/lib/shared/lesson-content";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_LG,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_SURFACE,
} from "@/lib/ui/apple-style";
import {
  LESSON_DIALOGUE_A_BG_CLASS,
} from "@/features/lesson/styles/dialogue-theme";
import {
  interactionReducer,
} from "./lesson-reader-logic";
import { useLessonReaderController } from "./use-lesson-reader-controller";
import { LessonReaderDialogueContent } from "./lesson-reader-dialogue-content";
import { LessonReaderMobileSections } from "./lesson-reader-mobile-sections";

const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;
const hasSpeakerTag = (speaker?: string) => /^[A-Z]$/.test((speaker ?? "").trim().toUpperCase());

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
  const sentenceNodeMapRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [localSavedPhraseTexts, setLocalSavedPhraseTexts] = useState<Set<string>>(new Set());
  const [detailVisible, setDetailVisible] = useState(interactionMode !== "training");
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
  const dispatchAction = dispatch;
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
  const currentTrainingSentence = useMemo(
    () =>
      trainingSentenceId
        ? (getSentenceById(lesson, trainingSentenceId) ?? null)
        : null,
    [lesson, trainingSentenceId],
  );
  const activeTrainingSentence = currentTrainingSentence ?? currentSentence ?? firstSentence;

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

  const relatedChunks = useMemo(
    () =>
      isMobile && !isDialogueScene
        ? (currentSentence?.chunks ?? [])
        : isDialogueScene && currentBlock
          ? Array.from(new Set(currentBlock.sentences.flatMap((sentence) => sentence.chunks)))
          : (currentSentence?.chunks ?? []),
    [currentBlock, currentSentence?.chunks, isDialogueScene, isMobile],
  );

  const chunkDetail = useMemo<SelectionChunkLayer | null>(() => {
    if (!currentSentence || !state.activeChunkKey) return null;
    return getChunkLayerFromLesson(lesson, currentSentence, state.activeChunkKey);
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

  const {
    playbackState,
    loadingChunkKey,
    speakingText: effectiveSpeakingText,
    loadingText: effectiveLoadingText,
    isSceneLooping,
    isSceneLoopLoading,
    isSentencePlaying,
    isSentenceLoading,
    isChunkLoading,
    playBlockTts,
    handlePronounce,
    handleLoopSentence,
    toggleSceneLoopPlayback,
  } = useLessonReaderPlayback({
    lesson,
    blockOrder,
    sentenceOrder,
    firstSentence,
    activeSentenceId: state.activeSentenceId,
    onSceneLoopPlayback,
  });
  const {
    mobileActiveGroup,
    handleSentenceTap,
    handleMobileGroupTap,
    handleMobileSentenceTap,
    activateChunk,
    handleSave,
    handleAddReview,
    resolveSentenceIdForChunk,
  } = useLessonReaderController({
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
  });
  const effectiveRelatedChunks = isMobile && !isDialogueScene
    ? (mobileActiveGroup?.relatedChunks ?? currentSentence?.chunks ?? [])
    : relatedChunks;
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
        className={cn(
          "space-y-[var(--mobile-space-2xl)] overflow-x-hidden",
          isMobile && "space-y-[var(--mobile-space-sm)]",
        )}
      >
        {minimalHeader ? (
          <div
            className={cn(
              "space-y-[var(--mobile-space-sm)] py-[var(--mobile-space-sm)]",
              isMobile ? "px-[var(--mobile-space-xs)]" : "px-1.5",
            )}
          >
            {topRightTool ? (
              <div className="flex items-center justify-end gap-[var(--mobile-space-sm)]">{topRightTool}</div>
            ) : null}
            <div className="flex items-center justify-end gap-[var(--mobile-space-sm)]">
              {headerTools}
              {!isTrainingMode ? (
                <LoopActionButton
                  active={isSceneLooping}
                  loading={isSceneLoopLoading}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-[var(--mobile-control-height)] border-transparent bg-transparent px-0 whitespace-nowrap text-foreground/85 hover:bg-transparent hover:text-foreground",
                    isMobile &&
                      "size-[var(--mobile-icon-button)] text-[length:var(--mobile-font-body)]",
                  )}
                  iconClassName={cn("size-4", isMobile && "size-3.5")}
                  onClick={toggleSceneLoopPlayback}
                />
              ) : null}
            </div>
          </div>
        ) : isDialogueScene && isTrainingMode ? null : isDialogueScene ? (
          <div className={cn("py-[var(--mobile-space-sm)]", isMobile ? "px-[var(--mobile-space-xs)]" : "px-1.5")}>
            <div className="flex items-center justify-end gap-[var(--mobile-space-sm)]">
              {headerTools}
              {!isTrainingMode ? (
                <LoopActionButton
                  active={isSceneLooping}
                  loading={isSceneLoopLoading}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-[var(--mobile-control-height)] border-transparent bg-transparent px-0 whitespace-nowrap text-foreground/85 hover:bg-transparent hover:text-foreground",
                    isMobile &&
                      "size-[var(--mobile-icon-button)] text-[length:var(--mobile-font-body)]",
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
                isMobile &&
                  "space-y-[var(--mobile-space-sm)] p-[var(--mobile-space-lg)]",
              )}
            >
              {isMobile ? (
                <>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[var(--mobile-space-sm)]">
                    <h1 className="line-clamp-2 text-[length:var(--mobile-font-title)] font-semibold leading-[1.4]">
                      {lesson.title}
                    </h1>
                    <LoopActionButton
                      active={isSceneLooping}
                      loading={isSceneLoopLoading}
                      variant="ghost"
                      size="icon"
                      className={`size-[var(--mobile-control-height)] border-transparent bg-transparent px-0 text-[length:var(--mobile-font-caption)] ${APPLE_META_TEXT} hover:bg-transparent hover:text-foreground`}
                      iconClassName="size-4"
                      onClick={toggleSceneLoopPlayback}
                    />
                  </div>
                  <p className={`text-[length:var(--mobile-font-caption)] leading-[1.35] whitespace-nowrap ${APPLE_META_TEXT}`}>
                    {sceneMetaLabel}
                  </p>
                  {headerTools ? (
                    <div className="flex flex-wrap items-center gap-[var(--mobile-space-sm)]">
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
                      variant="ghost"
                      size="icon"
                      className="size-9 cursor-pointer border-transparent bg-transparent px-0 transition-all duration-150 hover:bg-transparent hover:text-foreground"
                      iconClassName="size-4"
                      onClick={toggleSceneLoopPlayback}
                    />
                    <TtsActionButton
                      loading={
                        currentSentence
                          ? isSentenceLoading(currentSentence.id, "normal")
                          : false
                      }
                      variant="ghost"
                      size="icon"
                      className="size-9 cursor-pointer border-transparent bg-transparent px-0 transition-all duration-150 hover:bg-transparent hover:text-foreground"
                      iconClassName="size-4"
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
          <LessonReaderDialogueContent
            blockOrder={blockOrder}
            isMobile={isMobile}
            isTrainingMode={isTrainingMode}
            activeTrainingSentenceText={activeTrainingSentence?.text}
            resolvedHeaderTitle={resolvedHeaderTitle}
            topRightTool={topRightTool}
            onBackToList={onBackToList}
            isSceneLooping={isSceneLooping}
            isSceneLoopLoading={isSceneLoopLoading}
            toggleSceneLoopPlayback={toggleSceneLoopPlayback}
            isSentencePlaying={isSentencePlaying}
            playbackState={playbackState}
            handleSentenceTap={handleSentenceTap}
            playBlockTts={playBlockTts}
          />
        ) : isMobile ? (
          <LessonReaderMobileSections
            lesson={lesson}
            currentSectionId={currentSection?.id ?? null}
            activeSentenceId={state.activeSentenceId}
            effectiveSpeakingText={effectiveSpeakingText}
            isChunkLoading={isChunkLoading}
            handleLoopSentence={handleLoopSentence}
            handleMobileGroupTap={handleMobileGroupTap}
            handleMobileSentenceTap={handleMobileSentenceTap}
            sentenceNodeMapRef={sentenceNodeMapRef}
          />
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

                      <div className={`mt-1 flex items-center gap-[var(--mobile-space-sm)] text-[length:var(--mobile-font-caption)] ${APPLE_META_TEXT}`}>
                        <TtsActionButton
                          loading={isChunkLoading(
                            block.tts?.trim() ||
                              block.sentences
                                .map((sentence) => sentence.tts?.trim() || sentence.audioText || sentence.text)
                                .filter(Boolean)
                                .join(" "),
                          )}
                          variant="ghost"
                          size="icon"
                          surface="soft"
                          ariaLabel="朗读"
                          className="text-inherit"
                          iconClassName="size-4"
                          onClick={() => handlePronounce(
                            block.tts?.trim() ||
                              block.sentences
                                .map((sentence) => sentence.tts?.trim() || sentence.audioText || sentence.text)
                                .filter(Boolean)
                                .join(" "),
                          )}
                        />
                      </div>

                      <p className={`mt-2 leading-6 ${APPLE_META_TEXT}`}>
                        {block.translation?.trim() ||
                          block.sentences
                            .map((sentence) => sentence.translation?.trim())
                            .filter(Boolean)
                            .join(" ") ||
                          "该段翻译暂未提供。"}
                      </p>
                    </article>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

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
            relatedChunks={effectiveRelatedChunks}
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
        relatedChunks={effectiveRelatedChunks}
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





