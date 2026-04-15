import { SavePhraseInput } from "@/lib/server/phrases/service";
import type { GeneratePersonalizedSceneInput } from "@/lib/server/scene/generation";
import { isValidParsedScene } from "@/lib/server/scene-json";
import { SceneSourceLanguage, PracticeGenerateRequest } from "@/lib/types/scene-parser";
import { ExplainSelectionRequest } from "@/lib/types";
import {
  parseJsonBody,
  parseOptionalNonNegativeDelta,
  parseOptionalNonNegativeInt,
  parseOptionalReviewFullOutputStatus,
  parseOptionalReviewOutputConfidence,
  parseOptionalReviewRecognitionState,
  parseOptionalTrimmedString,
  parseProgressPercent,
  parseRequiredStringArray,
  parseRequiredObjectArray,
  parseRequiredTrimmedString,
  parseReviewResult,
} from "@/lib/server/validation";
import { ValidationError } from "@/lib/server/errors";
import { normalizePhraseText } from "@/lib/shared/phrases";

interface SavePhrasePayload extends Record<string, unknown> {
  text?: unknown;
  learningItemType?: unknown;
  sentenceText?: unknown;
  translation?: unknown;
  usageNote?: unknown;
  difficulty?: unknown;
  tags?: unknown;
  sourceSceneSlug?: unknown;
  sourceType?: unknown;
  sourceNote?: unknown;
  sourceSentenceIndex?: unknown;
  sourceSentenceText?: unknown;
  sourceChunkText?: unknown;
  expressionClusterId?: unknown;
  relationSourceUserPhraseId?: unknown;
  relationType?: unknown;
}

interface SaveAllPayload extends Record<string, unknown> {
  items?: unknown;
}

interface ReviewSubmitPayload extends Record<string, unknown> {
  userPhraseId?: unknown;
  reviewResult?: unknown;
  source?: unknown;
  recognitionState?: unknown;
  outputConfidence?: unknown;
  fullOutputStatus?: unknown;
}

interface UpdateProgressPayload extends Record<string, unknown> {
  progressPercent?: unknown;
  lastSentenceIndex?: unknown;
  lastVariantIndex?: unknown;
  studySecondsDelta?: unknown;
  savedPhraseDelta?: unknown;
}

interface CompletePayload extends Record<string, unknown> {
  studySecondsDelta?: unknown;
  savedPhraseDelta?: unknown;
}

interface ExplainSelectionPayload extends Record<string, unknown> {
  selectedText?: unknown;
  sourceSentence?: unknown;
  sourceTranslation?: unknown;
  sourceChunks?: unknown;
  lessonId?: unknown;
  lessonTitle?: unknown;
  lessonDifficulty?: unknown;
}

interface GenerateScenePayload extends Record<string, unknown> {
  promptText?: unknown;
  tone?: unknown;
  difficulty?: unknown;
  sentenceCount?: unknown;
  reuseKnownChunks?: unknown;
}

interface ImportScenePayload extends Record<string, unknown> {
  sourceText?: unknown;
  title?: unknown;
  theme?: unknown;
  sourceLanguage?: unknown;
}

interface PracticeGeneratePayload extends Record<string, unknown> {
  scene?: unknown;
  exerciseCount?: unknown;
}

const parseLearningItemType = (value: unknown) => {
  const raw = parseOptionalTrimmedString(value, "learningItemType", 20);
  if (raw === "sentence") return "sentence";
  if (raw === "expression") return "expression";
  return "expression";
};

const parseSourceType = (value: unknown, sourceSceneSlug: string | undefined) => {
  const raw = parseOptionalTrimmedString(value, "sourceType", 20);
  if (raw === "manual") return "manual";
  if (raw === "scene") return "scene";
  return sourceSceneSlug ? "scene" : "manual";
};

const parseOptionalBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  return fallback;
};

const isSourceLanguage = (value: unknown): value is SceneSourceLanguage =>
  value === "en" || value === "zh" || value === "mixed";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const PRACTICE_MAX_SECTIONS = 12;
const PRACTICE_MAX_BLOCKS = 80;
const PRACTICE_MAX_SENTENCES = 400;
const PRACTICE_MAX_CHUNKS = 1200;
const PRACTICE_MAX_TEXT_LENGTH = 40000;

const sanitizeExerciseCount = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 6;
  return clamp(Math.round(value), 3, 12);
};

const measurePracticeScenePayload = (scene: PracticeGenerateRequest["scene"]) => {
  let blockCount = 0;
  let sentenceCount = 0;
  let chunkCount = 0;
  let textLength = 0;

  textLength += scene.title.length;
  textLength += scene.subtitle?.length ?? 0;
  textLength += scene.description?.length ?? 0;

  for (const section of scene.sections) {
    textLength += section.title?.length ?? 0;
    textLength += section.summary?.length ?? 0;
    blockCount += section.blocks.length;

    for (const block of section.blocks) {
      textLength += block.translation?.length ?? 0;
      textLength += block.tts?.length ?? 0;
      sentenceCount += block.sentences.length;

      for (const sentence of block.sentences) {
        textLength += sentence.text.length;
        textLength += sentence.translation?.length ?? 0;
        textLength += sentence.tts?.length ?? 0;
        chunkCount += sentence.chunks.length;

        for (const chunk of sentence.chunks) {
          textLength += chunk.text.length;
          textLength += chunk.translation?.length ?? 0;
          textLength += chunk.grammarLabel?.length ?? 0;
          textLength += chunk.meaningInSentence?.length ?? 0;
          textLength += chunk.usageNote?.length ?? 0;
          textLength += chunk.pronunciation?.length ?? 0;
          textLength += (chunk.notes ?? []).reduce((sum, item) => sum + item.length, 0);
          textLength += (chunk.examples ?? []).reduce(
            (sum, item) => sum + item.en.length + item.zh.length,
            0,
          );
        }
      }
    }
  }

  return {
    sections: scene.sections.length,
    blocks: blockCount,
    sentences: sentenceCount,
    chunks: chunkCount,
    textLength,
  };
};

export const normalizeSavePhrasePayload = (payload: SavePhrasePayload): SavePhraseInput => {
  const sourceSceneSlug = parseOptionalTrimmedString(
    payload.sourceSceneSlug,
    "sourceSceneSlug",
    200,
  );
  const learningItemType = parseLearningItemType(payload.learningItemType);

  return {
    text: parseOptionalTrimmedString(payload.text, "text", 200) ?? undefined,
    learningItemType,
    sentenceText:
      parseOptionalTrimmedString(payload.sentenceText, "sentenceText", 3000) ?? undefined,
    translation: parseOptionalTrimmedString(payload.translation, "translation", 500),
    usageNote: parseOptionalTrimmedString(payload.usageNote, "usageNote", 1000),
    difficulty: parseOptionalTrimmedString(payload.difficulty, "difficulty", 64),
    tags: Array.isArray(payload.tags)
      ? payload.tags.filter((item): item is string => typeof item === "string")
      : [],
    sourceSceneSlug,
    sourceType: parseSourceType(payload.sourceType, sourceSceneSlug),
    sourceNote: parseOptionalTrimmedString(payload.sourceNote, "sourceNote", 300),
    sourceSentenceIndex: parseOptionalNonNegativeInt(
      payload.sourceSentenceIndex,
      "sourceSentenceIndex",
    ),
    sourceSentenceText: parseOptionalTrimmedString(
      payload.sourceSentenceText,
      "sourceSentenceText",
      3000,
    ),
    sourceChunkText: parseOptionalTrimmedString(payload.sourceChunkText, "sourceChunkText", 500),
    expressionClusterId: parseOptionalTrimmedString(
      payload.expressionClusterId,
      "expressionClusterId",
      120,
    ),
    relationSourceUserPhraseId: parseOptionalTrimmedString(
      payload.relationSourceUserPhraseId,
      "relationSourceUserPhraseId",
      120,
    ),
    relationType:
      parseOptionalTrimmedString(payload.relationType, "relationType", 20) === "contrast"
        ? "contrast"
        : parseOptionalTrimmedString(payload.relationType, "relationType", 20) === "similar"
          ? "similar"
          : undefined,
  };
};

export const parseSavePhraseRequest = (request: Request) =>
  parseJsonBody<SavePhrasePayload>(request);

export const normalizeSavePhraseBatchPayload = (payload: SaveAllPayload) => {
  const safeTrim = (value: unknown, maxLength: number) =>
    typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  const rawItems = parseRequiredObjectArray(payload.items, "items", {
    minItems: 1,
    maxItems: 50,
  });
  const dedupe = new Set<string>();
  const items = rawItems.filter((raw) => {
    const candidate = (raw ?? {}) as SavePhrasePayload;
    const learningItemType = parseLearningItemType(candidate.learningItemType);
    const text =
      learningItemType === "sentence"
        ? safeTrim(candidate.sentenceText, 3000)
        : safeTrim(candidate.text, 200);
    const key = `${learningItemType}:${normalizePhraseText(text)}`;
    if (!key || key.endsWith(":")) return true;
    if (dedupe.has(key)) return false;
    dedupe.add(key);
    return true;
  });
  if (items.length === 0) {
    throw new ValidationError("items is empty.");
  }
  return items.map((raw) => normalizeSavePhrasePayload((raw ?? {}) as SavePhrasePayload));
};

export const parseSavePhraseBatchRequest = (request: Request) =>
  parseJsonBody<SaveAllPayload>(request);

export const normalizeReviewSubmitPayload = (payload: ReviewSubmitPayload) => ({
  userPhraseId: parseRequiredTrimmedString(payload.userPhraseId, "userPhraseId", 64),
  reviewResult: parseReviewResult(payload.reviewResult),
  source: parseOptionalTrimmedString(payload.source, "source", 80),
  recognitionState: parseOptionalReviewRecognitionState(payload.recognitionState),
  outputConfidence: parseOptionalReviewOutputConfidence(payload.outputConfidence),
  fullOutputStatus: parseOptionalReviewFullOutputStatus(payload.fullOutputStatus),
});

export const parseReviewSubmitRequest = (request: Request) =>
  parseJsonBody<ReviewSubmitPayload>(request);

export const normalizeLearningProgressPayload = (payload: UpdateProgressPayload) => ({
  progressPercent:
    payload.progressPercent == null ? undefined : parseProgressPercent(payload.progressPercent),
  lastSentenceIndex: parseOptionalNonNegativeInt(payload.lastSentenceIndex, "lastSentenceIndex"),
  lastVariantIndex: parseOptionalNonNegativeInt(payload.lastVariantIndex, "lastVariantIndex"),
  studySecondsDelta: parseOptionalNonNegativeDelta(payload.studySecondsDelta, "studySecondsDelta"),
  savedPhraseDelta: parseOptionalNonNegativeDelta(payload.savedPhraseDelta, "savedPhraseDelta"),
});

export const parseLearningProgressRequest = (request: Request) =>
  parseJsonBody<UpdateProgressPayload>(request);

export const normalizeLearningCompletePayload = (payload: CompletePayload) => ({
  studySecondsDelta: parseOptionalNonNegativeDelta(payload.studySecondsDelta, "studySecondsDelta"),
  savedPhraseDelta: parseOptionalNonNegativeDelta(payload.savedPhraseDelta, "savedPhraseDelta"),
});

export const parseLearningCompleteRequest = (request: Request) =>
  parseJsonBody<CompletePayload>(request);

export const normalizeExplainSelectionPayload = (
  payload: ExplainSelectionPayload,
): ExplainSelectionRequest => ({
  selectedText: parseRequiredTrimmedString(payload.selectedText, "selectedText", 240),
  sourceSentence: parseRequiredTrimmedString(payload.sourceSentence, "sourceSentence", 1500),
  sourceTranslation: parseOptionalTrimmedString(
    payload.sourceTranslation,
    "sourceTranslation",
    1500,
  ),
  sourceChunks:
    payload.sourceChunks == null
      ? undefined
      : parseRequiredStringArray(payload.sourceChunks, "sourceChunks", {
          maxItems: 24,
          maxItemLength: 200,
        }),
  lessonId: parseRequiredTrimmedString(payload.lessonId, "lessonId", 120),
  lessonTitle: parseRequiredTrimmedString(payload.lessonTitle, "lessonTitle", 160),
  lessonDifficulty: parseRequiredTrimmedString(payload.lessonDifficulty, "lessonDifficulty", 40),
});

export const parseExplainSelectionRequest = (request: Request) =>
  parseJsonBody<ExplainSelectionPayload>(request);

export const normalizeGenerateScenePayload = (
  payload: GenerateScenePayload,
): GeneratePersonalizedSceneInput => ({
  promptText: parseRequiredTrimmedString(payload.promptText, "promptText", 800),
  tone: typeof payload.tone === "string" ? payload.tone : undefined,
  difficulty:
    payload.difficulty === "easy" || payload.difficulty === "medium"
      ? payload.difficulty
      : undefined,
  sentenceCount: typeof payload.sentenceCount === "number" ? payload.sentenceCount : undefined,
  reuseKnownChunks: parseOptionalBoolean(payload.reuseKnownChunks, true),
});

export const parseGenerateSceneRequest = (request: Request) =>
  parseJsonBody<GenerateScenePayload>(request);

export const normalizeImportScenePayload = (payload: ImportScenePayload) => {
  const sourceText = parseRequiredTrimmedString(payload.sourceText, "sourceText", 8000);
  if (sourceText.length < 10) {
    throw new ValidationError("sourceText is too short.");
  }

  return {
    sourceText,
    title: parseOptionalTrimmedString(payload.title, "title", 120),
    theme: parseOptionalTrimmedString(payload.theme, "theme", 80),
    sourceLanguage: isSourceLanguage(payload.sourceLanguage) ? payload.sourceLanguage : "en",
  };
};

export const parseImportSceneRequest = (request: Request) =>
  parseJsonBody<ImportScenePayload>(request);

export const normalizePracticeGeneratePayload = (payload: PracticeGeneratePayload) => {
  if (!isValidParsedScene(payload.scene)) {
    throw new ValidationError("练习题生成请求无效。");
  }

  const metrics = measurePracticeScenePayload(payload.scene);
  if (metrics.sections > PRACTICE_MAX_SECTIONS) {
    throw new ValidationError(`场景分段数超过上限 ${PRACTICE_MAX_SECTIONS}。`);
  }
  if (metrics.blocks > PRACTICE_MAX_BLOCKS) {
    throw new ValidationError(`场景块数超过上限 ${PRACTICE_MAX_BLOCKS}。`);
  }
  if (metrics.sentences > PRACTICE_MAX_SENTENCES) {
    throw new ValidationError(`场景句子数超过上限 ${PRACTICE_MAX_SENTENCES}。`);
  }
  if (metrics.chunks > PRACTICE_MAX_CHUNKS) {
    throw new ValidationError(`场景表达块数超过上限 ${PRACTICE_MAX_CHUNKS}。`);
  }
  if (metrics.textLength > PRACTICE_MAX_TEXT_LENGTH) {
    throw new ValidationError(`场景文本长度超过上限 ${PRACTICE_MAX_TEXT_LENGTH}。`);
  }

  return {
    scene: payload.scene,
    exerciseCount: sanitizeExerciseCount(payload.exerciseCount),
  };
};

export const parsePracticeGenerateRequest = (request: Request) =>
  parseJsonBody<PracticeGeneratePayload>(request);
