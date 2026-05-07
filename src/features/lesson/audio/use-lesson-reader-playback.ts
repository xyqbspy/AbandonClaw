"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTtsPlaybackController } from "@/hooks/use-tts-playback-controller";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import type { Lesson, LessonBlock, LessonSentence } from "@/lib/types";
import { getBlockSpeakText, getSentenceSpeakText } from "@/lib/utils/audio-warmup";
import {
  recordClientEvent,
  recordClientFailureSummary,
} from "@/lib/utils/client-events";
import { scheduleLessonAudioWarmup } from "@/lib/utils/resource-actions";
import { getSceneFullFailureReasonFromError } from "@/lib/utils/tts-api";

export function useLessonReaderPlayback({
  lesson,
  blockOrder,
  sentenceOrder,
  firstSentence,
  activeSentenceId,
  onSceneLoopPlayback,
  onBlockPlayback,
  onSentencePlayback,
}: {
  lesson: Lesson;
  blockOrder: LessonBlock[];
  sentenceOrder: LessonSentence[];
  firstSentence: LessonSentence | null;
  activeSentenceId: string | null;
  onSceneLoopPlayback?: (payload: { lesson: Lesson }) => void;
  onBlockPlayback?: (payload: { lesson: Lesson; block: LessonBlock }) => void;
  onSentencePlayback?: (payload: { lesson: Lesson; sentence: LessonSentence }) => void;
}) {
  const sentenceLoopRef = useRef<string | null>(null);
  const playbackController = useTtsPlaybackController();
  const { playbackState, speakingText, loadingText, stop } = playbackController;

  const isSceneLooping = playbackController.isSceneLooping(lesson.slug);
  const isSceneLoopLoading = playbackController.isSceneLoopLoading(lesson.slug);
  const loadingChunkKey =
    playbackState.kind === "chunk" && playbackState.status === "loading" && loadingText
      ? loadingText
      : null;

  const isSentencePlaying = useCallback(
    (sentenceId: string, mode?: "normal" | "slow") =>
      playbackController.isSentenceActive(sentenceId, mode),
    [playbackController],
  );
  const isSentenceLoading = useCallback(
    (sentenceId: string, mode?: "normal" | "slow") =>
      playbackController.isSentenceLoading(sentenceId, mode),
    [playbackController],
  );
  const isChunkLoading = useCallback(
    (text: string) => playbackController.isChunkLoading(text),
    [playbackController],
  );
  const playFallbackSentence = useCallback(
    (sentence: LessonSentence | null) => {
      if (!sentence) return;
      void playbackController.toggleSentencePlayback({
        sceneSlug: lesson.slug,
        sentenceId: sentence.id,
        text: getSentenceSpeakText(sentence),
        mode: "normal",
        speaker: sentence.speaker,
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "发音失败，请稍后重试");
        },
      });
    },
    [lesson.slug, playbackController],
  );

  const stopAudio = useCallback(() => {
    sentenceLoopRef.current = null;
    stop();
  }, [stop]);

  const playBlockTts = useCallback(
    async (block: LessonBlock) => {
      const blockReadText = getBlockSpeakText(block);
      if (!blockReadText) return;

      const blockPlaybackId = `block-${block.id}`;
      if (playbackController.isSentenceActive(blockPlaybackId, "normal")) {
        stopAudio();
        return;
      }

      sentenceLoopRef.current = null;
      onBlockPlayback?.({ lesson, block });
      await playbackController.toggleSentencePlayback({
        sceneSlug: lesson.slug,
        sentenceId: blockPlaybackId,
        text: blockReadText,
        mode: "normal",
        speaker: block.speaker,
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "发音失败，请稍后重试");
        },
      });
    },
    [lesson, onBlockPlayback, playbackController, stopAudio],
  );

  useEffect(
    () => () => {
      stopAudio();
    },
    [stopAudio],
  );

  useEffect(() => {
    const anchorSentence =
      (activeSentenceId
        ? sentenceOrder.find((item) => item.id === activeSentenceId)
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
  }, [activeSentenceId, firstSentence, lesson, sentenceOrder]);

  const handlePronounce = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      if (speakingText === clean) {
        stopAudio();
        return;
      }
      const sentence = sentenceOrder.find((item) => item.text.trim() === clean);
      if (sentence) {
        onSentencePlayback?.({ lesson, sentence });
        void playbackController.toggleSentencePlayback({
          sceneSlug: lesson.slug,
          sentenceId: sentence.id,
          text: getSentenceSpeakText(sentence),
          mode: "normal",
          speaker: sentence.speaker,
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : "发音失败，请稍后重试");
          },
        });
        return;
      }

      void playbackController.toggleChunkPlayback({
        chunkText: clean,
        chunkKey: buildChunkAudioKey(clean),
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "发音失败，请稍后重试");
        },
      });
    },
    [lesson, onSentencePlayback, playbackController, sentenceOrder, speakingText, stopAudio],
  );

  const handleLoopSentence = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      if (sentenceLoopRef.current === clean && speakingText === clean) {
        sentenceLoopRef.current = null;
        stopAudio();
        return;
      }

      sentenceLoopRef.current = clean;
      void playbackController.toggleRepeatingChunkLoop({
        chunkText: clean,
        chunkKey: buildChunkAudioKey(clean),
        intervalMs: 80,
        onError: (error) => {
          sentenceLoopRef.current = null;
          toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
        },
      });
    },
    [playbackController, speakingText, stopAudio],
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

    void playbackController.toggleSceneLoopPlayback({
      sceneSlug: lesson.slug,
      sceneType: lesson.sceneType ?? "monologue",
      segments,
      onBeforePlay: () => {
        onSceneLoopPlayback?.({ lesson });
      },
      onError: (error) => {
        const fallbackBlock =
          (activeSentenceId
            ? blockOrder.find((block) =>
                block.sentences.some((sentence) => sentence.id === activeSentenceId),
              ) ?? null
            : null) ?? blockOrder[0] ?? null;
        const fallbackSentence =
          (activeSentenceId
            ? sentenceOrder.find((sentence) => sentence.id === activeSentenceId) ?? null
            : null) ??
          fallbackBlock?.sentences[0] ??
          firstSentence;
        const message = error instanceof Error ? error.message : "完整场景音频暂不可用";
        const failureReason = getSceneFullFailureReasonFromError(error);
        recordClientFailureSummary("tts_scene_loop_failed", {
          sceneSlug: lesson.slug,
          activeSentenceId,
          fallbackBlockId: fallbackBlock?.id ?? null,
          fallbackSentenceId: fallbackSentence?.id ?? null,
          failureReason,
          message,
        });
        toast.error(message, {
          description: fallbackSentence ? "可先切回逐句跟读，保持当前训练节奏。" : undefined,
          action: fallbackBlock
            ? {
                label: "继续当前段落",
                onClick: () => {
                  recordClientEvent("tts_scene_loop_fallback_clicked", {
                    sceneSlug: lesson.slug,
                    blockId: fallbackBlock.id,
                    sentenceId: fallbackSentence?.id ?? null,
                    failureReason,
                  });
                  void playBlockTts(fallbackBlock);
                },
              }
            : fallbackSentence
            ? {
                label: "改为逐句跟读",
                onClick: () => {
                  recordClientEvent("tts_scene_loop_fallback_clicked", {
                    sceneSlug: lesson.slug,
                    sentenceId: fallbackSentence.id,
                    failureReason,
                  });
                  playFallbackSentence(fallbackSentence);
                },
              }
            : undefined,
        });
      },
    });
  }, [
    activeSentenceId,
    blockOrder,
    firstSentence,
    isSceneLooping,
    lesson,
    onSceneLoopPlayback,
    playbackController,
    playBlockTts,
    playFallbackSentence,
    sentenceOrder,
    stopAudio,
  ]);

  return {
    playbackState,
    loadingChunkKey,
    speakingText,
    loadingText,
    isSceneLooping,
    isSceneLoopLoading,
    isSentencePlaying,
    isSentenceLoading,
    isChunkLoading,
    stopAudio,
    playBlockTts,
    handlePronounce,
    handleLoopSentence,
    toggleSceneLoopPlayback,
  };
}
