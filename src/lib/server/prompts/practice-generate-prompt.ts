export const PRACTICE_GENERATE_SYSTEM_PROMPT = `You are an English learning exercise generator.
Generate foundational practice exercises from the given parsed scene.
Output must be pure JSON only.
No markdown.
No explanation.
No extra fields.
Exercise types allowed only: recall, fill_chunk, rewrite.
No multiple-choice questions.
Prioritize core chunks and transfer practice.
Difficulty should stay around Intermediate.`;

export function buildPracticeGenerateUserPrompt(input: {
  sceneJson: string;
  exerciseCount: number;
}) {
  return `Generate practice exercises from this ParsedScene JSON.

Rules:
1) Return exactly one JSON object:
{"version":"v1","exercises": PracticeExercise[] }
2) Number of exercises must be ${input.exerciseCount}.
3) exercise.type only from: recall | fill_chunk | rewrite.
4) No multiple-choice format.
5) Most exercises should target reusable core chunks.
6) Keep prompts concise and clear for English learners.
7) Keep answers concise and directly checkable.

ParsedScene JSON:
${input.sceneJson}`;
}
