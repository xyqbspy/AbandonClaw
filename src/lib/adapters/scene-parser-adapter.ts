import { Lesson } from "@/lib/types";
import {
  ParsedScene,
  ParsedSceneChunk,
  ParsedSceneDialogueLine,
  SceneParserResponse,
} from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";

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
      en: `I used "${safeChunk}" in today's speaking practice.`,
      zh: `我在今天的口语练习里用了“${safeChunk}”。`,
    },
    {
      en: `She tried "${safeChunk}" in a real conversation.`,
      zh: `她在真实对话里尝试了“${safeChunk}”。`,
    },
  ];
};

const normalizeChunkExamples = (
  examples: ParsedSceneChunk["examples"] | undefined,
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

const normalizeMeaningInSentence = (
  value: string | undefined,
  chunkTranslation: string | undefined,
) => {
  const raw = (value ?? "").trim();
  if (raw && hasChinese(raw)) return raw;
  const translation = (chunkTranslation ?? "").trim();
  if (translation && hasChinese(translation)) return `这里表示：${translation}`;
  return "在这句话里表示该表达在当前语境中的含义。";
};

const normalizeUsageNote = (value: string | undefined) => {
  const raw = (value ?? "").trim();
  if (raw && hasChinese(raw)) return raw;
  return "先理解它在这句话里的作用，再放回整句复述。";
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
    difficulty: scene.difficulty,
    estimatedMinutes: scene.estimatedMinutes,
    completionRate: scene.completionRate ?? 0,
    tags: scene.tags,
    sceneType: scene.type ?? (scene.dialogue.length > 0 ? "dialogue" : "monologue"),
    sourceType: "builtin",
    sections: scene.sections.map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary,
      sentences: section.sentences.map((sentence) => ({
        id: sentence.id,
        speaker: sentence.speaker,
        text: sentence.text,
        translation: normalizeChineseText(
          sentence.translation,
          "该句翻译待补充。",
        ),
        audioText: sentence.audioText ?? sentence.text,
        chunks: toUniqueChunkTexts(sentence.chunks),
        chunkDetails: sentence.chunks.map((chunk) => ({
          text: chunk.text,
          translation: normalizeChineseText(
            chunk.translation,
            "该短语释义待补充。",
          ),
          grammarLabel: chunk.grammarLabel,
          meaningInSentence: normalizeMeaningInSentence(
            chunk.meaningInSentence,
            chunk.translation,
          ),
          usageNote: normalizeUsageNote(chunk.usageNote),
          examples: normalizeChunkExamples(
            chunk.examples,
            chunk.text,
            chunk.translation,
          ),
          pronunciation: chunk.pronunciation,
          synonyms: chunk.synonyms,
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

export function mapLessonToParsedScene(lesson: Lesson): ParsedScene {
  const sentenceRows = lesson.sections.flatMap((section) => section.sentences);
  const inferredType =
    lesson.sceneType ??
    (sentenceRows.some((sentence) => sentence.speaker === "A" || sentence.speaker === "B")
      ? "dialogue"
      : "monologue");
  const dialogue: ParsedSceneDialogueLine[] =
    inferredType === "dialogue"
      ? sentenceRows
          .filter((sentence) => sentence.speaker === "A" || sentence.speaker === "B")
          .map((sentence) => ({
            id: sentence.id,
            speaker: sentence.speaker === "B" ? "B" : "A",
            text: sentence.text,
            translation: sentence.translation,
            tts: sentence.audioText ?? sentence.text,
            chunks:
              sentence.chunkDetails?.map((chunk) => ({
                key: chunk.text,
                text: chunk.text,
                translation: chunk.translation,
                grammarLabel: chunk.grammarLabel,
                meaningInSentence: chunk.meaningInSentence,
                usageNote: chunk.usageNote,
                examples: chunk.examples,
                pronunciation: chunk.pronunciation,
                synonyms: chunk.synonyms,
              })) ??
              sentence.chunks.map((chunkText) => ({
                key: chunkText,
                text: chunkText,
                translation: "",
                grammarLabel: "",
                meaningInSentence: "",
                usageNote: "",
                examples: [],
              })),
          }))
      : [];

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    subtitle: lesson.subtitle,
    description: lesson.description,
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes,
    completionRate: lesson.completionRate,
    tags: lesson.tags,
    type: inferredType,
    dialogue,
    sections: lesson.sections.map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary,
      sentences: section.sentences.map((sentence) => ({
        id: sentence.id,
        speaker: sentence.speaker,
        text: sentence.text,
        translation: sentence.translation,
        audioText: sentence.audioText ?? sentence.text,
        chunks:
          sentence.chunkDetails?.map((chunk) => ({
            key: chunk.text,
            text: chunk.text,
            translation: chunk.translation,
            grammarLabel: chunk.grammarLabel,
            meaningInSentence: chunk.meaningInSentence,
            usageNote: chunk.usageNote,
            examples: chunk.examples,
            pronunciation: chunk.pronunciation,
            synonyms: chunk.synonyms,
          })) ??
          sentence.chunks.map((chunkText) => ({
            key: chunkText,
            text: chunkText,
            translation: "",
            grammarLabel: "",
            meaningInSentence: "",
            usageNote: "",
            examples: [],
          })),
      })),
    })),
    glossary: lesson.explanations.map((item) => ({
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
