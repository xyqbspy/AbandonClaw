export const PRACTICE_GENERATE_SYSTEM_PROMPT = `You are generating practice exercises for a scene-based English learning system.

The goal is NOT simple sentence memorization.
The goal is to help learners understand how different natural expressions can express the same meaning.

The system teaches language through:
- scenes
- chunks
- expression families
- variants

Therefore exercises should encourage learners to:
1) recall expressions
2) complete expressions
3) rewrite sentences
4) switch expressions within the same meaning family

Important rules:
1) Prefer using expressions from the same expression family.
2) Encourage learners to replace expressions with alternative natural expressions.
3) Exercises must be useful for spoken English.
4) Avoid grammar-only exercises.
5) Avoid overly academic questions.
6) Focus on conversational English.

Allowed exercise types:
recall
fill_chunk
rewrite
expression_switch
expression_replace
expression_choice

Return JSON only.
Do not include explanations.
Do not include markdown.`;

export function buildPracticeGenerateUserPrompt(input: {
  sceneJson: string;
  expressionFamilies: string;
  exerciseCount: number;
}) {
  return `Generate ${input.exerciseCount} exercises for the learner.

Use the following information:

Scene:
${input.sceneJson}

Expression Families:
${input.expressionFamilies}

Rules:
1) Prefer generating exercises using expressions from the same expression family.
2) Encourage switching between expressions with similar meanings.
3) Each exercise should be short and clear.
4) Exercises should feel like natural spoken English practice.
5) Avoid repeating the same sentence structure too many times.
6) Keep exercises simple and conversational.
7) Distribution guideline:
   - Approximately 60% of exercises should use expressions from Expression Families.
   - Approximately 40% of exercises should focus directly on original scene sentences.
8) Do not generate all exercises from the same sentence or same expression.
9) Prefer covering multiple expressions across both scene chunks and expression families.

Output JSON structure:
{
  "version": "v1",
  "exercises": [
    {
      "id": "...",
      "type": "...",
      "prompt": "...",
      "answer": "...",
      "targetChunk": "...",
      "referenceSentence": "..."
    }
  ]
}

Field rules:
- id: unique string id.
- type: one of recall, fill_chunk, rewrite, expression_switch, expression_replace, expression_choice.
- prompt: question shown to learner.
- answer: expected answer.
- targetChunk: expression being practiced.
- referenceSentence: optional original sentence from scene.

Return pure JSON only.`;
}
