import { getLessonSentences } from "@/lib/shared/lesson-content";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { Lesson, LessonSentence } from "@/lib/types";

import {
  enqueueSceneFullWarmup,
  enqueueSceneSentenceWarmup,
} from "@/lib/utils/scene-audio-warmup-scheduler";
import { prefetchChunkAudio } from "@/lib/utils/tts-api";

export const getSentenceSpeakText = (sentence: LessonSentence) =>
  (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim();

export const warmupChunkTextsAudio = (chunkTexts: string[], limit = 2) => {
  for (const chunkText of chunkTexts.slice(0, limit)) {
    const clean = chunkText.trim();
    if (!clean) continue;
    void prefetchChunkAudio({
      chunkText: clean,
      chunkKey: buildChunkAudioKey(clean),
    });
  }
};

const buildSceneFullSegmentsFromLesson = (lesson: Lesson) =>
  getLessonSentences(lesson)
    .map((sentence) => ({
      text: getSentenceSpeakText(sentence),
      speaker: sentence.speaker,
    }))
    .filter((segment) => segment.text);

export const warmupLessonAudio = (
  lesson: Lesson,
  options?: { sentenceLimit?: number; chunkLimit?: number; includeSceneFull?: boolean },
) => {
  const sentenceLimit = options?.sentenceLimit ?? 2;
  const chunkLimit = options?.chunkLimit ?? 2;
  const sentences = getLessonSentences(lesson).slice(0, sentenceLimit);

  for (const sentence of sentences) {
    const text = getSentenceSpeakText(sentence);
    if (!text) continue;
    enqueueSceneSentenceWarmup(
      {
        sceneSlug: lesson.slug,
        sentenceId: sentence.id,
        text,
        speaker: sentence.speaker,
        mode: "normal",
      },
      {
        priority: "next-up",
        source: "initial",
      },
    );
  }

  warmupChunkTextsAudio(sentences[0]?.chunks ?? [], chunkLimit);

  if (options?.includeSceneFull) {
    const segments = buildSceneFullSegmentsFromLesson(lesson);
    if (segments.length > 0) {
      enqueueSceneFullWarmup(
        {
          sceneSlug: lesson.slug,
          sceneType: lesson.sceneType ?? "monologue",
          segments,
        },
        {
          priority: "background",
          source: "initial",
        },
      );
    }
  }
};

export const enqueueLessonIdleSentenceWarmups = (
  lesson: Lesson,
  options?: { startIndex?: number; batchSize?: number },
) => {
  const sentences = getLessonSentences(lesson);
  const batchSize = Math.max(1, options?.batchSize ?? 2);
  let nextIndex = Math.max(0, options?.startIndex ?? 0);
  let enqueuedCount = 0;

  while (nextIndex < sentences.length && enqueuedCount < batchSize) {
    const sentence = sentences[nextIndex];
    nextIndex += 1;
    if (!sentence) continue;

    const text = getSentenceSpeakText(sentence);
    if (!text) continue;

    enqueueSceneSentenceWarmup(
      {
        sceneSlug: lesson.slug,
        sentenceId: sentence.id,
        text,
        speaker: sentence.speaker,
        mode: "normal",
      },
      {
        priority: "idle-warm",
        source: "idle",
      },
    );
    enqueuedCount += 1;
  }

  return {
    enqueuedCount,
    nextIndex,
    total: sentences.length,
    done: nextIndex >= sentences.length,
  };
};

export const promoteLessonPlaybackAudioWarmups = (
  lesson: Lesson,
  currentSentenceId: string,
  options?: {
    lookaheadCount?: number;
    includeSceneFull?: boolean;
  },
) => {
  const sentences = getLessonSentences(lesson);
  const currentIndex = sentences.findIndex((sentence) => sentence.id === currentSentenceId);
  if (currentIndex < 0) {
    return {
      promotedSentenceCount: 0,
      promotedSceneFull: false,
    };
  }

  const lookaheadCount = Math.max(1, options?.lookaheadCount ?? 3);
  let promotedSentenceCount = 0;
  for (const sentence of sentences.slice(currentIndex + 1, currentIndex + 1 + lookaheadCount)) {
    const text = getSentenceSpeakText(sentence);
    if (!text) continue;
    enqueueSceneSentenceWarmup(
      {
        sceneSlug: lesson.slug,
        sentenceId: sentence.id,
        text,
        speaker: sentence.speaker,
        mode: "normal",
      },
      {
        priority: "next-up",
        source: "playback",
      },
    );
    promotedSentenceCount += 1;
  }

  let promotedSceneFull = false;
  if (options?.includeSceneFull) {
    const segments = buildSceneFullSegmentsFromLesson(lesson);
    if (segments.length > 0) {
      enqueueSceneFullWarmup(
        {
          sceneSlug: lesson.slug,
          sceneType: lesson.sceneType ?? "monologue",
          segments,
        },
        {
          priority: "next-up",
          source: "playback",
        },
      );
      promotedSceneFull = true;
    }
  }

  return {
    promotedSentenceCount,
    promotedSceneFull,
  };
};
