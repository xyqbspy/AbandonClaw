import { Lesson } from "@/lib/types";
import {
  ParsedScene,
  ParsedSceneChunk,
  ParsedSceneSection,
  SceneParserResponse,
  SceneType,
} from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { normalizeLessonStructure } from "@/lib/shared/lesson-content";

const hasChinese = (value: string) => /[\u4e00-\u9fff]/.test(value);

const normalizeChineseText = (value: string | undefined, fallback: string) => {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;
  return hasChinese(raw) ? raw : fallback;
};

const buildFallbackExamples = (chunkText: string) => {
  const safeChunk = chunkText.trim() || "this expression";
  return [
    {
      en: `I used \"${safeChunk}\" in today's speaking practice.`,
      zh: `我在今天的口语练习里用了“${safeChunk}”。`,
    },
    {
      en: `She tried \"${safeChunk}\" in a real conversation.`,
      zh: `她在真实对话里尝试了“${safeChunk}”。`,
    },
  ];
};

const normalizeChunkExamples = (
  examples: Array<{ en: string; zh: string }> | undefined,
  chunkText: string,
  chunkTranslation: string,
) => {
  const normalized = (examples ?? [])
    .map((example) => ({
      en: (example?.en ?? "").trim(),
      zh: (example?.zh ?? "").trim(),
    }))
    .filter((example) => example.en.length > 0)
    .filter((example, index, list) => {
      const key = example.en.toLowerCase();
      return list.findIndex((item) => item.en.toLowerCase() === key) === index;
    })
    .map((example) => ({
      en: example.en,
      zh: hasChinese(example.zh)
        ? example.zh
        : `这里可理解为：${normalizeChineseText(chunkTranslation, "该表达的中文释义待补充。")}`,
    }))
    .filter((example) => example.en.toLowerCase() !== chunkText.trim().toLowerCase());

  if (normalized.length >= 2) return normalized.slice(0, 2);
  return [...normalized, ...buildFallbackExamples(chunkText)].slice(0, 2);
};

const normalizeRange = (start: number | undefined, end: number | undefined, text: string) => {
  if (typeof start === "number" && typeof end === "number" && start >= 0 && end >= start) {
    return { start, end };
  }
  const trimmed = text.trim();
  return { start: 0, end: Math.max(0, trimmed.length) };
};

const toUniqueChunkTexts = (chunks: ParsedSceneChunk[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const chunk of chunks) {
    const key = chunk.text.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(chunk.text);
  }

  return result;
};

export function mapParsedSceneToLesson(response: SceneParserResponse): Lesson {
  const scene = normalizeParsedSceneDialogue(response.scene);

  return {
    id: scene.id,
    slug: scene.slug,
    title: scene.title,
    subtitle: scene.subtitle,
    description: scene.description,
    difficulty: scene.difficulty ?? "Intermediate",
    estimatedMinutes: scene.estimatedMinutes ?? 8,
    completionRate: scene.completionRate ?? 0,
    tags: scene.tags ?? [],
    sceneType: scene.type,
    sourceType: "builtin",
    sections: scene.sections.map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary,
      blocks: section.blocks.map((block) => ({
        id: block.id,
        kind: block.type,
        speaker: block.speaker,
        translation: block.translation,
        tts: block.tts,
        sentences: block.sentences.map((sentence) => ({
          id: sentence.id,
          speaker: block.speaker,
          text: sentence.text,
          translation: normalizeChineseText(sentence.translation, "该句翻译待补充。"),
          tts: sentence.tts ?? sentence.text,
          chunks: toUniqueChunkTexts(sentence.chunks),
          chunkDetails: sentence.chunks.map((chunk) => {
            const range = normalizeRange(chunk.start, chunk.end, chunk.text);
            return {
              id: chunk.id,
              text: chunk.text,
              translation: normalizeChineseText(chunk.translation, "该短语释义待补充。"),
              grammarLabel: chunk.grammarLabel ?? "Chunk",
              meaningInSentence: normalizeChineseText(
                chunk.meaningInSentence,
                "在这句话里表示该表达在当前语境中的含义。",
              ),
              usageNote: normalizeChineseText(
                chunk.usageNote,
                "先理解它在这句话里的作用，再放回整句复述。",
              ),
              examples: normalizeChunkExamples(chunk.examples, chunk.text, chunk.translation ?? ""),
              pronunciation: chunk.pronunciation,
              notes: chunk.notes ?? [],
              start: range.start,
              end: range.end,
            };
          }),
        })),
      })),
    })),
    explanations:
      scene.glossary?.map((item) => ({
        key: item.key,
        text: item.text,
        translation: item.translation,
        explanation: item.explanation,
        examples: item.examples,
        exampleTranslations: item.exampleTranslations,
        breakdown: item.breakdown,
        pronunciation: item.pronunciation,
        grammarLabel: item.grammarLabel,
      })) ?? [],
  };
}

const findChunkRange = (sentenceText: string, chunkText: string) => {
  const text = sentenceText ?? "";
  const chunk = (chunkText ?? "").trim();
  if (!chunk) return { start: 0, end: 0 };

  const exact = text.indexOf(chunk);
  if (exact >= 0) return { start: exact, end: exact + chunk.length };

  const lowerText = text.toLowerCase();
  const lowerChunk = chunk.toLowerCase();
  const lower = lowerText.indexOf(lowerChunk);
  if (lower >= 0) return { start: lower, end: lower + chunk.length };
  return { start: 0, end: Math.min(text.length, chunk.length) };
};

const mapLessonChunkToParsed = (sentenceText: string, chunk: {
  id?: string;
  text: string;
  translation?: string;
  grammarLabel?: string;
  meaningInSentence?: string;
  usageNote?: string;
  examples?: Array<{ en: string; zh: string }>;
  pronunciation?: string;
  notes?: string[];
  start?: number;
  end?: number;
}): ParsedSceneChunk => {
  const range =
    typeof chunk.start === "number" && typeof chunk.end === "number"
      ? { start: chunk.start, end: chunk.end }
      : findChunkRange(sentenceText, chunk.text);

  return {
    id: chunk.id || chunk.text,
    key: chunk.text,
    text: chunk.text,
    translation: chunk.translation,
    grammarLabel: chunk.grammarLabel,
    meaningInSentence: chunk.meaningInSentence,
    usageNote: chunk.usageNote,
    examples: chunk.examples ?? [],
    pronunciation: chunk.pronunciation,
    notes: chunk.notes,
    start: range.start,
    end: range.end,
  };
};

export function mapLessonToParsedScene(lesson: Lesson): ParsedScene {
  const normalized = normalizeLessonStructure(lesson);
  const sceneType: SceneType = normalized.sceneType ?? "monologue";

  const sections: ParsedSceneSection[] = normalized.sections.map((section, sectionIndex) => ({
    id: section.id || `section-${sectionIndex + 1}`,
    title: section.title,
    summary: section.summary,
    blocks: section.blocks.map((block, blockIndex) => ({
      id: block.id || `block-${sectionIndex + 1}-${blockIndex + 1}`,
      type: block.kind ?? sceneType,
      speaker: block.speaker,
      translation: block.translation,
      tts: block.tts,
      sentences: block.sentences.map((sentence, sentenceIndex) => ({
        id: sentence.id || `sentence-${sectionIndex + 1}-${blockIndex + 1}-${sentenceIndex + 1}`,
        text: sentence.text,
        translation: sentence.translation,
        tts: sentence.tts ?? sentence.text,
        chunks:
          sentence.chunkDetails && sentence.chunkDetails.length > 0
            ? sentence.chunkDetails.map((chunk) => mapLessonChunkToParsed(sentence.text, chunk))
            : sentence.chunks.map((chunkText) =>
                mapLessonChunkToParsed(sentence.text, {
                  id: chunkText,
                  text: chunkText,
                }),
              ),
      })),
    })),
  }));

  return {
    id: normalized.id,
    slug: normalized.slug,
    title: normalized.title,
    subtitle: normalized.subtitle,
    description: normalized.description,
    difficulty: normalized.difficulty,
    estimatedMinutes: normalized.estimatedMinutes,
    completionRate: normalized.completionRate,
    tags: normalized.tags,
    type: sceneType,
    sections,
    glossary: normalized.explanations.map((item) => ({
      key: item.key,
      text: item.text,
      translation: item.translation,
      explanation: item.explanation,
      examples: item.examples,
      exampleTranslations: item.exampleTranslations,
      breakdown: item.breakdown,
      pronunciation: item.pronunciation,
      grammarLabel: item.grammarLabel,
    })),
  };
}
