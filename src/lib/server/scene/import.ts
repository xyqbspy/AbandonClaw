import {
  buildSceneParseUserPrompt,
  SCENE_PARSE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/scene-parse-prompt";
import {
  isValidParsedScene,
  isValidSceneParserResponse,
  normalizeSceneParserResponseVersion,
  parseJsonWithFallback,
} from "@/lib/server/scene-json";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import { ParsedScene, SceneSourceLanguage } from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import {
  buildSceneParseCacheKey,
  getAiCacheByKey,
  hashPayload,
  setAiCache,
} from "@/lib/server/ai-cache/service";
import { SceneParseError, ValidationError } from "@/lib/server/errors";

const SCENE_PARSE_PROMPT_VERSION = "scene-parse-v3-block-rules";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const normalizeParseResponse = (value: unknown) => {
  const normalized = normalizeSceneParserResponseVersion(value);
  if (!isObject(normalized)) return normalized;

  if (isValidParsedScene(normalized)) {
    return {
      version: "v1",
      scene: normalized,
    };
  }

  return normalized;
};

const tryParseSceneFromModelOutput = (rawModelText: string) => {
  try {
    const parsed = normalizeParseResponse(parseJsonWithFallback(rawModelText));
    if (!isValidSceneParserResponse(parsed)) {
      return {
        ok: false as const,
        error: "Scene parse model output does not match SceneParserResponse.",
      };
    }
    return {
      ok: true as const,
      parsedScene: normalizeParsedSceneDialogue(parsed.scene),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unknown parse error",
    };
  }
};

const buildParseRepairPrompt = (params: {
  sourceText: string;
  sourceLanguage?: SceneSourceLanguage;
}) =>
  `${buildSceneParseUserPrompt({
    rawText: params.sourceText,
    sourceLanguage: params.sourceLanguage,
  })}

IMPORTANT:
- Return ONE pure JSON object only.
- Top-level must be: {"version":"v1","scene":{...}}
- scene.type must be "dialogue" or "monologue".
- scene.sections must be non-empty.
- Every section must have blocks.
- Every block must have 1-2 sentences.
- Every sentence must have chunks.
- Every chunk must include id, key, text, start, end.
- Do not add explanation before or after JSON.`;

export async function parseImportedSceneWithCache(params: {
  sourceText: string;
  sourceLanguage?: SceneSourceLanguage;
  userId?: string | null;
  model?: string;
  force?: boolean;
}) {
  const normalizedSource = params.sourceText.trim();
  if (!normalizedSource) {
    throw new ValidationError("sourceText is required.");
  }

  const model = params.model ?? process.env.GLM_MODEL ?? "glm-4.6";
  const cacheKey = buildSceneParseCacheKey({
    model,
    promptVersion: SCENE_PARSE_PROMPT_VERSION,
    sourceLanguage: params.sourceLanguage ?? "en",
    sourceText: normalizedSource,
  });
  const force = params.force === true;

  if (!force) {
    const cached = await getAiCacheByKey(cacheKey);
    if (cached && isObject(cached.output_json) && isValidParsedScene(cached.output_json)) {
      const normalizedCachedScene = normalizeParsedSceneDialogue(
        cached.output_json as ParsedScene,
      );
      return {
        source: "ai_cache" as const,
        cacheKey,
        cacheStatus: "hit" as const,
        parsedScene: normalizedCachedScene,
      };
    }
  }

  const rawModelText = await callGlmChatCompletion({
    model,
    systemPrompt: SCENE_PARSE_SYSTEM_PROMPT,
    userPrompt: buildSceneParseUserPrompt({
      rawText: normalizedSource,
      sourceLanguage: params.sourceLanguage,
    }),
    temperature: 0.2,
  });

  let parseResult = tryParseSceneFromModelOutput(rawModelText);
  if (!parseResult.ok) {
    const repairedRawText = await callGlmChatCompletion({
      model,
      systemPrompt: SCENE_PARSE_SYSTEM_PROMPT,
      userPrompt: buildParseRepairPrompt({
        sourceText: normalizedSource,
        sourceLanguage: params.sourceLanguage,
      }),
      temperature: 0.1,
    });
    parseResult = tryParseSceneFromModelOutput(repairedRawText);
    if (!parseResult.ok) {
      throw new SceneParseError("场景解析失败，请稍后重试，或稍微简化/整理原文后再导入。", {
        stage: "scene_import_retry_failed",
        parseError: parseResult.error,
        model,
        promptVersion: SCENE_PARSE_PROMPT_VERSION,
      });
    }
  }

  const normalizedParsedScene = normalizeParsedSceneDialogue(parseResult.parsedScene);

  await setAiCache({
    cacheKey,
    cacheType: "scene_parse",
    status: "success",
    inputHash: hashPayload({
      sourceText: normalizedSource,
      sourceLanguage: params.sourceLanguage ?? "en",
    }),
    sourceRef: params.userId ? `user:${params.userId}` : null,
    inputJson: {
      sourceText: normalizedSource,
      sourceLanguage: params.sourceLanguage ?? "en",
    },
    outputJson: normalizedParsedScene,
    metaJson: {
      cacheStatus: force ? "forced" : "written",
    },
    model,
    promptVersion: SCENE_PARSE_PROMPT_VERSION,
    createdBy: params.userId ?? null,
  });

  return {
    source: "glm" as const,
    cacheKey,
    cacheStatus: force ? ("forced" as const) : ("written" as const),
    parsedScene: normalizedParsedScene,
  };
}
