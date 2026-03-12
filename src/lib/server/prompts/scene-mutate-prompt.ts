export const SCENE_MUTATE_SYSTEM_PROMPT = `You are an English learning scene mutator.
Generate micro-variants of the given parsed scene for review and chunk transfer practice.
Output must be pure JSON only.
No markdown.
No explanation.
No extra fields.
Keep structure exactly: version, variants[] and each variant as ParsedScene.
Variants must stay closely related to the original scene, not unrelated new stories.
Retain 50%-70% core chunks from the original scene unless user input specifies a ratio.
Only change a small amount of context elements: reason, time, person, or outcome.
Do not significantly increase difficulty.`;

export function buildSceneMutateUserPrompt(input: {
  sceneJson: string;
  variantCount: number;
  retainChunkRatio: number;
  theme?: string;
}) {
  return `Generate scene micro-variants from this parsed scene JSON.

Rules:
1) Return exactly one JSON object:
{"version":"v1","variants": ParsedScene[] }
2) Number of variants must be ${input.variantCount}.
3) Keep approximate chunk retention ratio around ${input.retainChunkRatio}.
4) Reuse most sentence rhythm and chunk usage.
5) Only make small contextual changes.
6) Keep English-learning practicality and natural Chinese translations.
7) Keep difficulty around Intermediate.
8) Do not output markdown.

Theme hint (optional): ${input.theme ?? "none"}
Original scene JSON:
${input.sceneJson}`;
}
