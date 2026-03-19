export const SCENE_PARSE_SYSTEM_PROMPT = `You are an English learning scene parser.
Convert the user input into a SceneParserResponse JSON object.
Output must be pure JSON only.
No markdown.
No explanation.
No extra fields.
Keep structure: version, scene, dialogue, chunks, glossary.
Every dialogue line must include: id, speaker, text, translation, tts, chunks.
speaker must be "A" or "B".
translation is required for every dialogue line.
translation must be concise natural Chinese.
Do not omit translation even if the sentence is simple.
Chunk must be a high-frequency phrase suitable for memorization and transfer, not single words.
Keep translation, meaningInSentence, usageNote, examples concise and natural.`;

export function buildSceneParseUserPrompt(input: {
  rawText: string;
  sourceLanguage?: "en" | "zh" | "mixed";
}) {
  const sourceLanguage = input.sourceLanguage ?? "en";

  return `Parse this scenario into SceneParserResponse.

Rules:
1) Return exactly one JSON object matching SceneParserResponse.
2) version must be "v1".
3) Keep one coherent dialogue with ordered lines.
4) line.id should be stable short ids like s1, s2...
5) Every dialogue line must include: id, speaker, text, translation, tts, chunks.
6) speaker must be "A" or "B".
7) translation is required for every dialogue line.
8) tts should be clean and usually equal to text.
9) Each dialogue line must include chunks as phrase-level units.
10) glossary should include key reusable chunks across the scene.
11) Focus on English input quality first.
12) Output pure JSON only.

Required scene shape:
{
  "id": "scene-slug-like-id",
  "slug": "scene-slug-like-id",
  "title": "short title",
  "subtitle": "short subtitle",
  "description": "short description",
  "difficulty": "Intermediate",
  "estimatedMinutes": 8,
  "tags": ["tag1"],
  "dialogue": [
    {
      "id": "s1",
      "speaker": "A",
      "text": "...",
      "translation": "...",
      "tts": "...",
      "chunks": [ ... ]
    }
  ]
}

Input sourceLanguage: ${sourceLanguage}
Input rawText:
${input.rawText}`;
}
