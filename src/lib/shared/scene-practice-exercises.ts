import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { deriveDisplayedClozeAnswer, normalizePracticeAnswer } from "@/lib/shared/scene-practice-assessment";
import { ExerciseSpec, ParsedScene } from "@/lib/types/scene-parser";

const toMetadataRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? ({ ...value } as Record<string, unknown>)
    : {};

const toUniqueAnswers = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const clean = value.trim();
    const key = normalizePracticeAnswer(clean);
    if (!clean || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }

  return result;
};

export const normalizePracticeExercisesForScene = (
  scene: ParsedScene,
  exercises: ExerciseSpec[],
): ExerciseSpec[] => {
  const normalizedScene = normalizeParsedSceneDialogue(scene);
  const sentenceMap = new Map(
    normalizedScene.sections
      .flatMap((section) => section.blocks)
      .flatMap((block) => block.sentences)
      .map((sentence) => [sentence.id, sentence] as const),
  );

  return exercises.map((exercise) => {
    if (exercise.type !== "chunk_cloze") return exercise;

    const metadata = toMetadataRecord(exercise.metadata);
    const displayText = exercise.cloze?.displayText ?? null;
    const displayAnswer = deriveDisplayedClozeAnswer(exercise.answer.text, displayText);
    const hasDisplaySpecificAnswer =
      normalizePracticeAnswer(displayAnswer) !== normalizePracticeAnswer(exercise.answer.text);
    const sentence = sentenceMap.get(exercise.sentenceId);
    const chunk = exercise.chunkId
      ? sentence?.chunks.find((item) => item.id === exercise.chunkId)
      : sentence?.chunks[0];

    const canonicalAnswer = hasDisplaySpecificAnswer
      ? displayAnswer
      : chunk?.text?.trim() || exercise.answer.text.trim();
    const acceptedAnswers = toUniqueAnswers([
      canonicalAnswer,
      ...(exercise.answer.acceptedAnswers ?? []).map((item) =>
        deriveDisplayedClozeAnswer(item, displayText),
      ),
    ]);

    const shouldUseSceneChunkText =
      Boolean(chunk?.text?.trim()) &&
      normalizePracticeAnswer(canonicalAnswer) === normalizePracticeAnswer(chunk?.text ?? "");
    const nextDisplayText =
      shouldUseSceneChunkText && sentence
        ? `${sentence.text.slice(0, chunk.start)}____${sentence.text.slice(chunk.end)}`
        : exercise.cloze?.displayText;

    return {
      ...exercise,
      prompt: "补全句子中的表达",
      answer: {
        ...exercise.answer,
        text: canonicalAnswer,
        acceptedAnswers,
      },
      cloze:
        exercise.cloze || nextDisplayText
          ? {
              ...exercise.cloze,
              ...(nextDisplayText ? { displayText: nextDisplayText } : {}),
              ...(shouldUseSceneChunkText && chunk
                ? {
                    blankStart: chunk.start,
                    blankEnd: chunk.end,
                  }
                : {}),
            }
          : undefined,
      metadata: {
        ...metadata,
        chunkText: canonicalAnswer,
        ...(sentence ? { referenceSentence: sentence.text } : {}),
      },
    };
  });
};
