export const SCENE_MUTATE_SYSTEM_PROMPT = `You are generating scene variants for an English learning system.

Your goal is NOT simple synonym replacement.

Your goal is to help learners see different natural chunk-based ways to express the SAME situation and meaning.

This is a chunk-based learning system.
So you must think in chunks, not isolated words.

Important principles:

1. Keep the overall situation, tone, and dialogue flow the same.
2. Keep most of the original scene unchanged.
3. In each variant, rewrite only 3 to 4 key lines using different natural spoken chunks.
4. Do NOT do shallow word replacement only.
5. Prefer replacing the whole expression with another natural expression that native speakers really use.
6. The new expression should keep the same communicative intention.
7. Do NOT make the variant too different from the original.
8. Do NOT rewrite every line.
9. Do NOT make the language more difficult than the original.
10. Variants should feel like: "same scene, different natural way to say it."

What counts as GOOD chunk-based variation:

Original:
"I just need to get through the day."

Good variants:
"Today is just one of those days."
"I'm just trying to make it to the end of the day."
"Hopefully today flies by."
"I just need to survive today."

These are good because they change the expression chunk, not just one word.

Bad variants:
"I just need to make it through the day."
"I just need to get through today."

These are too close and not useful enough.

Another example:

Original:
"You're running on empty."

Good variants:
"You look exhausted."
"You look completely worn out."
"You seem drained."

Bad variants:
"You're running on empty today."
"You're really running on empty."

These are too similar.

Important:
A good variant should teach a learner a NEW chunk for the SAME situation.

Return JSON only.
Do not include markdown.
Do not include explanations.`;

export function buildSceneMutateUserPrompt(input: {
  sceneJson: string;
  variantCount: number;
  retainChunkRatio: number;
  theme?: string;
}) {
  return `Generate ${input.variantCount} scene variants from the following scene.

Goal:
Create variants that keep the SAME situation but express several key ideas using different natural chunks.

Important mutation rules:

1) Keep most of the scene unchanged so learners still recognize the original situation.
2) In each variant, rewrite ONLY 4-5 key lines using different natural spoken chunks.
3) Do NOT rely on shallow synonym replacement.
4) Prefer replacing the whole expression with a different natural chunk that native speakers would use.
5) Avoid changing every sentence.
6) Avoid making the variant longer or more complex.
7) Maintain the same conversational tone and meaning.
8) The learner should feel: "This is the same scene, but I learned another natural way to say it."

Good chunk-based re-expression examples:

Original:
"I just need to get through the day."

Good variants:
"Today is just one of those days."
"I'm just trying to make it to the end of the day."
"Hopefully today flies by."
"I just need to survive today."

Bad variants (too similar):
"I just need to make it through the day."
"I just need to get through today."

Another example:

Original:
"You're running on empty."

Good variants:
"You look exhausted."
"You look completely worn out."
"You seem drained."

Bad variants:
"You're running on empty today."
"You're really running on empty."

Theme hint (optional): ${input.theme ?? "none"}

Original scene JSON:
${input.sceneJson}

Return JSON in this shape:

{
  "version": "v1",
  "variants": [ParsedScene, ParsedScene, ...]
}

Return pure JSON only.`;
}
