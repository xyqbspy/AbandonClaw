export const PRACTICE_GENERATE_SYSTEM_PROMPT = `You generate exercises from scene content.
Use ExerciseSpec schema.
Return JSON only.
No markdown.
No explanation.`;

export function buildPracticeGenerateUserPrompt(input: {
  sceneJson: string;
  expressionFamilies: string;
  exerciseCount: number;
}) {
  return `Generate ${input.exerciseCount} exercises.

Scene:
${input.sceneJson}

Expression Families:
${input.expressionFamilies}

Rules:
1) Use scene sections->blocks->sentences->chunks as the content source.
2) Prefer chunk-based learning and transfer.
3) Keep prompts short and practical.
4) Cover multiple sentences/chunks; avoid repeating one chunk too much.
5) Use allowed types only:
   - chunk_cloze
   - keyword_cloze
   - multiple_choice
   - typing
   - sentence_rebuild
   - translation_prompt

Output JSON:
{
  "version": "v1",
  "exercises": [
    {
      "id": "ex-1",
      "type": "chunk_cloze",
      "inputMode": "typing",
      "sceneId": "...",
      "sectionId": "...",
      "blockId": "...",
      "sentenceId": "...",
      "chunkId": "...",
      "prompt": "...",
      "hint": "...",
      "answer": {
        "text": "...",
        "acceptedAnswers": ["..."]
      },
      "cloze": {
        "displayText": "...",
        "blankStart": 0,
        "blankEnd": 5
      },
      "options": ["..."],
      "metadata": {}
    }
  ]
}

Return pure JSON only.`;
}
