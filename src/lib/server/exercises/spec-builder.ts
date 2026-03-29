import { ExerciseSpec, ParsedScene } from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const buildExerciseSpecsFromScene = (
  scene: ParsedScene,
  maxCount = 10,
): ExerciseSpec[] => {
  const normalized = normalizeParsedSceneDialogue(scene);
  const exercises: ExerciseSpec[] = [];

  for (const section of normalized.sections) {
    for (const block of section.blocks) {
      for (const sentence of block.sentences) {
        const chunk = sentence.chunks[0];
        if (!chunk || !chunk.text.trim()) continue;

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

  return exercises;
};
