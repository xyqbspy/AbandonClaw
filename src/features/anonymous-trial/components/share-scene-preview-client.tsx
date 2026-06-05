"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Lesson, LessonBlock, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getChunkLayerFromLesson,
  getFirstSentence,
  getSentenceById,
} from "@/lib/data/mock-lessons";
import { getLessonBlocks, getLessonSentences } from "@/lib/shared/lesson-content";
import { SentenceBlock } from "@/features/lesson/components/sentence-block";
import { SelectionDetailPanel } from "@/features/lesson/components/selection-detail-panel";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import {
  SCENE_PAGE_CONTENT_ANCHOR_CLASSNAME,
  SCENE_PAGE_STACK_CLASSNAME,
} from "@/features/scene/components/scene-page-styles";
import { APPLE_META_TEXT, APPLE_SURFACE } from "@/lib/ui/apple-style";
import {
  buildAnonymousHeaders,
  getOrCreateAnonymousId,
} from "@/lib/anonymous-client";
import {
  useAnonymousMode,
  type AnonymousQuotaSnapshot,
} from "@/features/anonymous-trial/use-anonymous-mode";
import { AnonymousTopbarBanner } from "./anonymous-topbar-banner";
import { AnonymousInlineUpsellCard } from "./anonymous-inline-upsell-card";
import {
  AnonymousBlockModal,
  type AnonymousBlockTrigger,
} from "./anonymous-block-modal";

const reportAnonymousEvent = (
  event:
    | "anon_first_scene_viewed"
    | "anon_first_scene_completed"
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
    // fire-and-forget; 漏斗失败不阻塞业务
  });
};

const reportRegisterClicked = (
  level: "L1" | "L2" | "L3",
  extra?: Record<string, unknown>,
) => {
  reportAnonymousEvent("anon_register_prompt_clicked", {
    prompt_level: level,
    ...(extra ?? {}),
  });
};

interface ExplainSuccessResponse {
  chunk?: {
    text?: string;
    translation?: string;
    explanation?: string;
    usageNote?: string;
  };
}

interface ExplainErrorResponse {
  code?: string;
  error?: string;
  message?: string;
  details?: { capability?: string };
}

interface TtsPlaybackSuccessResponse {
  signedUrl?: string;
  source?: string;
}

type SentencePlaybackState =
  | { kind: "idle" }
  | { kind: "loading"; sentenceId: string }
  | { kind: "playing"; sentenceId: string }
  | { kind: "unavailable"; sentenceId: string };

export type ShareScenePreviewClientProps = {
  initialLesson: Lesson;
  registerHref: string;
  showPracticePreview?: boolean;
  backHref?: string;
};

const collectSentenceChunks = (sentence: LessonSentence): string[] => {
  const fromChunks = (sentence.chunks ?? []).map((s) => s.trim()).filter(Boolean);
  const fromDetails = (sentence.chunkDetails ?? [])
    .map((detail) => detail.text?.trim())
    .filter((value): value is string => Boolean(value));
  const merged = [...fromDetails, ...fromChunks];
  return Array.from(new Set(merged));
};

const withDisplayChunks = (lesson: Lesson): Lesson => ({
  ...lesson,
  sections: lesson.sections.map((section) => ({
    ...section,
    blocks: section.blocks.map((block) => ({
      ...block,
      sentences: block.sentences.map((sentence) => ({
        ...sentence,
        speaker: sentence.speaker ?? block.speaker,
        chunks: collectSentenceChunks(sentence),
      })),
    })),
  })),
});

const flattenSentences = (lesson: Lesson): LessonSentence[] => {
  const out: LessonSentence[] = [];
  for (const section of lesson.sections ?? []) {
    for (const block of section.blocks ?? []) {
      for (const sentence of block.sentences ?? []) {
        out.push(sentence);
      }
    }
  }
  return out;
};

const hasSpeakerTag = (speaker?: string) =>
  /^[A-Z]$/.test((speaker ?? "").trim().toUpperCase());

const isDialogueLikeScene = (lesson: Lesson, blocks: LessonBlock[]) =>
  lesson.sceneType === "dialogue" ||
  blocks.some((block) => (block.kind ?? lesson.sceneType ?? "monologue") === "dialogue") ||
  (blocks.length > 0 && blocks.every((block) => hasSpeakerTag(block.speaker)));

const findSentenceBlock = (blocks: LessonBlock[], sentenceId: string | null) => {
  if (!sentenceId) return null;
  return (
    blocks.find((block) => block.sentences.some((sentence) => sentence.id === sentenceId)) ??
    null
  );
};

const findSentenceForChunk = (
  sentences: LessonSentence[],
  chunkText: string,
  preferredBlock?: LessonBlock | null,
) => {
  const normalized = chunkText.trim().toLowerCase();
  if (!normalized) return null;
  const candidates = preferredBlock?.sentences.length ? preferredBlock.sentences : sentences;
  return (
    candidates.find((sentence) =>
      collectSentenceChunks(sentence).some((chunk) => chunk.toLowerCase() === normalized),
    ) ??
    sentences.find((sentence) =>
      collectSentenceChunks(sentence).some((chunk) => chunk.toLowerCase() === normalized),
    ) ??
    null
  );
};

const buildAiChunkDetail = ({
  activeText,
  fallback,
  result,
  errorMessage,
}: {
  activeText: string;
  fallback: SelectionChunkLayer;
  result: ExplainSuccessResponse | null;
  errorMessage: string | null;
}): SelectionChunkLayer => {
  if (errorMessage) {
    return {
      ...fallback,
      text: activeText,
      translation: fallback.translation || "AI 解释暂不可用",
      meaningInSentence: errorMessage,
      usageNote: "可以先继续阅读场景,稍后再试一次。",
    };
  }

  const chunk = result?.chunk;
  if (!chunk) return fallback;

  return {
    ...fallback,
    text: chunk.text?.trim() || activeText,
    translation: chunk.translation?.trim() || fallback.translation,
    meaningInSentence: chunk.explanation?.trim() || fallback.meaningInSentence,
    usageNote: chunk.usageNote?.trim() || fallback.usageNote,
  };
};

const errorCodeToTrigger = (code: string | undefined): AnonymousBlockTrigger | null => {
  if (code === "ANON_QUOTA_EXCEEDED_SESSION") return "explain_quota_exhausted";
  if (code === "ANON_QUOTA_EXCEEDED_GLOBAL") return "explain_quota_exhausted";
  if (code === "ANON_FEATURE_DISABLED") return "feature_disabled";
  return null;
};

export function ShareScenePreviewClient({
  initialLesson,
  registerHref,
  showPracticePreview = false,
  backHref,
}: ShareScenePreviewClientProps) {
  const lesson = useMemo(() => withDisplayChunks(initialLesson), [initialLesson]);
  const anonState = useAnonymousMode({ isAuthenticated: false });
  const blocks = useMemo(() => getLessonBlocks(lesson), [lesson]);
  const sentences = useMemo(() => getLessonSentences(lesson), [lesson]);
  const firstSentence = useMemo(() => getFirstSentence(lesson) ?? null, [lesson]);
  const dialogueScene = useMemo(
    () => isDialogueLikeScene(lesson, blocks),
    [blocks, lesson],
  );

  const [activeChunk, setActiveChunk] = useState<{
    text: string;
    sentence: LessonSentence;
  } | null>(null);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(
    () => flattenSentences(initialLesson)[0]?.id ?? null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hoveredChunkKey, setHoveredChunkKey] = useState<string | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainSuccessResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [blockTrigger, setBlockTrigger] = useState<AnonymousBlockTrigger | null>(null);
  const [inlineCardVisible, setInlineCardVisible] = useState(true);
  const [playbackState, setPlaybackState] = useState<SentencePlaybackState>({ kind: "idle" });

  const firstViewReportedRef = useRef(false);
  const promptShownReportedRef = useRef<Record<string, boolean>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const nextFirstSentence = getFirstSentence(lesson) ?? null;
    setActiveSentenceId(nextFirstSentence?.id ?? null);
    setActiveChunk(null);
    setExplainResult(null);
    setExplainError(null);
    setSheetOpen(false);
  }, [lesson.id, lesson]);

  const currentSentence = useMemo(() => {
    if (!activeSentenceId) return firstSentence;
    return getSentenceById(lesson, activeSentenceId) ?? firstSentence;
  }, [activeSentenceId, firstSentence, lesson]);

  const currentBlock = useMemo(
    () => findSentenceBlock(blocks, currentSentence?.id ?? null),
    [blocks, currentSentence?.id],
  );

  const relatedChunks = useMemo(() => {
    if (dialogueScene && currentBlock) {
      return Array.from(
        new Set(currentBlock.sentences.flatMap((sentence) => collectSentenceChunks(sentence))),
      );
    }
    return currentSentence ? collectSentenceChunks(currentSentence) : [];
  }, [currentBlock, currentSentence, dialogueScene]);

  const activeChunkDetail = useMemo<SelectionChunkLayer | null>(() => {
    if (!activeChunk) return null;
    const sentence = getSentenceById(lesson, activeChunk.sentence.id) ?? activeChunk.sentence;
    const fallback = getChunkLayerFromLesson(lesson, sentence, activeChunk.text);
    return buildAiChunkDetail({
      activeText: activeChunk.text,
      fallback,
      result: explainResult,
      errorMessage: explainError,
    });
  }, [activeChunk, explainError, explainResult, lesson]);

  const speakingSentence = useMemo(
    () =>
      playbackState.kind === "playing"
        ? (sentences.find((sentence) => sentence.id === playbackState.sentenceId) ?? null)
        : null,
    [playbackState, sentences],
  );

  const loadingSentence = useMemo(
    () =>
      playbackState.kind === "loading"
        ? (sentences.find((sentence) => sentence.id === playbackState.sentenceId) ?? null)
        : null,
    [playbackState, sentences],
  );

  useEffect(() => {
    if (firstViewReportedRef.current) return;
    firstViewReportedRef.current = true;
    // 确保 localStorage 里有 anonId,后续请求都能带头
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
      surface: "share_scene_inline_card",
    });
  }, [inlineCardVisible]);

  useEffect(() => {
    if (blockTrigger === null) return;
    const key = `L3:${blockTrigger}`;
    if (promptShownReportedRef.current[key]) return;
    promptShownReportedRef.current[key] = true;
    reportAnonymousEvent("anon_register_prompt_shown", {
      prompt_level: "L3",
      trigger: blockTrigger,
    });
  }, [blockTrigger]);

  const totalChunkCount = useMemo(() => {
    const seen = new Set<string>();
    for (const sentence of flattenSentences(lesson)) {
      for (const chunk of collectSentenceChunks(sentence)) {
        seen.add(chunk);
      }
    }
    return seen.size;
  }, [lesson]);

  const explainSnapshot: AnonymousQuotaSnapshot | null =
    anonState.quotaByCapability["explain_selection"] ?? null;

  const handleExplain = useCallback(
    async (chunkText: string, sentence: LessonSentence) => {
      if (!chunkText.trim()) return;
      setExplainLoading(true);
      setExplainError(null);
      setActiveSentenceId(sentence.id);
      setActiveChunk({ text: chunkText, sentence });
      setExplainResult(null);
      setSheetOpen(true);
      // 确保 localStorage 里有 anonId(初次访问时即时生成)
      getOrCreateAnonymousId();
      try {
        const response = await fetch("/api/explain-selection", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...buildAnonymousHeaders(),
          },
          body: JSON.stringify({
            selectedText: chunkText,
            sourceSentence: sentence.text,
            sourceChunks: sentence.chunks ?? [],
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonDifficulty: lesson.difficulty,
          }),
        });
        anonState.syncFromResponse(response);

        if (response.ok) {
          const data = (await response.json()) as ExplainSuccessResponse;
          setExplainResult(data);
          return;
        }

        const body = (await response.json().catch(() => ({}))) as ExplainErrorResponse;
        const trigger = errorCodeToTrigger(body.code);
        if (trigger) {
          setBlockTrigger(trigger);
          setActiveChunk(null);
          return;
        }
        setExplainError(body.message ?? body.error ?? "AI 解释暂时不可用,稍后再试。");
      } catch {
        setExplainError("AI 解释请求失败,请检查网络后重试。");
      } finally {
        setExplainLoading(false);
      }
    },
    [anonState, lesson.difficulty, lesson.id, lesson.title],
  );

  // ---- 句子级 TTS 预生成播放 ----
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

  const handlePlaySentence = useCallback(
    async (sentence: LessonSentence) => {
      // 同一句已在播放 → 切换为停止
      if (playbackState.kind === "playing" && playbackState.sentenceId === sentence.id) {
        stopCurrentAudio();
        setPlaybackState({ kind: "idle" });
        return;
      }

      // 切换到别的句子前先停旧的
      stopCurrentAudio();
      setPlaybackState({ kind: "loading", sentenceId: sentence.id });

      getOrCreateAnonymousId();
      try {
        const url = new URL("/api/anonymous/tts/play", window.location.origin);
        url.searchParams.set("kind", "sentence");
        url.searchParams.set("sceneSlug", lesson.slug);
        url.searchParams.set("sentenceId", sentence.id);
        url.searchParams.set("text", sentence.text);
        if (sentence.speaker) url.searchParams.set("speaker", sentence.speaker);

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { ...buildAnonymousHeaders() },
        });
        anonState.syncFromResponse(response);

        if (response.status === 404) {
          setPlaybackState({ kind: "unavailable", sentenceId: sentence.id });
          return;
        }
        if (response.status === 429) {
          const body = (await response.json().catch(() => ({}))) as ExplainErrorResponse;
          if (
            body.code === "ANON_QUOTA_EXCEEDED_SESSION" ||
            body.code === "ANON_QUOTA_EXCEEDED_GLOBAL"
          ) {
            setBlockTrigger("tts_quota_exhausted");
            setPlaybackState({ kind: "idle" });
            return;
          }
          if (body.code === "ANON_IP_RATE_LIMITED") {
            setBlockTrigger("tts_quota_exhausted");
            setPlaybackState({ kind: "idle" });
            return;
          }
        }
        if (!response.ok) {
          setPlaybackState({ kind: "unavailable", sentenceId: sentence.id });
          return;
        }

        const data = (await response.json()) as TtsPlaybackSuccessResponse;
        if (!data.signedUrl) {
          setPlaybackState({ kind: "unavailable", sentenceId: sentence.id });
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
          setPlaybackState({ kind: "unavailable", sentenceId: sentence.id });
        };
        try {
          await audio.play();
          setPlaybackState({ kind: "playing", sentenceId: sentence.id });
        } catch {
          // 浏览器自动播放策略 / Audio 元素问题
          setPlaybackState({ kind: "unavailable", sentenceId: sentence.id });
        }
      } catch {
        setPlaybackState({ kind: "unavailable", sentenceId: sentence.id });
      }
    },
    [anonState, lesson.slug, playbackState, stopCurrentAudio],
  );

  const handleSentenceTap = useCallback((sentenceId: string) => {
    setActiveSentenceId(sentenceId);
    setActiveChunk(null);
    setExplainResult(null);
    setExplainError(null);
    setSheetOpen(true);
  }, []);

  const handleSelectRelated = useCallback(
    (chunkText: string) => {
      const sentence = findSentenceForChunk(sentences, chunkText, currentBlock);
      if (!sentence) return;
      void handleExplain(chunkText, sentence);
    },
    [currentBlock, handleExplain, sentences],
  );

  const handleBlockedAction = useCallback(() => {
    setBlockTrigger("feature_disabled");
  }, []);

  const handlePronounceCurrentSentence = useCallback(() => {
    if (!currentSentence) return;
    void handlePlaySentence(currentSentence);
  }, [currentSentence, handlePlaySentence]);

  const handleSentenceChunkSelect = useCallback(
    (sentence: LessonSentence, chunkText: string) => {
      void handleExplain(chunkText, sentence);
    },
    [handleExplain],
  );

  const sceneMetaLabel = `${lesson.difficulty} · ${lesson.estimatedMinutes} 分钟 · ${
    dialogueScene ? `${sentences.length} 轮对话` : `${sentences.length} 句`
  }`;

  return (
    <div className="flex w-full flex-col bg-[#f8fafc]" data-testid="share-scene-preview">
      <AnonymousTopbarBanner
        isAnonymous
        primaryCapability="explain_selection"
        quotaByCapability={anonState.quotaByCapability}
        registerHref={registerHref}
        className="sticky top-0 z-30"
        onRegisterClick={() => reportRegisterClicked("L1", { surface: "share_scene_topbar" })}
      />

      <main className={SCENE_PAGE_STACK_CLASSNAME}>
        <div className={SCENE_PAGE_CONTENT_ANCHOR_CLASSNAME}>
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <div className="space-y-[var(--mobile-space-2xl)] overflow-x-hidden">
              <Card className={APPLE_SURFACE}>
                <CardContent className="space-y-4 p-5 sm:p-6">
                  {backHref ? (
                    <Link
                      href={backHref}
                      className={`inline-flex text-xs font-medium transition hover:text-foreground ${APPLE_META_TEXT}`}
                    >
                      ← 返回试用场景
                    </Link>
                  ) : null}
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold sm:text-4xl">{lesson.title}</h1>
                    {lesson.subtitle ? (
                      <p className={`max-w-2xl sm:text-base ${APPLE_META_TEXT}`}>
                        {lesson.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <p className={APPLE_META_TEXT}>{sceneMetaLabel}</p>
                  <p className={`text-xs ${APPLE_META_TEXT}`}>
                    体验模式 · 可听读和查看短语详情,学习记录不会保存。
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-[var(--mobile-space-2xl)]">
                {lesson.sections.map((section) => (
                  <section key={section.id} className="space-y-3">
                    {section.title || section.summary ? (
                      <div className="space-y-1 px-1">
                        {section.title ? (
                          <h2 className="text-xl font-semibold">{section.title}</h2>
                        ) : null}
                        {section.summary ? (
                          <p className={APPLE_META_TEXT}>{section.summary}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="space-y-3">
                      {section.blocks.map((block) => (
                        <div key={block.id} className="space-y-2">
                          {block.sentences.map((sentence) => (
                            <SentenceBlock
                              key={sentence.id}
                              sentence={sentence}
                              showSpeaker={dialogueScene}
                              speaking={
                                playbackState.kind === "playing" &&
                                playbackState.sentenceId === sentence.id
                              }
                              loading={
                                playbackState.kind === "loading" &&
                                playbackState.sentenceId === sentence.id
                              }
                              activeChunkKey={
                                activeChunk?.sentence.id === sentence.id
                                  ? activeChunk.text
                                  : null
                              }
                              hoveredChunkKey={hoveredChunkKey}
                              onPronounce={() => handlePlaySentence(sentence)}
                              onSelectText={(chunkText) =>
                                handleSentenceChunkSelect(sentence, chunkText)
                              }
                              onHoverChunk={setHoveredChunkKey}
                              onSentenceTap={handleSentenceTap}
                              mobileTapEnabled
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {showPracticePreview ? (
                <AnonymousPracticePreview
                  lesson={lesson}
                  registerHref={registerHref}
                  onBlocked={handleBlockedAction}
                />
              ) : null}

              <AnonymousInlineUpsellCard
                isAnonymous
                visible={inlineCardVisible}
                onDismiss={() => setInlineCardVisible(false)}
                expressionCount={totalChunkCount}
                registerHref={registerHref}
                className="mt-8"
                onRegisterClick={() =>
                  reportRegisterClicked("L2", { surface: "share_scene_inline_card" })
                }
              />
            </div>

            <SelectionDetailPanel
              currentBlock={dialogueScene ? currentBlock : null}
              currentSentence={currentSentence}
              chunkDetail={activeChunkDetail}
              relatedChunks={relatedChunks}
              loading={explainLoading}
              speakingText={speakingSentence?.text ?? null}
              loadingText={loadingSentence?.text ?? null}
              onSave={handleBlockedAction}
              onReview={handleBlockedAction}
              saved={false}
              onPronounce={handleBlockedAction}
              onPronounceBlock={handlePronounceCurrentSentence}
              onSelectRelated={handleSelectRelated}
              hoveredChunkKey={hoveredChunkKey}
              onHoverChunk={setHoveredChunkKey}
              playingChunkKey={null}
              loadingChunkKey={null}
              showSpeaker={dialogueScene}
              sentenceSectionLabel={dialogueScene ? "当前对话块" : "当前句子"}
              showRelatedChunkAudio={false}
            />
          </div>
        </div>
      </main>

      <SelectionDetailSheet
        currentBlock={dialogueScene ? currentBlock : null}
        currentSentence={currentSentence}
        chunkDetail={activeChunkDetail}
        relatedChunks={relatedChunks}
        open={sheetOpen}
        loading={explainLoading}
        speakingText={speakingSentence?.text ?? null}
        loadingText={loadingSentence?.text ?? null}
        onOpenChange={setSheetOpen}
        onSave={handleBlockedAction}
        onReview={handleBlockedAction}
        saved={false}
        onPronounce={handleBlockedAction}
        onPronounceBlock={handlePronounceCurrentSentence}
        onSelectRelated={handleSelectRelated}
        hoveredChunkKey={hoveredChunkKey}
        onHoverChunk={setHoveredChunkKey}
        playingChunkKey={null}
        loadingChunkKey={null}
        showSpeaker={dialogueScene}
        sentenceSectionLabel={dialogueScene ? "当前对话块" : "当前句子"}
        showRelatedChunkAudio={false}
      />

      {explainSnapshot && explainSnapshot.sessionLimit !== null ? (
        <p
          data-testid="share-scene-explain-quota-line"
          className="sr-only"
        >
          体验模式剩 {explainSnapshot.sessionRemaining ?? 0}/{explainSnapshot.sessionLimit} 次
        </p>
      ) : null}

      <AnonymousBlockModal
        isAnonymous
        visible={blockTrigger !== null}
        trigger={blockTrigger ?? "feature_disabled"}
        onDismiss={() => setBlockTrigger(null)}
        registerHref={registerHref}
        onRegisterClick={() =>
          reportRegisterClicked("L3", { trigger: blockTrigger ?? "feature_disabled" })
        }
      />
    </div>
  );
}

type TrialPracticeExercise = {
  id: string;
  prompt: string;
  answer: string;
  hint: string;
};

const normalizePracticeAnswer = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"’]/g, "")
    .replace(/\s+/g, " ");

const buildTrialPracticeExercises = (lesson: Lesson): TrialPracticeExercise[] => {
  const exercises: TrialPracticeExercise[] = [];
  for (const sentence of flattenSentences(lesson)) {
    const detail = sentence.chunkDetails?.find((item) => item.text.trim());
    const chunkText = detail?.text?.trim() || sentence.chunks?.find((item) => item.trim())?.trim();
    if (!chunkText) continue;
    const displayText = sentence.text.replace(chunkText, "____");
    exercises.push({
      id: `${sentence.id}:${chunkText}`,
      prompt: displayText === sentence.text ? sentence.translation : displayText,
      answer: chunkText,
      hint: sentence.translation || detail?.translation || "根据语境补出表达",
    });
    if (exercises.length >= 3) break;
  }
  return exercises;
};

function AnonymousPracticePreview({
  lesson,
  registerHref,
  onBlocked,
}: {
  lesson: Lesson;
  registerHref: string;
  onBlocked: () => void;
}) {
  const exercises = useMemo(() => buildTrialPracticeExercises(lesson), [lesson]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (exercises.length === 0) {
    return (
      <section className="mt-8 rounded-lg border border-dashed border-border bg-card/70 p-4">
        <p className="text-sm font-medium text-foreground">练习题将在注册后生成</p>
        <p className="mt-1 text-sm leading-6 text-foreground/65">
          这个场景暂时没有预生成练习题。注册后可以为自己的学习进度生成更多练习。
        </p>
        <Button asChild className="mt-4" radius="sm" size="sm">
          <Link href={registerHref}>注册后练习</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-lg border border-border/60 bg-card/80 p-4">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">预生成练习题</p>
        <p className="text-xs leading-5 text-foreground/55">
          可以本地作答和查看答案,但体验模式不会提交或保存结果。
        </p>
      </div>
      <div className="space-y-3">
        {exercises.map((exercise, index) => {
          const currentAnswer = answers[exercise.id] ?? "";
          const hasChecked = checked[exercise.id] ?? false;
          const isCorrect =
            normalizePracticeAnswer(currentAnswer) ===
            normalizePracticeAnswer(exercise.answer);
          return (
            <div
              key={exercise.id}
              className="rounded-lg border border-border/50 bg-background/60 p-3"
            >
              <p className="text-xs text-foreground/55">第 {index + 1} 题</p>
              <p className="mt-1 text-sm leading-6 text-foreground">{exercise.prompt}</p>
              <p className="mt-1 text-xs text-foreground/50">{exercise.hint}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={currentAnswer}
                  onChange={(event) => {
                    setAnswers((prev) => ({
                      ...prev,
                      [exercise.id]: event.target.value,
                    }));
                    setChecked((prev) => ({
                      ...prev,
                      [exercise.id]: false,
                    }));
                  }}
                  className="min-h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground/35"
                  placeholder="输入缺失表达"
                />
                <Button
                  type="button"
                  variant="outline"
                  radius="sm"
                  size="sm"
                  onClick={() =>
                    setChecked((prev) => ({
                      ...prev,
                      [exercise.id]: true,
                    }))
                  }
                >
                  查看本地反馈
                </Button>
              </div>
              {hasChecked ? (
                <p
                  className={cn(
                    "mt-2 text-xs",
                    isCorrect ? "text-emerald-600" : "text-foreground/60",
                  )}
                >
                  {isCorrect
                    ? "答对了。这个结果只保存在当前页面。"
                    : `参考答案: ${exercise.answer}`}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-foreground/55">
          提交记录、错题复习和加入复习需要注册账号。
        </p>
        <Button type="button" radius="sm" size="sm" onClick={onBlocked}>
          提交并保存
        </Button>
      </div>
    </section>
  );
}
