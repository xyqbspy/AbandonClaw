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
  reuseKnownChunks: boolean;
}) {
  const knownChunks =
    input.preferredKnownChunks.length > 0
      ? input.preferredKnownChunks.join(", ")
      : "none";

  return `Create one English learning scene.

User intent (CN or EN):
${input.promptText}

Constraints:
1) Generate one coherent scenario with clear context and goal.
2) Use 4-8 short conversational lines. Target line count: ${input.sentenceCount}.
3) Keep language natural spoken English, not academic.
4) Difficulty should be ${input.difficulty ?? "medium"}.
5) Tone should be ${input.tone ?? "natural"}.
6) Keep total length compact and suitable for memorization.
7) Keep lines practical for repetition and role-play.
8) Avoid irrelevant topic drifting.
9) If reuseKnownChunks is true, naturally reuse some suitable known chunks, but never force.
10) If a known chunk does not fit the context, skip it.

reuseKnownChunks: ${input.reuseKnownChunks ? "true" : "false"}
Known user chunks:
${knownChunks}

Return JSON with this exact shape:
{
  "version": "v1",
  "title": "short scene title",
  "theme": "optional short theme",
  "lines": [
    {"speaker": "A", "text": "..."},
    {"speaker": "B", "text": "..."}
  ]
}

Rules for lines:
- lines length must be between 4 and 8.
- each line text should be concise.
- speaker should be short labels like A/B or Clerk/Customer.

Return pure JSON only.`;
}
