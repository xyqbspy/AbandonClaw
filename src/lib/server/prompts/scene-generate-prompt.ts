export const SCENE_GENERATE_SYSTEM_PROMPT = `You generate short English-learning scenes.

This is not open-ended chat.
Produce a practical, role-playable scene for speaking practice.
Keep it short, natural, and easy to memorize.

Output JSON only.
No markdown.
No explanations.`;

export function buildSceneGenerateUserPrompt(input: {
  promptText: string;
  tone?: string;
  difficulty?: string;
  sentenceCount: number;
  preferredKnownChunks: string[];
  relatedChunkVariants: Array<{ text: string; differenceLabel: string }>;
  reuseKnownChunks: boolean;
}) {
  const knownChunks =
    input.preferredKnownChunks.length > 0
      ? input.preferredKnownChunks.join(", ")
      : "none";
  const relatedVariants =
    input.relatedChunkVariants.length > 0
      ? input.relatedChunkVariants
          .map((item) => `${item.text} (${item.differenceLabel})`)
          .join("; ")
      : "none";

  return `Create one English learning scene.

User intent (CN or EN):
${input.promptText}

Constraints:
1) Generate one coherent scenario with clear context and goal.
2) Use 6-14 short conversational lines. Target line count: ${input.sentenceCount}.
3) Keep language natural spoken English, not academic.
4) Difficulty should be ${input.difficulty ?? "medium"}.
5) Tone should be ${input.tone ?? "natural"}.
6) Keep total length compact and suitable for memorization.
7) Keep lines practical for repetition and role-play.
8) Avoid irrelevant topic drifting.
9) If reuseKnownChunks is true, naturally reuse some suitable known chunks, but never force.
10) If a known chunk does not fit the context, skip it.
11) Prioritize known chunks first for familiarity.
12) You may optionally introduce 1-2 related chunk variants from the same expression cluster to support familiar-expression transfer.
13) Do not replace all known chunks with new variants.
14) Keep dialogue natural and realistic; variant use should feel organic.
15) Block-splitting intent (for downstream parser):
   - default one line = one block.
   - speaker change implies a new block.
   - same speaker can have up to 2 consecutive lines only when tightly connected as one thought.
16) title must be bilingual in this format: English title（中文标题）.

reuseKnownChunks: ${input.reuseKnownChunks ? "true" : "false"}
Known user chunks:
${knownChunks}
Related chunk variants (text + tiny nuance):
${relatedVariants}

Return JSON with this exact shape:
{
  "version": "v1",
  "title": "short English title（中文标题）",
  "theme": "optional short theme",
  "dialogue": [
    {"speaker": "A", "text": "...", "translation": "...", "tts": "..."},
    {"speaker": "B", "text": "...", "translation": "...", "tts": "..."}
  ]
}

Rules for dialogue:
- dialogue length must be between 6 and 14.
- each line text should be concise.
- speaker should use uppercase labels such as A/B/C/D when needed.
- translation must be concise natural Chinese.
- tts should be clean, no emoji/symbol noise, usually same as text.

Return pure JSON only.`;
}
