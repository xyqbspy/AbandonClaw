import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTtsPlaybackState } from "@/hooks/use-tts-playback-state";
import { getChunkLayerFromLesson } from "@/lib/data/mock-lessons";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { getLessonSentences } from "@/lib/shared/lesson-content";
import { Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { VariantSet } from "@/lib/types/learning-flow";
import {
  playChunkAudio,
  playSentenceAudio,
  prefetchChunkAudio,
  prefetchSentenceAudio,
  setTtsLooping,
  stopTtsPlayback,
} from "@/lib/utils/tts-api";

import { findChunkContext } from "./scene-detail-logic";

type UseSceneDetailPlaybackArgs = {
  sceneSlug: string;
  viewMode: string;
  baseLesson: Lesson | null;
  activeVariantLesson: Lesson | null;
  latestVariantSet: VariantSet | null;
};

export function useSceneDetailPlayback({
  sceneSlug,
  viewMode,
  baseLesson,
  activeVariantLesson,
  latestVariantSet,
}: UseSceneDetailPlaybackArgs) {
  const [variantChunkModalOpen, setVariantChunkModalOpen] = useState(false);
  const [variantChunkDetail, setVariantChunkDetail] =
    useState<SelectionChunkLayer | null>(null);
  const [variantChunkSentence, setVariantChunkSentence] =
    useState<LessonSentence | null>(null);
  const [variantChunkRelatedChunks, setVariantChunkRelatedChunks] = useState<string[]>([]);
  const [variantChunkHoveredKey, setVariantChunkHoveredKey] = useState<string | null>(null);
  const playbackState = useTtsPlaybackState();
  const effectiveSpeakingText = playbackState.text ?? null;

  const stopGeneratedAudio = useCallback(() => {
    stopTtsPlayback();
    setTtsLooping(false);
  }, []);

  useEffect(
    () => () => {
      stopGeneratedAudio();
    },
    [stopGeneratedAudio],
  );

  useEffect(() => {
    const warmupLesson = viewMode === "variant-study" ? activeVariantLesson : baseLesson;
    if (!warmupLesson) return;

    const timer = window.setTimeout(() => {
      const sentences = getLessonSentences(warmupLesson).slice(0, 2);
      for (const sentence of sentences) {
        const text = (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim();
        if (!text) continue;
        void prefetchSentenceAudio({
          sceneSlug: warmupLesson.slug,
          sentenceId: sentence.id,
          text,
          speaker: sentence.speaker,
          mode: "normal",
        });
      }

      const firstSentence = sentences[0];
      for (const chunkText of firstSentence?.chunks.slice(0, 2) ?? []) {
        const clean = chunkText.trim();
        if (!clean) continue;
        void prefetchChunkAudio({
          chunkText: clean,
          chunkKey: buildChunkAudioKey(clean),
        });
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeVariantLesson, baseLesson, viewMode]);

  useEffect(() => {
    if (!variantChunkModalOpen || !variantChunkSentence) return;

    const sentenceText =
      (variantChunkSentence.tts?.trim() ||
        variantChunkSentence.audioText?.trim() ||
        variantChunkSentence.text).trim();
    if (sentenceText) {
      void prefetchSentenceAudio({
        sceneSlug: (baseLesson?.slug ?? sceneSlug).trim() || "scene",
        sentenceId: variantChunkSentence.id,
        text: sentenceText,
        speaker: variantChunkSentence.speaker,
        mode: "normal",
      });
    }

    const chunkText = variantChunkDetail?.text?.trim();
    if (!chunkText) return;
    void prefetchChunkAudio({
      chunkText,
      chunkKey: buildChunkAudioKey(chunkText),
    });
  }, [baseLesson, sceneSlug, variantChunkDetail, variantChunkModalOpen, variantChunkSentence]);

  const handlePronounce = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      if (effectiveSpeakingText === clean) {
        stopGeneratedAudio();
        return;
      }

      const sentence = variantChunkSentence;
      const selectedChunkText = variantChunkDetail?.text?.trim();
      if (selectedChunkText && clean.toLowerCase() === selectedChunkText.toLowerCase()) {
        if (playbackState.kind === "chunk" && playbackState.chunkKey === buildChunkAudioKey(clean)) {
          stopGeneratedAudio();
          return;
        }
        void (async () => {
          stopTtsPlayback();
          setTtsLooping(false);
          try {
            await playChunkAudio({
              chunkText: clean,
              chunkKey: buildChunkAudioKey(clean),
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
          }
        })();
        return;
      }

      if (sentence && clean === sentence.text.trim()) {
        if (
          playbackState.kind === "sentence" &&
          playbackState.sentenceId === sentence.id &&
          (playbackState.mode ?? "normal") === "normal"
        ) {
          stopGeneratedAudio();
          return;
        }
        void (async () => {
          stopTtsPlayback();
          setTtsLooping(false);
          try {
            await playSentenceAudio({
              sceneSlug: (baseLesson?.slug ?? sceneSlug).trim() || "scene",
              sentenceId: sentence.id,
              text: clean,
              mode: "normal",
              speaker: sentence.speaker,
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
          }
        })();
        return;
      }

      void (async () => {
        stopTtsPlayback();
        setTtsLooping(false);
        try {
          await playChunkAudio({
            chunkText: clean,
            chunkKey: buildChunkAudioKey(clean),
          });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
        }
      })();
    },
    [
      baseLesson,
      effectiveSpeakingText,
      playbackState.chunkKey,
      playbackState.kind,
      playbackState.mode,
      playbackState.sentenceId,
      sceneSlug,
      stopGeneratedAudio,
      variantChunkDetail,
      variantChunkSentence,
    ],
  );

  const handleLoopSentence = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      if (effectiveSpeakingText === clean) {
        stopGeneratedAudio();
        return;
      }
      void (async () => {
        stopTtsPlayback();
        setTtsLooping(true);
        try {
          await playChunkAudio({
            chunkText: clean,
            chunkKey: buildChunkAudioKey(clean),
          });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
        } finally {
          setTtsLooping(false);
        }
      })();
    },
    [effectiveSpeakingText, stopGeneratedAudio],
  );

  const openChunkDetail = useCallback(
    (chunk: string, relatedChunks: string[]) => {
      if (!baseLesson) return;
      const variantLessons = latestVariantSet?.variants.map((item) => item.lesson) ?? [];
      const context = findChunkContext(chunk, baseLesson, variantLessons);
      if (!context) return;
      const detail = getChunkLayerFromLesson(context.lesson, context.sentence, chunk);
      setVariantChunkSentence(context.sentence);
      setVariantChunkDetail(detail);
      setVariantChunkRelatedChunks(relatedChunks);
      setVariantChunkModalOpen(true);
    },
    [baseLesson, latestVariantSet],
  );

  const handleOpenVariantChunk = useCallback(
    (chunk: string) => {
      openChunkDetail(chunk, latestVariantSet?.reusedChunks ?? []);
    },
    [latestVariantSet, openChunkDetail],
  );

  const handleOpenExpressionDetail = useCallback(
    (expression: string, relatedChunks: string[]) => {
      openChunkDetail(expression, relatedChunks);
    },
    [openChunkDetail],
  );

  const resetChunkDetailState = useCallback(() => {
    setVariantChunkModalOpen(false);
    setVariantChunkDetail(null);
    setVariantChunkSentence(null);
    setVariantChunkRelatedChunks([]);
    setVariantChunkHoveredKey(null);
  }, []);

  return {
    playbackState,
    effectiveSpeakingText,
    variantChunkModalOpen,
    setVariantChunkModalOpen,
    variantChunkDetail,
    variantChunkSentence,
    variantChunkRelatedChunks,
    variantChunkHoveredKey,
    setVariantChunkHoveredKey,
    handlePronounce,
    handleLoopSentence,
    handleOpenVariantChunk,
    handleOpenExpressionDetail,
    resetChunkDetailState,
  };
}
