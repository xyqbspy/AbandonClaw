export const SCENE_GENERATE_SYSTEM_PROMPT = `You generate short English-learning scenes.

This is not open-ended chat.
Produce a practical, role-playable scene for speaking practice.
Keep it short, natural, and easy to memorize.

Output JSON only.
No markdown.
No explanations.`;

export function buildSceneGenerateUserPrompt(input: {
  promptText: string;
  mode: "context" | "anchor_sentence";
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
  const modeInstruction =
    input.mode === "anchor_sentence"
      ? `Generation mode:
anchor_sentence

Anchor sentence:
${input.promptText}

Anchor sentence rules:
1) Build the scene around this exact English sentence.
2) The exact anchor sentence must appear in the final dialogue text at least once.
3) The anchor sentence must be a key speaking turn, not a throwaway line.
4) Add realistic context so the anchor sentence feels natural to practice.
5) Do not paraphrase away the anchor sentence.`
      : `Generation mode:
context

User intent (CN or EN):
${input.promptText}

Context mode rules:
1) Treat the input as a situation or practice intent.
2) Generate one coherent scenario with clear context and goal.`;

  return `Create one English learning scene.

${modeInstruction}

Constraints:
1) Use 6-14 short conversational sentences in total. Target sentence count: ${input.sentenceCount}.
2) Keep language natural spoken English, not academic.
3) Difficulty should be ${input.difficulty ?? "medium"}.
4) Tone should be ${input.tone ?? "natural"}.
5) Keep total length compact and suitable for memorization.
6) Keep sentences practical for repetition and role-play.
7) Avoid irrelevant topic drifting.
8) If reuseKnownChunks is true, naturally reuse some suitable known chunks, but never force.
9) If a known chunk does not fit the context, skip it.
10) Prioritize known chunks first for familiarity.
11) You may optionally introduce 1-2 related chunk variants from the same expression cluster to support familiar-expression transfer.
12) Do not replace all known chunks with new variants.
13) Keep dialogue natural and realistic; variant use should feel organic.
14) Turn design intent:
   - each turn is one speaking block.
   - speaker change implies a new turn.
   - same speaker may have 1-3 short sentences inside one turn when they belong to one speaking intent.
   - do not split one natural speaking turn into many tiny one-sentence turns without reason.
15) title must be bilingual in this format: English title（中文标题）.

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
  "turns": [
    {
      "speaker": "A",
      "translation": "...",
      "tts": "...",
      "sentences": [
        {"text": "...", "translation": "...", "tts": "..."}
      ]
    },
    {
      "speaker": "B",
      "translation": "...",
      "tts": "...",
      "sentences": [
        {"text": "...", "translation": "...", "tts": "..."}
      ]
    }
  ]
}

Rules for turns:
- total sentence count across all turns must be between 6 and 14.
- each turn must have 1-3 sentences.
- each sentence text should be concise.
- speaker should use uppercase labels such as A/B/C/D when needed.
- every sentence.translation must be concise natural Chinese.
- every sentence.tts should be clean, no emoji/symbol noise, usually same as text.
- turn.translation should summarize the full turn naturally in Chinese.
- turn.tts should be the full-turn readout text.

Return pure JSON only.`;
}
