import { getLessonBlocks, getLessonSentences } from "@/lib/shared/lesson-content";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { Lesson, LessonBlock, LessonSentence } from "@/lib/types";

import {
  enqueueSceneFullWarmup,
  enqueueSceneSentenceWarmup,
} from "@/lib/utils/scene-audio-warmup-scheduler";
import { buildChunkTtsCacheKey, prefetchChunkAudio } from "@/lib/utils/tts-api";
import { markAudioWarmed, type WarmupSource } from "@/lib/utils/tts-warmup-registry";

export const getSentenceSpeakText = (sentence: LessonSentence) =>
  (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim();

export const getBlockSpeakText = (block: LessonBlock) =>
  (
    block.tts?.trim() ||
    block.sentences
      .map((sentence) => getSentenceSpeakText(sentence))
      .filter(Boolean)
      .join(" ")
  ).trim();

const getPlayableBlocks = (lesson: Lesson) =>
  getLessonBlocks(lesson).filter((block) => Boolean(getBlockSpeakText(block)));

const toBlockWarmupPayload = (lesson: Lesson, block: LessonBlock) => ({
  sceneSlug: lesson.slug,
  sentenceId: `block-${block.id}`,
  text: getBlockSpeakText(block),
  speaker: block.speaker ?? block.sentences[0]?.speaker,
  mode: "normal" as const,
});

export const warmupChunkTextsAudio = (
  chunkTexts: string[],
  limit = 2,
  source: WarmupSource = "initial",
) => {
  for (const chunkText of chunkTexts.slice(0, limit)) {
    const clean = chunkText.trim();
    if (!clean) continue;
    const chunkKey = buildChunkAudioKey(clean);
    markAudioWarmed(buildChunkTtsCacheKey({ chunkText: clean, chunkKey }), source);
    void prefetchChunkAudio({ chunkText: clean, chunkKey });
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
  const blocks = getPlayableBlocks(lesson).slice(0, sentenceLimit);

  for (const block of blocks) {
    enqueueSceneSentenceWarmup(
      toBlockWarmupPayload(lesson, block),
      {
        priority: "next-up",
        source: "initial",
      },
    );
  }

  warmupChunkTextsAudio(blocks[0]?.sentences.flatMap((sentence) => sentence.chunks) ?? [], chunkLimit);

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

export const enqueueLessonIdleBlockWarmups = (
  lesson: Lesson,
  options?: { startIndex?: number; batchSize?: number },
) => {
  const blocks = getPlayableBlocks(lesson);
  const batchSize = Math.max(1, options?.batchSize ?? 2);
  let nextIndex = Math.max(0, options?.startIndex ?? 0);
  let enqueuedCount = 0;

  while (nextIndex < blocks.length && enqueuedCount < batchSize) {
    const block = blocks[nextIndex];
    nextIndex += 1;
    if (!block) continue;

    enqueueSceneSentenceWarmup(
      toBlockWarmupPayload(lesson, block),
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
    total: blocks.length,
    done: nextIndex >= blocks.length,
  };
};

export const enqueueLessonIdleSentenceWarmups = enqueueLessonIdleBlockWarmups;

export const promoteLessonPlaybackAudioWarmups = (
  lesson: Lesson,
  currentSentenceId: string,
  options?: {
    lookaheadCount?: number;
    includeSceneFull?: boolean;
  },
) => {
  const blocks = getPlayableBlocks(lesson);
  const currentIndex = blocks.findIndex(
    (block) =>
      `block-${block.id}` === currentSentenceId ||
      block.sentences.some((sentence) => sentence.id === currentSentenceId),
  );
  if (currentIndex < 0) {
    return {
      promotedSentenceCount: 0,
      promotedSceneFull: false,
    };
  }

  const lookaheadCount = Math.max(1, options?.lookaheadCount ?? 3);
  let promotedSentenceCount = 0;
  for (const block of blocks.slice(currentIndex + 1, currentIndex + 1 + lookaheadCount)) {
    enqueueSceneSentenceWarmup(
      toBlockWarmupPayload(lesson, block),
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
