export const SCENE_PARSE_SYSTEM_PROMPT = `You are an English learning scene parser.
Convert the user input into a SceneParserResponse JSON object.
Output must be pure JSON only.
No markdown.
No explanation.
No extra fields.
Keep structure: version, scene, sections, sentences, chunks, glossary.
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
2) version must be \"v1\".
3) Keep 1 section unless clearly multi-scene.
4) sentence.id should be stable short ids like s1, s2...
5) Each sentence must include chunks as phrase-level units.
6) glossary should include key reusable chunks across the scene.
7) Focus on English input quality first.

Input sourceLanguage: ${sourceLanguage}
Input rawText:
${input.rawText}`;
}
