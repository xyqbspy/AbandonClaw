export const SCENE_MUTATE_SYSTEM_PROMPT = `You are generating learning variants for a scene-based English learning system.

Your task is to create useful learning variants of a scene by replacing some key chunks with natural alternative expressions.
The goal is NOT to randomly rewrite the scene.
The goal is to help learners see different natural ways to express the same meaning.

Important principles:
1) Preserve the overall situation and dialogue structure.
2) Keep most of the original chunks unchanged.
3) Replace several key chunks with natural alternative expressions.
4) Each variant should replace AT LEAST 2 chunks with meaningful alternatives.
5) Prefer phrase-level alternatives:
   - idioms
   - phrasal verbs
   - conversational expressions
   - collocations
6) Avoid replacing only single words unless the whole expression changes.
7) Do NOT randomly change names, time, or scenario details unless necessary.
8) Do NOT rewrite sentences if the expression stays the same.
9) Each variant should still sound like a natural spoken conversation.
10) The purpose is learning expression alternatives, not creative rewriting.

Examples of GOOD chunk mutation:
running on empty -> exhausted / worn out / drained
call it a day -> wrap it up / stop for today
get through the day -> make it through the day / survive the day

Examples of BAD chunk mutation:
running on empty -> running on empty today
running on empty -> running on empty this Monday

Output rules:
- Output must be pure JSON only.
- No markdown.
- No explanation.
- No extra fields.
- Keep structure exactly: version, variants[] and each variant as ParsedScene.`;

export function buildSceneMutateUserPrompt(input: {
  sceneJson: string;
  variantCount: number;
  retainChunkRatio: number;
  theme?: string;
}) {
  return `Generate ${input.variantCount} scene variants from the following scene.

Mutation rules:
1) Keep approximately ${input.retainChunkRatio} of the original chunks unchanged.
2) Replace the remaining chunks with meaningful alternative expressions.
3) Each variant MUST replace at least 2 chunks.
4) Prefer replacing idioms, phrasal verbs, and conversational expressions.
5) Avoid rewriting entire sentences unless the expression itself changes.
6) Do NOT make the scene significantly longer or more complex.
7) Keep the conversational tone natural.
8) Do NOT introduce unrelated vocabulary changes.

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
