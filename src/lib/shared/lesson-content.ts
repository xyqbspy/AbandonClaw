import { Lesson, LessonBlock, LessonSection, LessonSentence, SentenceChunkDetail } from "@/lib/types";

const findChunkRange = (sentenceText: string, chunkText: string) => {
  const source = sentenceText;
  const needle = chunkText.trim();
  if (!source || !needle) return { start: 0, end: Math.max(0, needle.length) };

  const exactIndex = source.indexOf(needle);
  if (exactIndex >= 0) return { start: exactIndex, end: exactIndex + needle.length };

  const lowerSource = source.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const lowerIndex = lowerSource.indexOf(lowerNeedle);
  if (lowerIndex >= 0) return { start: lowerIndex, end: lowerIndex + needle.length };

  return { start: 0, end: Math.min(source.length, needle.length) };
};

const toFallbackChunkDetail = (chunkText: string, sentenceText: string): SentenceChunkDetail => {
  const range = findChunkRange(sentenceText, chunkText);
  return {
    id: `chunk-${Math.random().toString(36).slice(2, 8)}`,
    text: chunkText,
    translation: "该短语释义待补充。",
    grammarLabel: "表达",
    meaningInSentence: "在这句话里表示该表达在当前语境中的含义。",
    usageNote: "先理解它在句中的作用，再放回整句复述。",
    examples: [
      {
        en: `I used \"${chunkText}\" in today's speaking practice.`,
        zh: `我在今天的口语练习里用了“${chunkText}”。`,
      },
      {
        en: `She tried \"${chunkText}\" in a real conversation.`,
        zh: `她在真实对话里尝试了“${chunkText}”。`,
      },
    ],
    start: range.start,
    end: range.end,
  };
};

const normalizeSentence = (sentence: LessonSentence): LessonSentence => {
  const text = (sentence.text ?? "").trim();
  const chunks = Array.from(new Set((sentence.chunks ?? []).map((item) => item.trim()).filter(Boolean)));

  const nextChunkDetails =
    sentence.chunkDetails && sentence.chunkDetails.length > 0
      ? sentence.chunkDetails.map((detail) => {
          const range =
            typeof detail.start === "number" && typeof detail.end === "number"
              ? { start: detail.start, end: detail.end }
              : findChunkRange(text, detail.text);
          return {
            ...detail,
            start: range.start,
            end: range.end,
            examples: Array.isArray(detail.examples) ? detail.examples : [],
          };
        })
      : chunks.map((chunkText) => toFallbackChunkDetail(chunkText, text));

  return {
    ...sentence,
    text,
    translation: sentence.translation?.trim() || "",
    tts: sentence.tts?.trim() || text,
    chunks,
    chunkDetails: nextChunkDetails,
  };
};

export const getSectionBlocks = (
  section: LessonSection,
  sceneType: "dialogue" | "monologue",
): LessonBlock[] => {
  if (!Array.isArray(section.blocks)) {
    throw new Error(`Invalid lesson section structure: section(${section.id}) missing blocks[]`);
  }
  return section.blocks.map((block, blockIndex) => {
    const sentences = block.sentences.map(normalizeSentence);
    return {
      ...block,
      id: block.id || `block-${section.id}-${blockIndex + 1}`,
      kind: block.kind ?? sceneType,
      speaker: block.speaker,
      translation:
        block.translation?.trim() ||
        sentences
          .map((sentence) => sentence.translation?.trim())
          .filter(Boolean)
          .join(" "),
      tts:
        block.tts?.trim() ||
        sentences
          .map((sentence) => sentence.tts?.trim() || sentence.text)
          .filter(Boolean)
          .join(" "),
      sentences,
    };
  });
};

export const getSectionSentences = (
  section: LessonSection,
  sceneType: "dialogue" | "monologue",
): LessonSentence[] =>
  getSectionBlocks(section, sceneType).flatMap((block) => block.sentences);

export const getLessonBlocks = (lesson: Lesson): LessonBlock[] =>
  lesson.sections.flatMap((section) => getSectionBlocks(section, lesson.sceneType ?? "monologue"));

export const getLessonSentences = (lesson: Lesson): LessonSentence[] =>
  lesson.sections.flatMap((section) => getSectionSentences(section, lesson.sceneType ?? "monologue"));

export const normalizeLessonStructure = (lesson: Lesson): Lesson => {
  const sceneType = lesson.sceneType ?? "monologue";
  const sections = lesson.sections.map((section) => {
    const blocks = getSectionBlocks(section, sceneType);
    return {
      ...section,
      blocks,
    };
  });

  return {
    ...lesson,
    sceneType,
    sections,
  };
};
