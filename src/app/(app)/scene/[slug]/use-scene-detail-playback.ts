import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTtsPlaybackController } from "@/hooks/use-tts-playback-controller";
import { getChunkLayerFromLesson } from "@/lib/data/mock-lessons";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { getLessonSentences } from "@/lib/shared/lesson-content";
import { Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { VariantSet } from "@/lib/types/learning-flow";
import { trackChunksFromApi } from "@/lib/utils/chunks-api";
import {
  getSentenceSpeakText,
  promoteLessonPlaybackAudioWarmups,
} from "@/lib/utils/audio-warmup";
import {
  SCENE_IDLE_WARMUP_BATCH_SIZE,
  cancelSceneIdleAudioWarmup,
  scheduleChunkAudioWarmup,
  scheduleLessonAudioWarmup,
  scheduleSceneIdleAudioWarmup,
} from "@/lib/utils/resource-actions";

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
  const [trackedChunkKeys, setTrackedChunkKeys] = useState<Record<string, true>>({});
  const playbackWarmupRef = useRef<{
    lessonSlug: string | null;
    lastSentenceIndex: number | null;
    consecutiveCount: number;
  }>({
    lessonSlug: null,
    lastSentenceIndex: null,
    consecutiveCount: 0,
  });
  const playbackController = useTtsPlaybackController();
  const { playbackState, speakingText: effectiveSpeakingText, stop } = playbackController;

  const stopGeneratedAudio = useCallback(() => {
    stop();
  }, [stop]);

  useEffect(
    () => () => {
      stopGeneratedAudio();
    },
    [stopGeneratedAudio],
  );

  const handleSentencePlaybackWarmup = useCallback(
    ({ lesson, sentence }: { lesson: Lesson; sentence: LessonSentence }) => {
      const sentences = getLessonSentences(lesson);
      const sentenceIndex = sentences.findIndex((item) => item.id === sentence.id);
      const previous = playbackWarmupRef.current;
      const isSameLesson = previous.lessonSlug === lesson.slug;
      const isConsecutive =
        isSameLesson &&
        previous.lastSentenceIndex !== null &&
        sentenceIndex === previous.lastSentenceIndex + 1;
      const consecutiveCount = isConsecutive ? previous.consecutiveCount + 1 : 1;
      playbackWarmupRef.current = {
        lessonSlug: lesson.slug,
        lastSentenceIndex: sentenceIndex >= 0 ? sentenceIndex : null,
        consecutiveCount,
      };

      promoteLessonPlaybackAudioWarmups(lesson, sentence.id, {
        lookaheadCount: 3,
        includeSceneFull: consecutiveCount >= 2,
      });
    },
    [],
  );

  useEffect(() => {
    const warmupLesson = viewMode === "variant-study" ? activeVariantLesson : baseLesson;
    if (!warmupLesson) return;

    const initialSentenceWarmupLimit = 2;
    let idleWarmupKey: string | false = false;
    const timer = window.setTimeout(() => {
      scheduleLessonAudioWarmup(warmupLesson, {
        sentenceLimit: initialSentenceWarmupLimit,
        chunkLimit: 2,
        includeSceneFull: true,
      });
      idleWarmupKey = scheduleSceneIdleAudioWarmup(warmupLesson, {
        initialSentenceOffset: initialSentenceWarmupLimit,
        batchSize: SCENE_IDLE_WARMUP_BATCH_SIZE,
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
      cancelSceneIdleAudioWarmup(idleWarmupKey);
    };
  }, [activeVariantLesson, baseLesson, viewMode]);

  useEffect(() => {
    if (!variantChunkModalOpen || !variantChunkSentence) return;

    const sentenceText =
      getSentenceSpeakText(variantChunkSentence);
    if (sentenceText) {
      scheduleLessonAudioWarmup(
        {
          id: `warmup-${variantChunkSentence.id}`,
          slug: (baseLesson?.slug ?? sceneSlug).trim() || "scene",
          title: "warmup",
          difficulty: "Beginner",
          estimatedMinutes: 1,
          completionRate: 0,
          tags: [],
          sections: [
            {
              id: "warmup-section",
              blocks: [
                {
                  id: "warmup-block",
                  speaker: variantChunkSentence.speaker,
                  sentences: [variantChunkSentence],
                },
              ],
            },
          ],
          explanations: [],
        },
        {
          sentenceLimit: 1,
          chunkLimit: 0,
          key: `scene-variant-sentence:${variantChunkSentence.id}`,
        },
      );
    }

    const chunkText = variantChunkDetail?.text?.trim();
    if (!chunkText) return;
    scheduleChunkAudioWarmup([chunkText], { limit: 1 });
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
        void playbackController.toggleChunkPlayback({
          chunkText: clean,
          chunkKey: buildChunkAudioKey(clean),
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
          },
        });
        return;
      }

      if (sentence && clean === sentence.text.trim()) {
        void playbackController.toggleSentencePlayback({
          sceneSlug: (baseLesson?.slug ?? sceneSlug).trim() || "scene",
          sentenceId: sentence.id,
          text: clean,
          mode: "normal",
          speaker: sentence.speaker,
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
          },
        });
        const playbackWarmupLesson: Lesson = baseLesson ?? {
          id: `warmup-${sentence.id}`,
          slug: sceneSlug.trim() || "scene",
          title: "warmup",
          difficulty: "Beginner",
          estimatedMinutes: 1,
          completionRate: 0,
          tags: [],
          sections: [
            {
              id: "warmup-section",
              blocks: [
                {
                  id: "warmup-block",
                  speaker: sentence.speaker,
                  sentences: [sentence],
                },
              ],
            },
          ],
          explanations: [],
        };
        handleSentencePlaybackWarmup({
          lesson: playbackWarmupLesson,
          sentence,
        });
        return;
      }

      void playbackController.toggleChunkPlayback({
        chunkText: clean,
        chunkKey: buildChunkAudioKey(clean),
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
        },
      });
    },
    [
      baseLesson,
      effectiveSpeakingText,
      handleSentencePlaybackWarmup,
      playbackController,
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
      void playbackController.playChunkWithLoopState({
        chunkText: clean,
        chunkKey: buildChunkAudioKey(clean),
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
        },
      });
    },
    [playbackController],
  );

  const openChunkDetail = useCallback(
    (chunk: string, relatedChunks: string[]) => {
      if (!baseLesson) return;
      const variantLessons = latestVariantSet?.variants.map((item) => item.lesson) ?? [];
      const preferredChunk = relatedChunks[0]?.trim() || chunk.trim();
      if (!preferredChunk) return;
      const context = findChunkContext(preferredChunk, baseLesson, variantLessons);
      if (!context) return;
      const detail = getChunkLayerFromLesson(context.lesson, context.sentence, preferredChunk);
      setVariantChunkSentence(context.sentence);
      setVariantChunkDetail(detail);
      setVariantChunkRelatedChunks(relatedChunks);
      setVariantChunkModalOpen(true);
      if (process.env.NODE_ENV !== "test") {
        const allSentences = getLessonSentences(context.lesson);
        const sentenceIndex = allSentences.findIndex((item) => item.id === context.sentence.id);
        const encounterKey = `${context.lesson.slug}:${context.sentence.id}:${preferredChunk.toLowerCase()}`;
        if (!trackedChunkKeys[encounterKey]) {
          setTrackedChunkKeys((prev) => ({ ...prev, [encounterKey]: true }));
          void trackChunksFromApi({
            sceneSlug: context.lesson.slug,
            sentenceIndex: sentenceIndex >= 0 ? sentenceIndex : undefined,
            sentenceText: context.sentence.text,
            chunks: [preferredChunk],
            interactionType: "encounter",
          }).catch(() => {
            setTrackedChunkKeys((prev) => {
              const next = { ...prev };
              delete next[encounterKey];
              return next;
            });
          });
        }
      }
    },
    [baseLesson, latestVariantSet, trackedChunkKeys],
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
    handleSentencePlaybackWarmup,
    resetChunkDetailState,
  };
}
