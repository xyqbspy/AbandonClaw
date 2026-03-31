import { getLessonSentences } from "@/lib/shared/lesson-content";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { Lesson, LessonSentence } from "@/lib/types";

import {
  prefetchChunkAudio,
  prefetchSceneFullAudio,
  prefetchSentenceAudio,
} from "@/lib/utils/tts-api";

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
    void prefetchSentenceAudio({
      sceneSlug: lesson.slug,
      sentenceId: sentence.id,
      text,
      speaker: sentence.speaker,
      mode: "normal",
    });
  }

  warmupChunkTextsAudio(sentences[0]?.chunks ?? [], chunkLimit);

  if (options?.includeSceneFull) {
    const segments = buildSceneFullSegmentsFromLesson(lesson);
    if (segments.length > 0) {
      void prefetchSceneFullAudio({
        sceneSlug: lesson.slug,
        sceneType: lesson.sceneType ?? "monologue",
        segments,
      });
    }
  }
};
