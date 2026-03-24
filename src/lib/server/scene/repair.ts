import { normalizePhraseText } from "@/lib/shared/phrases";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { ParsedScene, ParsedSceneChunk } from "@/lib/types/scene-parser";

const findChunkRange = (sentenceText: string, chunkText: string) => {
  const text = sentenceText ?? "";
  const chunk = chunkText.trim();
  if (!chunk) return { start: 0, end: 0 };

  const exactIndex = text.indexOf(chunk);
  if (exactIndex >= 0) {
    return { start: exactIndex, end: exactIndex + chunk.length };
  }

  const lowerIndex = text.toLowerCase().indexOf(chunk.toLowerCase());
  if (lowerIndex >= 0) {
    return { start: lowerIndex, end: lowerIndex + chunk.length };
  }

  return { start: 0, end: Math.min(text.length, chunk.length) };
};

const mergeSentenceChunks = (sentenceText: string, chunks: ParsedSceneChunk[]) => {
  const seen = new Set<string>();
  const merged: ParsedSceneChunk[] = [];

  for (const chunk of chunks) {
    const text = chunk.text.trim();
    const normalized = normalizePhraseText(text);
    if (!text || !normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const range = findChunkRange(sentenceText, text);
    merged.push({
      ...chunk,
      start: range.start,
      end: range.end,
    });
  }

  return merged;
};

const normalizeForDuplicateCheck = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
};

const isTrailingDuplicateSentence = (firstText: string, secondText: string) => {
  const first = normalizeForDuplicateCheck(firstText);
  const second = normalizeForDuplicateCheck(secondText);
  if (!first || !second) return false;
  if (first === second) return true;
  return first.endsWith(second) && first.length > second.length;
};

export interface SceneDuplicateSentenceRepairResult {
  repairedScene: ParsedScene;
  changedBlockCount: number;
  changedSentenceCount: number;
}

export const repairGeneratedSceneDuplicateSentences = (
  scene: ParsedScene,
): SceneDuplicateSentenceRepairResult => {
  const normalizedScene = normalizeParsedSceneDialogue(scene);
  let changedBlockCount = 0;
  let changedSentenceCount = 0;

  const repairedSections = normalizedScene.sections.map((section) => ({
    ...section,
    blocks: section.blocks.map((block) => {
      if (block.sentences.length !== 2) return block;

      const [firstSentence, secondSentence] = block.sentences;
      if (
        !firstSentence ||
        !secondSentence ||
        !isTrailingDuplicateSentence(firstSentence.text, secondSentence.text)
      ) {
        return block;
      }

      changedBlockCount += 1;
      changedSentenceCount += 1;

      const mergedChunks = mergeSentenceChunks(firstSentence.text, [
        ...(firstSentence.chunks ?? []),
        ...(secondSentence.chunks ?? []),
      ]);

      const repairedSentence = {
        ...firstSentence,
        chunks: mergedChunks,
      };

      return {
        ...block,
        translation: block.translation?.trim() || firstSentence.translation || "",
        tts: block.tts?.trim() || firstSentence.tts || firstSentence.text,
        sentences: [repairedSentence],
      };
    }),
  }));

  return {
    repairedScene: normalizeParsedSceneDialogue({
      ...normalizedScene,
      sections: repairedSections,
    }),
    changedBlockCount,
    changedSentenceCount,
  };
};
