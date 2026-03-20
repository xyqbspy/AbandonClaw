import {
  ParsedScene,
  ParsedSceneBlock,
  ParsedSceneChunk,
  ParsedSceneSentence,
  SceneSpeaker,
  SceneType,
} from "@/lib/types/scene-parser";

const toSceneType = (value: unknown): SceneType =>
  value === "dialogue" || value === "monologue" ? value : "monologue";

const toSpeaker = (value: unknown): SceneSpeaker => {
  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    if (v) return v;
  }
  return "A";
};

const findChunkRange = (sentenceText: string, chunkText: string) => {
  const text = sentenceText ?? "";
  const chunk = (chunkText ?? "").trim();
  if (!chunk) return { start: 0, end: 0 };

  const exact = text.indexOf(chunk);
  if (exact >= 0) return { start: exact, end: exact + chunk.length };

  const lower = text.toLowerCase();
  const lowerChunk = chunk.toLowerCase();
  const lowerIdx = lower.indexOf(lowerChunk);
  if (lowerIdx >= 0) return { start: lowerIdx, end: lowerIdx + chunk.length };

  return { start: 0, end: Math.min(text.length, chunk.length) };
};

const normalizeChunk = (chunk: ParsedSceneChunk, sentenceText: string, index: number): ParsedSceneChunk => {
  const text = chunk.text?.trim() || chunk.key?.trim() || `chunk-${index + 1}`;
  const range =
    typeof chunk.start === "number" && typeof chunk.end === "number"
      ? { start: chunk.start, end: chunk.end }
      : findChunkRange(sentenceText, text);

  return {
    id: chunk.id?.trim() || chunk.key?.trim() || `chunk-${index + 1}`,
    key: chunk.key?.trim() || text,
    text,
    translation: chunk.translation,
    grammarLabel: chunk.grammarLabel,
    meaningInSentence: chunk.meaningInSentence,
    usageNote: chunk.usageNote,
    pronunciation: chunk.pronunciation,
    examples: Array.isArray(chunk.examples) ? chunk.examples : [],
    notes: Array.isArray(chunk.notes) ? chunk.notes : undefined,
    start: range.start,
    end: range.end,
  };
};

const normalizeSentence = (sentence: ParsedSceneSentence, sentenceIndex: number): ParsedSceneSentence => {
  const text = (sentence.text ?? "").trim();
  return {
    id: sentence.id || `sentence-${sentenceIndex + 1}`,
    text,
    translation: sentence.translation?.trim() || "",
    tts: sentence.tts?.trim() || text,
    chunks: (sentence.chunks ?? []).map((chunk, chunkIndex) =>
      normalizeChunk(chunk, text, chunkIndex),
    ),
  };
};

const normalizeBlock = (block: ParsedSceneBlock, index: number, fallbackType: SceneType): ParsedSceneBlock => {
  if (!Array.isArray(block.sentences)) {
    throw new Error(`Invalid scene structure: block(${block.id || index + 1}) missing sentences[]`);
  }
  if (block.sentences.length > 2) {
    throw new Error(`Invalid scene structure: block(${block.id || index + 1}) has more than 2 sentences.`);
  }
  const blockType = block.type || fallbackType;
  if (blockType === "dialogue" && (!block.speaker || !String(block.speaker).trim())) {
    throw new Error(`Invalid scene structure: dialogue block(${block.id || index + 1}) missing speaker.`);
  }
  const normalizedSentences = block.sentences.map((sentence, sentenceIndex) =>
    normalizeSentence(sentence, sentenceIndex),
  );
  const fallbackTranslation = normalizedSentences
    .map((sentence) => sentence.translation?.trim())
    .filter(Boolean)
    .join(" ");
  const fallbackTts = normalizedSentences
    .map((sentence) => sentence.tts?.trim() || sentence.text)
    .filter(Boolean)
    .join(" ");
  return {
    id: block.id || `block-${index + 1}`,
    type: blockType,
    speaker:
      blockType === "dialogue"
        ? toSpeaker(block.speaker)
        : (typeof block.speaker === "string" && block.speaker.trim()
            ? block.speaker.trim().toUpperCase()
            : "A"),
    translation: block.translation?.trim() || fallbackTranslation,
    tts: block.tts?.trim() || fallbackTts,
    sentences: normalizedSentences,
  };
};

export const getParsedSceneBlocks = (scene: ParsedScene): ParsedSceneBlock[] =>
  scene.sections.flatMap((section) => section.blocks);

export const getParsedSceneSentences = (scene: ParsedScene): ParsedSceneSentence[] =>
  getParsedSceneBlocks(scene).flatMap((block) => block.sentences);

export const normalizeParsedSceneDialogue = (scene: ParsedScene): ParsedScene => {
  const sceneType = toSceneType(scene.type);
  if (!Array.isArray(scene.sections)) {
    throw new Error("Invalid scene structure: sections[] is required.");
  }
  const sections = scene.sections.map((section, sectionIndex) => {
    if (!Array.isArray(section.blocks)) {
      throw new Error(`Invalid scene structure: section(${section.id || sectionIndex + 1}) missing blocks[]`);
    }
    return {
      id: section.id || `section-${sectionIndex + 1}`,
      title: section.title,
      summary: section.summary,
      blocks: section.blocks.map((block, blockIndex) =>
        normalizeBlock(block, blockIndex, sceneType),
      ),
    };
  });

  return {
    ...scene,
    type: sceneType,
    difficulty: scene.difficulty ?? "Intermediate",
    estimatedMinutes: scene.estimatedMinutes ?? 8,
    tags: Array.isArray(scene.tags) ? scene.tags : [],
    sections,
  };
};
