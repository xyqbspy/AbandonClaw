"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lesson, LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  buildAnonymousHeaders,
  getOrCreateAnonymousId,
} from "@/lib/anonymous-client";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { getLessonBlocks, getLessonSentences } from "@/lib/shared/lesson-content";
import {
  getChunkLayerFromLesson,
  getFirstSentence,
  getSentenceById,
} from "@/lib/data/mock-lessons";
import { useMobile } from "@/hooks/use-mobile";
import { LessonReaderDialogueContent } from "@/features/lesson/components/lesson-reader-dialogue-content";
import { SentenceBlock } from "@/features/lesson/components/sentence-block";
import { SelectionDetailPanel } from "@/features/lesson/components/selection-detail-panel";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { ScenePracticeView } from "@/features/scene/components/scene-practice-view";
import {
  SCENE_ACTION_BUTTON_SM_CLASSNAME,
  SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME,
} from "@/features/scene/components/scene-page-styles";
import { SceneTrainingNextStepStrip } from "@/features/scene/components/scene-training-next-step-strip";
import { SceneVariantsView } from "@/features/scene/components/scene-variants-view";
import { sceneViewLabels } from "@/features/scene/components/scene-view-labels";
import { AnonymousTopbarBanner } from "./anonymous-topbar-banner";
import { AnonymousInlineUpsellCard } from "./anonymous-inline-upsell-card";
import { AnonymousBlockModal, type AnonymousBlockTrigger } from "./anonymous-block-modal";
import {
  useAnonymousMode,
  type AnonymousQuotaSnapshot,
} from "@/features/anonymous-trial/use-anonymous-mode";
import {
  buildTrialPracticeSet,
  buildTrialVariantSet,
} from "@/features/anonymous-trial/trial-scene-fixtures";

type ShareScenePreviewClientProps = {
  initialLesson: Lesson;
  registerHref: string;
  backHref?: string;
};

type TtsPlaybackSuccessResponse = {
  signedUrl?: string;
  source?: string;
};

type PlaybackState =
  | { kind: "idle" }
  | {
      kind: "loading" | "playing" | "unavailable";
      targetKind: "sentence" | "chunk";
      targetId: string;
      text: string;
    };

type TrialSceneViewMode = "scene" | "practice" | "variants" | "variant-study";

const hasSpeakerTag = (speaker?: string) => /^[A-Z]$/.test((speaker ?? "").trim().toUpperCase());

const reportAnonymousEvent = (
  event:
    | "anon_first_scene_viewed"
    | "anon_register_prompt_shown"
    | "anon_register_prompt_clicked",
  payload?: Record<string, unknown>,
) => {
  if (typeof window === "undefined") return;
  void fetch("/api/anonymous/funnel-event", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...buildAnonymousHeaders(),
    },
    body: JSON.stringify({ event, payload }),
    keepalive: true,
  }).catch(() => {
    // 漏斗失败不阻塞匿名试用体验
  });
};

const withChunkDetailTexts = (lesson: Lesson): Lesson => ({
  ...lesson,
  sections: lesson.sections.map((section) => ({
    ...section,
    blocks: section.blocks.map((block) => ({
      ...block,
      sentences: block.sentences.map((sentence) => {
        const detailTexts =
          sentence.chunkDetails?.map((detail) => detail.text.trim()).filter(Boolean) ?? [];
        const chunks = Array.from(
          new Set([...(sentence.chunks ?? []), ...detailTexts].map((item) => item.trim()).filter(Boolean)),
        );
        return { ...sentence, chunks };
      }),
    })),
  })),
});

const getSentenceSpeakText = (sentence: LessonSentence) =>
  (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim();

const getBlockSpeakText = (block: LessonBlock) =>
  (
    block.tts?.trim() ||
    block.sentences
      .map((sentence) => getSentenceSpeakText(sentence))
      .filter(Boolean)
      .join(" ")
  ).trim();

const getUniqueChunks = (sentences: LessonSentence[]) =>
  Array.from(new Set(sentences.flatMap((sentence) => sentence.chunks ?? []))).filter(Boolean);

const getFirstChunk = (sentence: LessonSentence | null) => sentence?.chunks?.[0] ?? null;

const toTrialVariantTitle = (title: string) => title;

const toTrialVariantStatusLabel = (status: "unviewed" | "viewed" | "completed") => {
  if (status === "completed") return "已完成";
  if (status === "viewed") return "已查看";
  return "待查看";
};

export function ShareScenePreviewClient({
  initialLesson,
  registerHref,
  backHref,
}: ShareScenePreviewClientProps) {
  const lesson = useMemo(() => withChunkDetailTexts(initialLesson), [initialLesson]);

  return (
    <ShareScenePreviewContent
      key={lesson.id}
      lesson={lesson}
      registerHref={registerHref}
      backHref={backHref}
    />
  );
}

function ShareScenePreviewContent({
  lesson,
  registerHref,
  backHref,
}: {
  lesson: Lesson;
  registerHref: string;
  backHref?: string;
}) {
  const router = useRouter();
  const anonState = useAnonymousMode({ isAuthenticated: false });
  const isMobile = useMobile();
  const trialPracticeSet = useMemo(() => buildTrialPracticeSet(lesson), [lesson]);
  const trialVariantSet = useMemo(() => buildTrialVariantSet(lesson), [lesson]);
  const [trialViewMode, setTrialViewMode] = useState<TrialSceneViewMode>("scene");
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const activeVariantItem = useMemo(
    () =>
      activeVariantId
        ? (trialVariantSet.variants.find((variant) => variant.id === activeVariantId) ?? null)
        : null,
    [activeVariantId, trialVariantSet],
  );
  const readerLesson =
    trialViewMode === "variant-study" && activeVariantItem ? activeVariantItem.lesson : lesson;
  const blockOrder = useMemo(() => getLessonBlocks(readerLesson), [readerLesson]);
  const sentenceOrder = useMemo(() => getLessonSentences(readerLesson), [readerLesson]);
  const firstSentence = useMemo(() => getFirstSentence(readerLesson) ?? null, [readerLesson]);
  const hasDialogueLikeSpeakers =
    blockOrder.length > 0 && blockOrder.every((block) => hasSpeakerTag(block.speaker));
  const isDialogueScene =
    readerLesson.sceneType === "dialogue" ||
    blockOrder.some((block) => (block.kind ?? readerLesson.sceneType ?? "monologue") === "dialogue") ||
    hasDialogueLikeSpeakers;

  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(
    firstSentence?.id ?? null,
  );
  const [activeBlockId, setActiveBlockId] = useState<string | null>(
    blockOrder[0]?.id ?? null,
  );
  const [activeChunkKey, setActiveChunkKey] = useState<string | null>(
    getFirstChunk(firstSentence),
  );
  const [hoveredChunkKey, setHoveredChunkKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inlineCardVisible, setInlineCardVisible] = useState(true);
  const [blockTrigger, setBlockTrigger] = useState<AnonymousBlockTrigger | null>(null);
  const [capabilityLabel, setCapabilityLabel] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({ kind: "idle" });
  const [showAnswerMap, setShowAnswerMap] = useState<Record<string, boolean>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstViewReportedRef = useRef(false);
  const promptShownReportedRef = useRef<Record<string, boolean>>({});

  const resetReaderSelection = useCallback((nextLesson: Lesson) => {
    const nextFirstSentence = getFirstSentence(nextLesson) ?? null;
    const nextBlocks = getLessonBlocks(nextLesson);
    setActiveSentenceId(nextFirstSentence?.id ?? null);
    setActiveBlockId(nextBlocks[0]?.id ?? null);
    setActiveChunkKey(getFirstChunk(nextFirstSentence));
    setHoveredChunkKey(null);
    setSheetOpen(false);
    setShowAnswerMap({});
  }, []);

  useEffect(() => {
    if (firstViewReportedRef.current) return;
    firstViewReportedRef.current = true;
    getOrCreateAnonymousId();
    reportAnonymousEvent("anon_first_scene_viewed", {
      scene_slug: lesson.slug,
      scene_id: lesson.id,
    });
  }, [lesson.id, lesson.slug]);

  useEffect(() => {
    if (!inlineCardVisible) return;
    if (promptShownReportedRef.current.L2) return;
    promptShownReportedRef.current.L2 = true;
    reportAnonymousEvent("anon_register_prompt_shown", {
      prompt_level: "L2",
      surface: "trial_scene_detail_inline_card",
    });
  }, [inlineCardVisible]);

  useEffect(() => {
    if (blockTrigger === null) return;
    const key = `L3:${capabilityLabel ?? blockTrigger}`;
    if (promptShownReportedRef.current[key]) return;
    promptShownReportedRef.current[key] = true;
    reportAnonymousEvent("anon_register_prompt_shown", {
      prompt_level: "L3",
      trigger: blockTrigger,
      capability: capabilityLabel,
      surface: "trial_scene_detail",
    });
  }, [blockTrigger, capabilityLabel]);

  const currentSentence = useMemo(
    () =>
      activeSentenceId
        ? (getSentenceById(readerLesson, activeSentenceId) ?? null)
        : firstSentence,
    [activeSentenceId, firstSentence, readerLesson],
  );

  const currentBlock = useMemo(() => {
    if (isDialogueScene && activeBlockId) {
      return blockOrder.find((block) => block.id === activeBlockId) ?? null;
    }
    return currentSentence
      ? (blockOrder.find((block) =>
          block.sentences.some((sentence) => sentence.id === currentSentence.id),
        ) ?? null)
      : null;
  }, [activeBlockId, blockOrder, currentSentence, isDialogueScene]);

  const relatedChunks = useMemo(
    () =>
      isDialogueScene && currentBlock
        ? getUniqueChunks(currentBlock.sentences)
        : currentSentence?.chunks ?? [],
    [currentBlock, currentSentence, isDialogueScene],
  );

  const chunkDetail = useMemo<SelectionChunkLayer | null>(() => {
    if (!currentSentence || !activeChunkKey) return null;
    return getChunkLayerFromLesson(readerLesson, currentSentence, activeChunkKey);
  }, [activeChunkKey, currentSentence, readerLesson]);

  const expressionCount = useMemo(() => {
    const seen = new Set<string>();
    for (const sentence of sentenceOrder) {
      for (const chunk of sentence.chunks ?? []) {
        seen.add(chunk);
      }
    }
    return seen.size;
  }, [sentenceOrder]);

  const ttsSnapshot: AnonymousQuotaSnapshot | null =
    anonState.quotaByCapability.tts_play ?? null;

  const stopCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.currentTime = 0;
    audioRef.current = null;
  }, []);

  useEffect(() => () => stopCurrentAudio(), [stopCurrentAudio]);

  const openBlockedCapability = useCallback((label: string, options?: { closeSheet?: boolean }) => {
    if (options?.closeSheet) {
      setSheetOpen(false);
    }
    setCapabilityLabel(label);
    setBlockTrigger("feature_disabled");
  }, []);

  const playAnonymousTts = useCallback(
    async ({
      targetKind,
      targetId,
      text,
      speaker,
      chunkKey,
      requestSentenceId,
    }: {
      targetKind: "sentence" | "chunk";
      targetId: string;
      text: string;
      speaker?: string;
      chunkKey?: string;
      requestSentenceId?: string;
    }) => {
      const clean = text.trim();
      if (!clean) return;

      if (
        playbackState.kind === "playing" &&
        playbackState.targetId === targetId &&
        playbackState.targetKind === targetKind
      ) {
        stopCurrentAudio();
        setPlaybackState({ kind: "idle" });
        return;
      }

      stopCurrentAudio();
      setPlaybackState({ kind: "loading", targetKind, targetId, text: clean });
      getOrCreateAnonymousId();

      try {
        const url = new URL("/api/anonymous/tts/play", window.location.origin);
        url.searchParams.set("kind", targetKind);
        url.searchParams.set("text", clean);
        if (targetKind === "sentence") {
          url.searchParams.set("sceneSlug", readerLesson.slug);
          url.searchParams.set("sentenceId", requestSentenceId ?? targetId);
          if (speaker) url.searchParams.set("speaker", speaker);
        } else {
          url.searchParams.set("chunkKey", chunkKey ?? buildChunkAudioKey(clean));
        }

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { ...buildAnonymousHeaders() },
        });
        anonState.syncFromResponse(response);

        if (response.status === 429) {
          setPlaybackState({ kind: "idle" });
          setCapabilityLabel("音频播放");
          setBlockTrigger("tts_quota_exhausted");
          return;
        }
        if (response.status === 404 || !response.ok) {
          setPlaybackState({ kind: "unavailable", targetKind, targetId, text: clean });
          return;
        }

        const data = (await response.json()) as TtsPlaybackSuccessResponse;
        if (!data.signedUrl) {
          setPlaybackState({ kind: "unavailable", targetKind, targetId, text: clean });
          return;
        }

        const audio = new Audio(data.signedUrl);
        audioRef.current = audio;
        audio.onended = () => {
          if (audioRef.current === audio) audioRef.current = null;
          setPlaybackState({ kind: "idle" });
        };
        audio.onerror = () => {
          if (audioRef.current === audio) audioRef.current = null;
          setPlaybackState({ kind: "unavailable", targetKind, targetId, text: clean });
        };
        await audio.play();
        setPlaybackState({ kind: "playing", targetKind, targetId, text: clean });
      } catch {
        setPlaybackState({ kind: "unavailable", targetKind, targetId, text: clean });
      }
    },
    [anonState, playbackState, readerLesson.slug, stopCurrentAudio],
  );

  const activateSentence = useCallback(
    (sentenceId: string, blockId?: string, options?: { openSheet?: boolean }) => {
      const sentence = getSentenceById(readerLesson, sentenceId);
      if (!sentence) return;
      const ownerBlock =
        blockId
          ? blockOrder.find((block) => block.id === blockId) ?? null
          : blockOrder.find((block) =>
              block.sentences.some((item) => item.id === sentence.id),
            ) ?? null;
      setActiveSentenceId(sentence.id);
      setActiveBlockId(ownerBlock?.id ?? null);
      setActiveChunkKey(getFirstChunk(sentence));
      if (options?.openSheet ?? isMobile) {
        setSheetOpen(true);
      }
    },
    [blockOrder, isMobile, readerLesson],
  );

  const activateChunk = useCallback(
    (chunk: string) => {
      if (!chunk.trim()) return;
      const targetSentence =
        currentBlock?.sentences.find((sentence) =>
          sentence.chunks.some((item) => item.toLowerCase() === chunk.toLowerCase()),
        ) ??
        currentSentence ??
        firstSentence;
      if (!targetSentence) return;
      const ownerBlock =
        currentBlock ??
        blockOrder.find((block) =>
          block.sentences.some((sentence) => sentence.id === targetSentence.id),
        ) ??
        null;
      setActiveSentenceId(targetSentence.id);
      setActiveBlockId(ownerBlock?.id ?? null);
      setActiveChunkKey(chunk);
      if (isMobile) setSheetOpen(true);
    },
    [blockOrder, currentBlock, currentSentence, firstSentence, isMobile],
  );

  const playSentence = useCallback(
    (sentence: LessonSentence) =>
      playAnonymousTts({
        targetKind: "sentence",
        targetId: sentence.id,
        text: getSentenceSpeakText(sentence),
        speaker: sentence.speaker,
      }),
    [playAnonymousTts],
  );

  const playBlockTts = useCallback(
    (block: LessonBlock) => {
      const first = block.sentences[0];
      return playAnonymousTts({
        targetKind: "sentence",
        targetId: `block-${block.id}`,
        text: first ? getSentenceSpeakText(first) : getBlockSpeakText(block),
        speaker: first?.speaker ?? block.speaker,
        requestSentenceId: first?.id,
      });
    },
    [playAnonymousTts],
  );

  const playChunk = useCallback(
    (text: string) =>
      playAnonymousTts({
        targetKind: "chunk",
        targetId: `chunk:${buildChunkAudioKey(text)}`,
        text,
        chunkKey: buildChunkAudioKey(text),
      }),
    [playAnonymousTts],
  );

  const isSentencePlaying = useCallback(
    (sentenceId: string) =>
      playbackState.kind === "playing" &&
      playbackState.targetKind === "sentence" &&
      playbackState.targetId === sentenceId,
    [playbackState],
  );

  const isSentenceLoading = useCallback(
    (sentenceId: string) =>
      playbackState.kind === "loading" &&
      playbackState.targetKind === "sentence" &&
      playbackState.targetId === sentenceId,
    [playbackState],
  );

  const playingChunkKey =
    playbackState.kind === "playing" && playbackState.targetKind === "chunk"
      ? playbackState.text
      : null;
  const loadingChunkKey =
    playbackState.kind === "loading" && playbackState.targetKind === "chunk"
      ? playbackState.text
      : null;

  const detailSpeakingText = playbackState.kind === "playing" ? playbackState.text : null;
  const detailLoadingText = playbackState.kind === "loading" ? playbackState.text : null;

  const sentenceSectionLabel = isDialogueScene ? "当前对话块" : "当前句子";
  const headerTitle =
    readerLesson.subtitle?.trim() || readerLesson.sections[0]?.summary?.trim() || readerLesson.title;
  const headerBackHandler =
    trialViewMode === "variant-study" || backHref
      ? () => {
          if (trialViewMode === "variant-study") {
            setTrialViewMode("variants");
            return;
          }
          if (backHref) router.push(backHref);
        }
      : undefined;
  const isSceneLooping =
    playbackState.kind === "playing" &&
    playbackState.targetKind === "sentence" &&
    playbackState.targetId.startsWith("block-");
  const isSceneLoopLoading =
    playbackState.kind === "loading" &&
    playbackState.targetKind === "sentence" &&
    playbackState.targetId.startsWith("block-");
  const handleTrialSceneLoopPlayback = () => {
    const firstBlock = blockOrder[0];
    if (!firstBlock) return;
    void playBlockTts(firstBlock);
  };
  const handleTrialCurrentStepAction = () => {
    if (trialViewMode === "variant-study") {
      setTrialViewMode("variants");
      return;
    }
    const sentence = firstSentence;
    if (!sentence) return;
    activateSentence(sentence.id, blockOrder[0]?.id, { openSheet: true });
  };
  const trialStageActions = [
    {
      kind: "practice" as const,
      label: "练习",
      testId: "trial-scene-practice-entry",
      onClick: () => setTrialViewMode("practice"),
    },
    {
      kind: "variants" as const,
      label: "变体",
      testId: "trial-scene-variant-entry",
      onClick: () => {
        setActiveVariantId(null);
        resetReaderSelection(lesson);
        setTrialViewMode("variants");
      },
    },
  ];
  const trialSupportText =
    trialViewMode === "variant-study"
      ? "这是试用页的固定变体预览，内容不会写入学习进度。"
      : "体验模式下练习和变体都已预置好，可以直接查看；保存和提交需要注册。";
  const trialNextStepLabel =
    trialViewMode === "variant-study" ? "返回变体列表或继续练习" : "练习 / 变体已解锁";

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="share-scene-preview">
      <AnonymousTopbarBanner
        isAnonymous
        primaryCapability="tts_play"
        quotaByCapability={anonState.quotaByCapability}
        registerHref={registerHref}
        onRegisterClick={() =>
          reportAnonymousEvent("anon_register_prompt_clicked", {
            prompt_level: "L1",
            surface: "trial_scene_detail_topbar",
          })
        }
      />

      <main className="mx-auto w-full max-w-6xl space-y-[var(--mobile-space-xl)] px-3 pb-28 pt-4 lg:px-5">
        {trialViewMode === "practice" ? (
          <ScenePracticeView
            practiceSet={trialPracticeSet}
            practiceSnapshot={null}
            showAnswerMap={showAnswerMap}
            appleButtonSmClassName={SCENE_ACTION_BUTTON_SM_CLASSNAME}
            appleDangerButtonSmClassName={SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME}
            labels={sceneViewLabels.practice}
            regenerating={false}
            onBack={() => {
              resetReaderSelection(lesson);
              setTrialViewMode("scene");
            }}
            onDelete={() => openBlockedCapability("删除练习")}
            onRegenerate={() => openBlockedCapability("重新生成练习")}
            onComplete={() => openBlockedCapability("提交练习")}
            completing={false}
            onReviewScene={() => {
              resetReaderSelection(lesson);
              setTrialViewMode("scene");
            }}
            onRepeatPractice={() => setShowAnswerMap({})}
            onOpenVariants={() => setTrialViewMode("variants")}
            onToggleAnswer={(exerciseId) =>
              setShowAnswerMap((prev) => ({
                ...prev,
                [exerciseId]: !prev[exerciseId],
              }))
            }
          />
        ) : trialViewMode === "variants" ? (
          <SceneVariantsView
            baseLesson={lesson}
            variantSet={trialVariantSet}
            expressionMapLoading={false}
            appleButtonSmClassName={SCENE_ACTION_BUTTON_SM_CLASSNAME}
            appleDangerButtonSmClassName={SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME}
            labels={sceneViewLabels.variants}
            onBack={() => {
              resetReaderSelection(lesson);
              setTrialViewMode("scene");
            }}
            onComplete={() => openBlockedCapability("提交变体")}
            completing={false}
            onRepeatVariants={() => undefined}
            onDeleteSet={() => openBlockedCapability("删除变体")}
            onOpenExpressionMap={() => openBlockedCapability("表达地图")}
            onOpenChunk={activateChunk}
            onOpenVariant={(variantId) => {
              const nextVariant = trialVariantSet.variants.find((variant) => variant.id === variantId);
              if (nextVariant) resetReaderSelection(nextVariant.lesson);
              setActiveVariantId(variantId);
              setTrialViewMode("variant-study");
            }}
            onDeleteVariant={() => openBlockedCapability("删除变体")}
            toVariantTitle={toTrialVariantTitle}
            toVariantStatusLabel={toTrialVariantStatusLabel}
          />
        ) : (
          <>
            <SceneTrainingNextStepStrip
              title={headerTitle}
              onBack={headerBackHandler}
              supportText={trialSupportText}
              nextStepLabel={trialNextStepLabel}
              isSceneLooping={isSceneLooping}
              isSceneLoopLoading={isSceneLoopLoading}
              onSceneLoopPlayback={handleTrialSceneLoopPlayback}
              currentStepActionLabel={trialViewMode === "variant-study" ? "返回变体" : "看重点表达"}
              onCurrentStepAction={handleTrialCurrentStepAction}
              currentStepActionDisabled={false}
              stageActions={trialStageActions}
            />

        <div
          className={cn(
            "relative grid gap-6 lg:gap-8",
            "lg:grid-cols-[minmax(0,1fr)_340px]",
          )}
        >
          <section className="space-y-[var(--mobile-space-xl)] overflow-x-hidden">
            {isDialogueScene ? (
              <LessonReaderDialogueContent
                blockOrder={blockOrder}
                isMobile={isMobile}
                isTrainingMode={false}
                resolvedHeaderTitle={headerTitle}
                isSentencePlaying={isSentencePlaying}
                playbackState={{
                  kind:
                    playbackState.kind === "idle"
                      ? null
                      : playbackState.targetKind === "sentence"
                        ? "sentence"
                        : "chunk",
                  status: playbackState.kind === "idle" ? null : playbackState.kind,
                  sentenceId:
                    playbackState.kind !== "idle" && playbackState.targetKind === "sentence"
                      ? playbackState.targetId
                      : null,
                }}
                handleSentenceTap={(sentenceId, blockId) =>
                  activateSentence(sentenceId, blockId)
                }
                playBlockTts={playBlockTts}
              />
            ) : (
              readerLesson.sections.map((section) => (
                <section key={section.id} className="space-y-3">
                  {section.title ? (
                    <div className="space-y-1 px-1">
                      <h2 className="text-xl font-semibold">{section.title}</h2>
                      {section.summary ? (
                        <p className="text-sm text-slate-500">{section.summary}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    {section.blocks.flatMap((block) =>
                      block.sentences.map((sentence) => (
                        <SentenceBlock
                          key={sentence.id}
                          sentence={sentence}
                          showSpeaker={Boolean(sentence.speaker)}
                          speaking={isSentencePlaying(sentence.id)}
                          loading={isSentenceLoading(sentence.id)}
                          activeChunkKey={activeChunkKey}
                          hoveredChunkKey={hoveredChunkKey}
                          onPronounce={() => {
                            void playSentence(sentence);
                          }}
                          onSelectText={(chunkText) => activateChunk(chunkText)}
                          onHoverChunk={setHoveredChunkKey}
                          onSentenceTap={() => activateSentence(sentence.id, block.id)}
                          mobileTapEnabled
                        />
                      )),
                    )}
                  </div>
                </section>
              ))
            )}

            <AnonymousInlineUpsellCard
              isAnonymous
              visible={inlineCardVisible}
              onDismiss={() => setInlineCardVisible(false)}
              expressionCount={expressionCount}
              registerHref={registerHref}
              onRegisterClick={() =>
                reportAnonymousEvent("anon_register_prompt_clicked", {
                  prompt_level: "L2",
                  surface: "trial_scene_detail_inline_card",
                })
              }
            />
          </section>

          <SelectionDetailPanel
            currentBlock={isDialogueScene ? currentBlock : null}
            currentSentence={currentSentence}
            chunkDetail={chunkDetail}
            relatedChunks={relatedChunks}
            showSpeaker={isDialogueScene}
            sentenceSectionLabel={sentenceSectionLabel}
            loading={false}
            speakingText={detailSpeakingText}
            loadingText={detailLoadingText}
            onSave={() => openBlockedCapability("保存表达")}
            onReview={() => openBlockedCapability("加入复习")}
            saved={false}
            onPronounce={playChunk}
            onPronounceBlock={() => {
              if (currentBlock) {
                void playBlockTts(currentBlock);
                return;
              }
              if (currentSentence) {
                void playSentence(currentSentence);
              }
            }}
            onSelectRelated={activateChunk}
            hoveredChunkKey={hoveredChunkKey}
            onHoverChunk={setHoveredChunkKey}
            playingChunkKey={playingChunkKey}
            loadingChunkKey={loadingChunkKey}
          />
        </div>
          </>
        )}
      </main>

      <SelectionDetailSheet
        currentBlock={isDialogueScene ? currentBlock : null}
        currentSentence={currentSentence}
        chunkDetail={chunkDetail}
        relatedChunks={relatedChunks}
        open={sheetOpen}
        showSpeaker={isDialogueScene}
        sentenceSectionLabel={sentenceSectionLabel}
        loading={false}
        speakingText={detailSpeakingText}
        loadingText={detailLoadingText}
        onOpenChange={setSheetOpen}
        onSave={() => openBlockedCapability("保存表达", { closeSheet: true })}
        onReview={() => openBlockedCapability("加入复习", { closeSheet: true })}
        saved={false}
        onPronounce={playChunk}
        onPronounceBlock={() => {
          if (currentBlock) {
            void playBlockTts(currentBlock);
            return;
          }
          if (currentSentence) {
            void playSentence(currentSentence);
          }
        }}
        onSelectRelated={activateChunk}
        hoveredChunkKey={hoveredChunkKey}
        onHoverChunk={setHoveredChunkKey}
        playingChunkKey={playingChunkKey}
        loadingChunkKey={loadingChunkKey}
      />

      <AnonymousBlockModal
        isAnonymous
        visible={blockTrigger !== null}
        trigger={blockTrigger ?? "feature_disabled"}
        capabilityLabel={capabilityLabel ?? undefined}
        onDismiss={() => {
          setBlockTrigger(null);
          setCapabilityLabel(null);
        }}
        registerHref={registerHref}
        onRegisterClick={() =>
          reportAnonymousEvent("anon_register_prompt_clicked", {
            prompt_level: "L3",
            trigger: blockTrigger ?? "feature_disabled",
            capability: capabilityLabel,
            surface: "trial_scene_detail",
          })
        }
      />

      {ttsSnapshot?.sessionLimit !== null && ttsSnapshot?.sessionLimit !== undefined ? (
        <span className="sr-only" data-testid="trial-scene-tts-quota">
          {ttsSnapshot.sessionRemaining ?? 0}/{ttsSnapshot.sessionLimit}
        </span>
      ) : null}
    </div>
  );
}
