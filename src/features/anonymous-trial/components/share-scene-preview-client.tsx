"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, Dumbbell } from "lucide-react";
import type { Lesson, LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
import { AnonymousTopbarBanner } from "./anonymous-topbar-banner";
import { AnonymousInlineUpsellCard } from "./anonymous-inline-upsell-card";
import { AnonymousBlockModal, type AnonymousBlockTrigger } from "./anonymous-block-modal";
import {
  useAnonymousMode,
  type AnonymousQuotaSnapshot,
} from "@/features/anonymous-trial/use-anonymous-mode";

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
  const anonState = useAnonymousMode({ isAuthenticated: false });
  const isMobile = useMobile();
  const blockOrder = useMemo(() => getLessonBlocks(lesson), [lesson]);
  const sentenceOrder = useMemo(() => getLessonSentences(lesson), [lesson]);
  const firstSentence = useMemo(() => getFirstSentence(lesson) ?? null, [lesson]);
  const hasDialogueLikeSpeakers =
    blockOrder.length > 0 && blockOrder.every((block) => hasSpeakerTag(block.speaker));
  const isDialogueScene =
    lesson.sceneType === "dialogue" ||
    blockOrder.some((block) => (block.kind ?? lesson.sceneType ?? "monologue") === "dialogue") ||
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstViewReportedRef = useRef(false);
  const promptShownReportedRef = useRef<Record<string, boolean>>({});

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
        ? (getSentenceById(lesson, activeSentenceId) ?? null)
        : firstSentence,
    [activeSentenceId, firstSentence, lesson],
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
    return getChunkLayerFromLesson(lesson, currentSentence, activeChunkKey);
  }, [activeChunkKey, currentSentence, lesson]);

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

  const openBlockedCapability = useCallback((label: string) => {
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
          url.searchParams.set("sceneSlug", lesson.slug);
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
    [anonState, lesson.slug, playbackState, stopCurrentAudio],
  );

  const activateSentence = useCallback(
    (sentenceId: string, blockId?: string, options?: { openSheet?: boolean }) => {
      const sentence = getSentenceById(lesson, sentenceId);
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
    [blockOrder, isMobile, lesson],
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
  const headerTitle = lesson.subtitle?.trim() || lesson.sections[0]?.summary?.trim() || lesson.title;

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
        <header className="space-y-[var(--mobile-space-md)]">
          <div className="flex items-center justify-between gap-3">
            {backHref ? (
              <Button asChild variant="ghost" size="sm" radius="pill" className="gap-2">
                <Link href={backHref} data-testid="trial-scene-back-link">
                  <ArrowLeft className="size-4" />
                  场景列表
                </Link>
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                radius="pill"
                className="gap-2"
                onClick={() => openBlockedCapability("生成练习")}
                data-testid="trial-scene-practice-placeholder"
              >
                <Dumbbell className="size-4" />
                练习
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                radius="pill"
                className="gap-2"
                onClick={() => openBlockedCapability("生成变体")}
                data-testid="trial-scene-variant-placeholder"
              >
                <GitBranch className="size-4" />
                变体
              </Button>
            </div>
          </div>
          <div className="space-y-1 px-1.5">
            <p className="text-[10px] font-black uppercase tracking-tight text-slate-400">
              体验模式
            </p>
            <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
              {lesson.title}
            </h1>
            {headerTitle ? (
              <p className="max-w-2xl text-sm font-medium leading-6 text-slate-500">
                {headerTitle}
              </p>
            ) : null}
          </div>
        </header>

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
              lesson.sections.map((section) => (
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

      <AnonymousBlockModal
        isAnonymous
        visible={blockTrigger !== null}
        trigger={blockTrigger ?? "feature_disabled"}
        capabilityLabel={capabilityLabel ?? undefined}
        onDismiss={() => setBlockTrigger(null)}
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
