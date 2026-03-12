import { Lesson } from "@/lib/types";
import {
  ParsedScene,
  ParsedSceneChunk,
  SceneParserResponse,
} from "@/lib/types/scene-parser";

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
  const { scene } = response;

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
    sourceType: "builtin",
    sections: scene.sections.map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary,
      sentences: section.sentences.map((sentence) => ({
        id: sentence.id,
        speaker: sentence.speaker,
        text: sentence.text,
        translation: sentence.translation,
        audioText: sentence.audioText ?? sentence.text,
        chunks: toUniqueChunkTexts(sentence.chunks),
        chunkDetails: sentence.chunks.map((chunk) => ({
          text: chunk.text,
          translation: chunk.translation,
          grammarLabel: chunk.grammarLabel,
          meaningInSentence: chunk.meaningInSentence,
          usageNote: chunk.usageNote,
          examples: chunk.examples,
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
