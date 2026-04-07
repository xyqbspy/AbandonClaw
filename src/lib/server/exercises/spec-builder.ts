import { ExerciseSpec, ParsedScene } from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const MAX_CHUNKS_PER_SENTENCE = 2;

const HIGH_VALUE_GRAMMAR_LABEL_PATTERNS = [
  /phrasal/i,
  /idiom/i,
  /collocation/i,
  /fixed/i,
  /expression/i,
  /搭配/,
  /短语动词/,
  /固定搭配/,
  /习语/,
  /表达/,
] as const;

const hasHighValueGrammarLabel = (label: string | undefined) => {
  const value = (label ?? "").trim();
  return value.length > 0 && HIGH_VALUE_GRAMMAR_LABEL_PATTERNS.some((pattern) => pattern.test(value));
};

const getChunkPriority = (
  chunk: ParsedScene["sections"][number]["blocks"][number]["sentences"][number]["chunks"][number],
) => {
  const text = chunk.text.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lengthScore = Math.min(text.length, 40);
  const multiWordBonus = wordCount >= 2 ? 100 : 0;
  const grammarLabelBonus = hasHighValueGrammarLabel(chunk.grammarLabel) ? 220 : 0;
  const meaningBonus = chunk.meaningInSentence?.trim() ? 18 : 0;
  const usageNoteBonus = chunk.usageNote?.trim() ? 14 : 0;
  return grammarLabelBonus + multiWordBonus + meaningBonus + usageNoteBonus + lengthScore;
};

const getCandidateChunks = (
  sentence: ParsedScene["sections"][number]["blocks"][number]["sentences"][number],
) =>
  [...sentence.chunks]
    .filter((chunk) => chunk.text.trim())
    .sort((left, right) => {
      const priorityDelta = getChunkPriority(right) - getChunkPriority(left);
      if (priorityDelta !== 0) return priorityDelta;
      return left.start - right.start;
    })
    .slice(0, MAX_CHUNKS_PER_SENTENCE)
    .sort((left, right) => left.start - right.start);

export const buildExerciseSpecsFromScene = (
  scene: ParsedScene,
  maxCount = 10,
): ExerciseSpec[] => {
  const normalized = normalizeParsedSceneDialogue(scene);
  const exercises: ExerciseSpec[] = [];

  for (const section of normalized.sections) {
    for (const block of section.blocks) {
      for (const sentence of block.sentences) {
        for (const chunk of getCandidateChunks(sentence)) {
          const blankStart = clamp(chunk.start, 0, sentence.text.length);
          const blankEnd = clamp(chunk.end, blankStart, sentence.text.length);
          const displayText =
            sentence.text.slice(0, blankStart) +
            "____" +
            sentence.text.slice(blankEnd);

          exercises.push({
            id: `ex-${exercises.length + 1}`,
            type: "chunk_cloze",
            inputMode: "typing",
            sceneId: normalized.id,
            sectionId: section.id,
            blockId: block.id,
            sentenceId: sentence.id,
            chunkId: chunk.id,
            prompt: "补全句子中的表达",
            hint: chunk.translation,
            answer: {
              text: chunk.text,
              acceptedAnswers: [chunk.text.toLowerCase()],
            },
            cloze: {
              displayText,
              blankStart,
              blankEnd,
            },
            metadata: {
              source: "scene_chunk",
              sceneType: normalized.type,
              chunkText: chunk.text,
            },
          });

          if (exercises.length >= maxCount) return exercises;
        }
      }
    }
  }

  return exercises;
};
