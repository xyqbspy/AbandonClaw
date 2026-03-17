import {
  buildStableCacheKey,
  getAiCacheByKey,
  hashPayload,
  setAiCache,
} from "@/lib/server/services/ai-cache-service";
import { ValidationError } from "@/lib/server/errors";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import {
  buildSceneGenerateUserPrompt,
  SCENE_GENERATE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/scene-generate-prompt";
import { parseJsonWithFallback } from "@/lib/server/scene-json";
import { parseImportedSceneWithCache } from "@/lib/server/services/import-parse-service";
import { createImportedScene } from "@/lib/server/services/scene-service";
import { getUserChunkCandidatesForSceneMutation } from "@/lib/server/chunks/service";

const SCENE_GENERATE_PROMPT_VERSION = "scene-generate-v1";
const DEFAULT_SENTENCE_COUNT = 6;

interface GeneratedSceneDraftLine {
  speaker?: string;
  text: string;
}

interface GeneratedSceneDraft {
  version: "v1";
  title: string;
  theme?: string;
  lines: GeneratedSceneDraftLine[];
}

export interface GeneratePersonalizedSceneInput {
  promptText: string;
  tone?: string;
  difficulty?: "easy" | "medium";
  sentenceCount?: number;
  reuseKnownChunks?: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toOptionalTrimmed = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
};

const normalizeSentenceCount = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_SENTENCE_COUNT;
  }
  return clamp(Math.round(value), 4, 8);
};

const normalizeTone = (value: unknown) => {
  const tone = toOptionalTrimmed(value, 40);
  if (!tone) return undefined;
  if (tone === "natural" || tone === "polite" || tone === "casual" || tone === "simple") {
    return tone;
  }
  return "natural";
};

const normalizeDifficulty = (value: unknown) => {
  if (value === "easy" || value === "medium") return value;
  return "medium";
};

const isDraftLine = (value: unknown): value is GeneratedSceneDraftLine => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.text === "string" && row.text.trim().length > 0;
};

const isGeneratedSceneDraft = (value: unknown): value is GeneratedSceneDraft => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (row.version !== "v1") return false;
  if (typeof row.title !== "string" || !row.title.trim()) return false;
  if (!Array.isArray(row.lines)) return false;
  if (row.lines.length < 4 || row.lines.length > 8) return false;
  return row.lines.every(isDraftLine);
};

const toDraftSourceText = (draft: GeneratedSceneDraft) =>
  draft.lines
    .map((line) => {
      const speaker = typeof line.speaker === "string" ? line.speaker.trim() : "";
      const text = line.text.trim();
      return speaker ? `${speaker}: ${text}` : text;
    })
    .join("\n");

const getPromptFromCache = (cacheOutput: unknown) => {
  if (!cacheOutput || typeof cacheOutput !== "object") return null;
  const row = cacheOutput as Record<string, unknown>;
  if (typeof row.generatedSourceText !== "string" || !row.generatedSourceText.trim()) {
    return null;
  }
  return {
    generatedSourceText: row.generatedSourceText.trim(),
    generatedTitle:
      typeof row.generatedTitle === "string" && row.generatedTitle.trim()
        ? row.generatedTitle.trim()
        : undefined,
    generatedTheme:
      typeof row.generatedTheme === "string" && row.generatedTheme.trim()
        ? row.generatedTheme.trim()
        : undefined,
    knownChunksUsed: Array.isArray(row.knownChunksUsed)
      ? row.knownChunksUsed.filter((item): item is string => typeof item === "string")
      : [],
  };
};

export async function getUserChunkCandidatesForSceneGeneration(
  userId: string,
  input: {
    promptText: string;
    limit?: number;
  },
) {
  return getUserChunkCandidatesForSceneMutation(userId, {
    themeHint: input.promptText,
    limit: input.limit ?? 16,
  });
}

export async function generatePersonalizedSceneForUser(
  userId: string,
  rawInput: GeneratePersonalizedSceneInput,
) {
  const runId = `sg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const promptText = toOptionalTrimmed(rawInput.promptText, 800);
  if (!promptText) {
    throw new ValidationError("promptText is required.");
  }

  const sentenceCount = normalizeSentenceCount(rawInput.sentenceCount);
  const tone = normalizeTone(rawInput.tone);
  const difficulty = normalizeDifficulty(rawInput.difficulty);
  const reuseKnownChunks = rawInput.reuseKnownChunks !== false;
  const model = process.env.GLM_MODEL ?? "glm-4.6";
  console.log("[scene.generate] start", {
    runId,
    userId,
    model,
    tone: tone ?? null,
    difficulty,
    sentenceCount,
    reuseKnownChunks,
  });

  const knownChunkCandidates = reuseKnownChunks
    ? await getUserChunkCandidatesForSceneGeneration(userId, {
        promptText,
        limit: 16,
      })
    : [];
  const knownChunks = knownChunkCandidates.map((item) => item.text).slice(0, 12);
  const knownChunksHash = knownChunks.length > 0 ? hashPayload(knownChunks) : null;

  const cacheKey = buildStableCacheKey("scene-generate", {
    cache_type: "scene_generate",
    userId,
    model,
    promptVersion: SCENE_GENERATE_PROMPT_VERSION,
    promptTextHash: hashPayload(promptText),
    tone: tone ?? null,
    difficulty,
    sentenceCount,
    reuseKnownChunks,
    knownChunksHash,
  });

  console.log("[scene.generate] cache lookup", { runId, cacheKey });
  const cached = await getAiCacheByKey(cacheKey);
  let generatedSourceText: string;
  let generatedTitle: string | undefined;
  let generatedTheme: string | undefined;

  if (cached) {
    console.log("[scene.generate] cache hit", { runId, cacheKey });
    const cachedValue = getPromptFromCache(cached.output_json);
    if (cachedValue) {
      generatedSourceText = cachedValue.generatedSourceText;
      generatedTitle = cachedValue.generatedTitle;
      generatedTheme = cachedValue.generatedTheme;
    } else {
      generatedSourceText = "";
    }
  } else {
    console.log("[scene.generate] cache miss", { runId, cacheKey });
    generatedSourceText = "";
  }

  if (!generatedSourceText) {
    console.log("[scene.generate] calling glm", { runId, model, cacheKey });
    const glmStartMs = Date.now();
    const rawModelText = await callGlmChatCompletion({
      model,
      systemPrompt: SCENE_GENERATE_SYSTEM_PROMPT,
      userPrompt: buildSceneGenerateUserPrompt({
        promptText,
        tone,
        difficulty,
        sentenceCount,
        preferredKnownChunks: knownChunks,
        reuseKnownChunks,
      }),
      temperature: 0.35,
    });
    console.log("[scene.generate] glm returned", {
      runId,
      elapsedMs: Date.now() - glmStartMs,
      contentLength: rawModelText.length,
      contentPreview: rawModelText.slice(0, 200),
    });

    console.log("[scene.generate] parsing content", { runId });
    const parsed = parseJsonWithFallback(rawModelText);
    if (!isGeneratedSceneDraft(parsed)) {
      console.error("[scene.generate] parsed invalid", {
        runId,
        parsedType: typeof parsed,
        parsedPreview: JSON.stringify(parsed).slice(0, 400),
      });
      throw new Error("Generated scene draft JSON is invalid.");
    }
    console.log("[scene.generate] parsed ok", {
      runId,
      title: parsed.title,
      lineCount: parsed.lines.length,
    });

    generatedSourceText = toDraftSourceText(parsed);
    generatedTitle = parsed.title.trim();
    generatedTheme = toOptionalTrimmed(parsed.theme, 80);

    await setAiCache({
      cacheKey,
      cacheType: "scene_generate",
      status: "success",
      sourceRef: `user:${userId}`,
      inputHash: hashPayload({
        promptText,
        tone: tone ?? null,
        difficulty,
        sentenceCount,
        reuseKnownChunks,
        knownChunksHash,
      }),
      inputJson: {
        promptText,
        tone: tone ?? null,
        difficulty,
        sentenceCount,
        reuseKnownChunks,
      },
      outputJson: {
        generatedSourceText,
        generatedTitle: generatedTitle ?? null,
        generatedTheme: generatedTheme ?? null,
        knownChunksUsed: knownChunks,
      },
      metaJson: {
        promptVersion: SCENE_GENERATE_PROMPT_VERSION,
      },
      model,
      promptVersion: SCENE_GENERATE_PROMPT_VERSION,
      createdBy: userId,
    });
    console.log("[scene.generate] cache write ok", { runId, cacheKey });
  }

  console.log("[scene.generate] parse scene before", { runId, model });
  const parsed = await parseImportedSceneWithCache({
    sourceText: generatedSourceText,
    sourceLanguage: "en",
    userId,
    model,
  });
  console.log("[scene.generate] parse scene after", {
    runId,
    parseCacheKey: parsed.cacheKey,
    parseSource: parsed.source,
    parseCacheStatus: parsed.cacheStatus,
  });

  console.log("[scene.generate] inserting scene", { runId });
  const scene = await createImportedScene({
    userId,
    sourceText: generatedSourceText,
    title: generatedTitle,
    theme: generatedTheme,
    parsedScene: parsed.parsedScene,
    model,
    promptVersion: SCENE_GENERATE_PROMPT_VERSION,
    cacheKey,
  });
  console.log("[scene.generate] insert ok", {
    runId,
    sceneId: scene.id,
    sceneSlug: scene.slug,
    title: scene.title,
  });

  return {
    scene,
    cache: {
      key: cacheKey,
      source: cached ? "ai_cache" : "glm",
      status: cached ? "hit" : "written",
    },
    personalization: {
      knownChunkCandidateCount: knownChunkCandidates.length,
      knownChunksUsed: knownChunks.slice(0, 6),
      reuseKnownChunks,
    },
  };
}
