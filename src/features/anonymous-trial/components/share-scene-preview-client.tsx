"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Lesson, LessonSentence } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  const lesson = initialLesson;
  const anonState = useAnonymousMode({ isAuthenticated: false });

  const [activeChunk, setActiveChunk] = useState<{
    text: string;
    sentence: LessonSentence;
  } | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainSuccessResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [blockTrigger, setBlockTrigger] = useState<AnonymousBlockTrigger | null>(null);
  const [inlineCardVisible, setInlineCardVisible] = useState(true);

  const firstViewReportedRef = useRef(false);
  const promptShownReportedRef = useRef<Record<string, boolean>>({});

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
      setActiveChunk({ text: chunkText, sentence });
      setExplainResult(null);
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

  const handleCloseSheet = useCallback(() => {
    setActiveChunk(null);
    setExplainResult(null);
    setExplainError(null);
  }, []);

  // ---- 句子级 TTS 预生成播放 ----
  const [playbackState, setPlaybackState] = useState<SentencePlaybackState>({ kind: "idle" });
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  return (
    <div className="flex w-full flex-col" data-testid="share-scene-preview">
      <AnonymousTopbarBanner
        isAnonymous
        primaryCapability="explain_selection"
        quotaByCapability={anonState.quotaByCapability}
        registerHref={registerHref}
        onRegisterClick={() => reportRegisterClicked("L1", { surface: "share_scene_topbar" })}
      />

      <article className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <header className="mb-6 space-y-1">
          {backHref ? (
            <Link
              href={backHref}
              className="mb-3 inline-flex text-xs font-medium text-foreground/55 transition hover:text-foreground"
            >
              ← 返回试用场景
            </Link>
          ) : null}
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            {lesson.title}
          </h1>
          {lesson.subtitle ? (
            <p className="text-base text-foreground/70">{lesson.subtitle}</p>
          ) : null}
          <p className="text-xs text-foreground/55">
            体验模式 · 仅展示场景内容,所有学习态不会保存
          </p>
        </header>

        <div className="space-y-5">
          {lesson.sections.map((section) => (
            <section key={section.id} className="space-y-4">
              {section.title ? (
                <h2 className="text-sm font-medium text-foreground/65">{section.title}</h2>
              ) : null}
              {section.blocks.map((block) => (
                <div key={block.id} className="space-y-3">
                  {block.sentences.map((sentence) => (
                    <SentenceCard
                      key={sentence.id}
                      sentence={sentence}
                      onExplain={(chunkText) => handleExplain(chunkText, sentence)}
                      onPlay={() => handlePlaySentence(sentence)}
                      playbackState={
                        playbackState.kind !== "idle" &&
                        playbackState.sentenceId === sentence.id
                          ? playbackState.kind
                          : "idle"
                      }
                    />
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>

        {showPracticePreview ? (
          <AnonymousPracticePreview
            lesson={lesson}
            registerHref={registerHref}
            onBlocked={() => setBlockTrigger("feature_disabled")}
          />
        ) : null}

        <div className="mt-8">
          <AnonymousInlineUpsellCard
            isAnonymous
            visible={inlineCardVisible}
            onDismiss={() => setInlineCardVisible(false)}
            expressionCount={totalChunkCount}
            registerHref={registerHref}
            onRegisterClick={() =>
              reportRegisterClicked("L2", { surface: "share_scene_inline_card" })
            }
          />
        </div>
      </article>

      <ExplainResultSheet
        open={activeChunk !== null}
        chunk={activeChunk}
        loading={explainLoading}
        result={explainResult}
        errorMessage={explainError}
        registerHref={registerHref}
        quotaSnapshot={explainSnapshot}
        onClose={handleCloseSheet}
        onRegisterClick={() =>
          reportRegisterClicked("L2", { surface: "share_scene_explain_sheet" })
        }
      />

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

function SentenceCard({
  sentence,
  onExplain,
  onPlay,
  playbackState,
}: {
  sentence: LessonSentence;
  onExplain: (chunkText: string) => void;
  onPlay: () => void;
  playbackState: "idle" | "loading" | "playing" | "unavailable";
}) {
  const chunks = useMemo(() => collectSentenceChunks(sentence), [sentence]);
  const playButtonLabel =
    playbackState === "loading"
      ? "加载中"
      : playbackState === "playing"
        ? "停止"
        : playbackState === "unavailable"
          ? "音频暂时不可用"
          : "听一遍";
  return (
    <Card size="sm" className="border border-border/50 bg-card/80">
      <CardContent className="space-y-2 px-4 pb-4 text-sm leading-6">
        {sentence.speaker ? (
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
            {sentence.speaker}
          </p>
        ) : null}
        <p className="text-foreground">{sentence.text}</p>
        {sentence.translation ? (
          <p className="text-foreground/65">{sentence.translation}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            variant={playbackState === "playing" ? "default" : "outline"}
            radius="sm"
            data-testid="share-scene-play-sentence"
            data-playback-state={playbackState}
            onClick={onPlay}
            disabled={playbackState === "loading" || playbackState === "unavailable"}
            className="h-7 px-2 text-xs"
          >
            ▶ {playButtonLabel}
          </Button>
          {chunks.map((chunk) => (
            <Button
              key={chunk}
              size="sm"
              variant="outline"
              radius="sm"
              data-testid="share-scene-explain-chunk"
              onClick={() => onExplain(chunk)}
              className="h-7 px-2 text-xs"
            >
              解释 · {chunk}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ExplainResultSheet({
  open,
  chunk,
  loading,
  result,
  errorMessage,
  registerHref,
  quotaSnapshot,
  onClose,
  onRegisterClick,
}: {
  open: boolean;
  chunk: { text: string; sentence: LessonSentence } | null;
  loading: boolean;
  result: ExplainSuccessResponse | null;
  errorMessage: string | null;
  registerHref: string;
  quotaSnapshot: AnonymousQuotaSnapshot | null;
  onClose: () => void;
  onRegisterClick?: () => void;
}) {
  if (!open || !chunk) return null;
  return (
    <div
      data-testid="share-scene-explain-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        data-testid="share-scene-explain-sheet"
        className={cn(
          "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl ring-1 ring-foreground/10",
          "sm:rounded-2xl",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-foreground/55">来自</p>
            <p className="mt-0.5 text-sm text-foreground/85">{chunk.sentence.text}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            radius="sm"
            onClick={onClose}
            data-testid="share-scene-explain-close"
          >
            关
          </Button>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-foreground">{chunk.text}</h3>

        <div className="mt-3 space-y-3 text-sm leading-6">
          {loading ? (
            <p
              data-testid="share-scene-explain-loading"
              className="text-foreground/65"
            >
              AI 正在生成解释…
            </p>
          ) : errorMessage ? (
            <p
              data-testid="share-scene-explain-error"
              className="text-destructive"
            >
              {errorMessage}
            </p>
          ) : result?.chunk ? (
            <div className="space-y-2 text-foreground/85">
              {result.chunk.translation ? (
                <p>
                  <span className="text-foreground/55">中文意思:</span> {result.chunk.translation}
                </p>
              ) : null}
              {result.chunk.explanation ? (
                <p>
                  <span className="text-foreground/55">用法说明:</span> {result.chunk.explanation}
                </p>
              ) : null}
              {result.chunk.usageNote ? (
                <p>
                  <span className="text-foreground/55">使用提醒:</span> {result.chunk.usageNote}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {quotaSnapshot && quotaSnapshot.sessionLimit !== null ? (
          <p
            data-testid="share-scene-explain-quota-line"
            className="mt-4 text-xs text-foreground/55"
          >
            体验模式剩 {quotaSnapshot.sessionRemaining ?? 0}/{quotaSnapshot.sessionLimit} 次
          </p>
        ) : null}

        <div className="mt-5 flex flex-row items-center justify-end gap-2">
          <Button variant="ghost" size="sm" radius="sm" onClick={onClose}>
            继续读
          </Button>
          <Button asChild size="sm" radius="sm">
            <Link
              href={registerHref}
              data-testid="share-scene-explain-register"
              onClick={onRegisterClick}
            >
              注册保存到表达库
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
