import { Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import { getLessonSentences } from "@/lib/shared/lesson-content";
import { builtinSceneSeeds } from "./builtin-scene-seeds";

const ex = (en: string, zh: string) => ({ en, zh });

export const lessons: Lesson[] = builtinSceneSeeds.map((item) => item.lesson);

export const scenes = lessons;

export const getLessonBySlug = (slug: string) => lessons.find((lesson) => lesson.slug === slug);
export const getSceneBySlug = (slug: string) => getLessonBySlug(slug);

export const getSentenceById = (lesson: Lesson, sentenceId: string) =>
  getLessonSentences(lesson).find((sentence) => sentence.id === sentenceId);

export const getFirstSentence = (lesson: Lesson): LessonSentence | undefined =>
  getLessonSentences(lesson)[0];

export const findMatchingChunkInSentence = (sentence: LessonSentence, selectedText: string) => {
  const selected = selectedText.trim().toLowerCase();
  if (!selected) return undefined;
  return sentence.chunks.find((chunk) => chunk.toLowerCase() === selected);
};

const toChunkLayer = (
  explanation: Lesson["explanations"][number] | undefined,
  sentence: LessonSentence,
  chunkText: string,
): SelectionChunkLayer => {
  if (explanation) {
    return {
      text: chunkText,
      translation: explanation.translation,
      grammarLabel: explanation.grammarLabel,
      pronunciation: explanation.pronunciation,
      meaningInSentence: `这里可以理解为：${sentence.translation ?? ""}`,
      usageNote: "建议先理解这个 chunk 在当前句中的作用，再迁移到自己的表达里。",
      examples: explanation.examples.slice(0, 2).map((en, index) => ({
        en,
        zh: explanation.exampleTranslations[index] ?? "",
      })),
      notes: explanation.breakdown,
    };
  }

  return {
    text: chunkText,
    translation: "常用表达",
    meaningInSentence: "这里是句子中的核心语义单元。",
    usageNote: "先记 chunk，再放回整句复述。",
    examples: [
      ex(`Try using "${chunkText}" in your own sentence.`, `试着在自己的句子里用“${chunkText}”。`),
      ex(`I saved "${chunkText}" for review.`, `我把“${chunkText}”加入复习了。`),
    ],
    notes: ["优先记忆“chunk + 整句”组合"],
  };
};

export const getChunkLayerFromLesson = (
  lesson: Lesson,
  sentence: LessonSentence,
  chunkText: string,
): SelectionChunkLayer => {
  const localChunk = sentence.chunkDetails?.find(
    (item) => item.text.toLowerCase() === chunkText.toLowerCase(),
  );
  if (localChunk) {
    return {
      text: localChunk.text,
      translation: localChunk.translation,
      grammarLabel: localChunk.grammarLabel,
      pronunciation: localChunk.pronunciation,
      meaningInSentence: localChunk.meaningInSentence,
      usageNote: localChunk.usageNote,
      examples: (localChunk.examples ?? []).slice(0, 2),
      notes: localChunk.notes ?? [],
    };
  }

  const explanation = lesson.explanations.find(
    (item) => item.key.toLowerCase() === chunkText.toLowerCase(),
  );
  return toChunkLayer(explanation, sentence, chunkText);
};
