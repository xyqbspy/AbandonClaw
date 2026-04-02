"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTtsPlaybackController } from "@/hooks/use-tts-playback-controller";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import type { Lesson, LessonBlock, LessonSentence } from "@/lib/types";
import { getSentenceSpeakText } from "@/lib/utils/audio-warmup";
import { scheduleLessonAudioWarmup } from "@/lib/utils/resource-actions";

export function useLessonReaderPlayback({
  lesson,
  blockOrder,
  sentenceOrder,
  firstSentence,
  activeSentenceId,
  onSceneLoopPlayback,
}: {
  lesson: Lesson;
  blockOrder: LessonBlock[];
  sentenceOrder: LessonSentence[];
  firstSentence: LessonSentence | null;
  activeSentenceId: string | null;
  onSceneLoopPlayback?: (payload: { lesson: Lesson }) => void;
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

  const stopAudio = useCallback(() => {
    sentenceLoopRef.current = null;
    stop();
  }, [stop]);

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
      if (playbackController.isSentenceActive(blockPlaybackId, "normal")) {
        stopAudio();
        return;
      }

      sentenceLoopRef.current = null;
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
    [lesson.slug, playbackController, stopAudio],
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
    [lesson.slug, playbackController, sentenceOrder, speakingText, stopAudio],
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
        toast.error(error instanceof Error ? error.message : "完整场景音频暂不可用");
      },
    });
  }, [blockOrder, isSceneLooping, lesson, onSceneLoopPlayback, playbackController, stopAudio]);

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
