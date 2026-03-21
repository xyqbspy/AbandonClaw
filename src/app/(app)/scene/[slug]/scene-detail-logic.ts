import { normalizePhraseText } from "@/lib/shared/phrases";
import { Lesson, LessonSentence } from "@/lib/types";

export const buildReusedChunks = (lesson: Lesson, limit = 12) => {
  const seen = new Set<string>();
  const chunks: string[] = [];

  for (const section of lesson.sections) {
    for (const sentence of section.blocks.flatMap((block) => block.sentences)) {
      const source = sentence.chunkDetails?.map((item) => item.text) ?? sentence.chunks;
      for (const chunk of source) {
        const normalized = chunk.trim();
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        chunks.push(normalized);
        if (chunks.length >= limit) return chunks;
      }
    }
  }

  return chunks;
};

export const isSceneViewMode = (value: string) =>
  value === "scene" ||
  value === "practice" ||
  value === "variants" ||
  value === "variant-study" ||
  value === "expression-map";

export const findSentenceForChunk = (
  lesson: Lesson,
  chunkText: string,
): LessonSentence | null => {
  const lower = chunkText.trim().toLowerCase();
  if (!lower) return null;
  for (const section of lesson.sections) {
    for (const sentence of section.blocks.flatMap((block) => block.sentences)) {
      const inChunks = sentence.chunks.some((chunk) => chunk.toLowerCase() === lower);
      const inChunkDetails = sentence.chunkDetails?.some(
        (chunk) => chunk.text.toLowerCase() === lower,
      );
      if (inChunks || inChunkDetails) return sentence;
    }
  }
  return null;
};

export const toVariantStatusLabel = (status: "unviewed" | "viewed" | "completed") => {
  if (status === "viewed") return "已查看";
  if (status === "completed") return "已完成";
  return "未查看";
};

export const toVariantTitle = (title: string) =>
  title
    .replace(/\s*\(Variant\s*\d+\)/gi, "")
    .replace(/\s*[（(]变体\s*\d+[）)]/gi, "")
    .trim();

export const findChunkContext = (
  chunkText: string,
  baseLesson: Lesson,
  variantLessons: Lesson[],
): { lesson: Lesson; sentence: LessonSentence } | null => {
  const allLessons = [baseLesson, ...variantLessons];
  for (const lesson of allLessons) {
    const sentence = findSentenceForChunk(lesson, chunkText);
    if (!sentence) continue;
    const hasChunk =
      sentence.chunks.some((item) => item.toLowerCase() === chunkText.toLowerCase()) ||
      sentence.chunkDetails?.some(
        (item) => item.text.toLowerCase() === chunkText.toLowerCase(),
      );
    if (hasChunk) return { lesson, sentence };
  }
  return null;
};

export const collectLessonChunkTexts = (lesson: Lesson) => {
  const texts = new Set<string>();
  for (const section of lesson.sections) {
    for (const sentence of section.blocks.flatMap((block) => block.sentences)) {
      for (const chunk of sentence.chunks) {
        const normalized = normalizePhraseText(chunk);
        if (!normalized) continue;
        texts.add(normalized);
      }
      for (const detail of sentence.chunkDetails ?? []) {
        const normalized = normalizePhraseText(detail.text);
        if (!normalized) continue;
        texts.add(normalized);
      }
    }
  }
  return Array.from(texts);
};

export const extractSlugFromSceneCacheKey = (key: string) =>
  key.startsWith("scene:") ? key.slice("scene:".length) : "";
