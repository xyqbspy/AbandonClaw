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
import {
  buildStableCacheKey,
  getAiCacheByKey,
  setAiCache,
} from "@/lib/server/services/ai-cache-service";

const SCENE_PARSE_PROMPT_VERSION = "scene-parse-v1";

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

const parseSceneFromModelOutput = (rawModelText: string): ParsedScene => {
  const parsed = normalizeParseResponse(parseJsonWithFallback(rawModelText));
  if (!isValidSceneParserResponse(parsed)) {
    throw new Error("Scene parse model output does not match SceneParserResponse.");
  }
  return parsed.scene;
};

export async function parseImportedSceneWithCache(params: {
  sourceText: string;
  sourceLanguage?: SceneSourceLanguage;
  userId?: string | null;
  model?: string;
}) {
  const normalizedSource = params.sourceText.trim();
  if (!normalizedSource) {
    throw new Error("sourceText is required.");
  }

  const model = params.model ?? process.env.GLM_MODEL ?? "glm-4.6";
  const cacheKey = buildStableCacheKey("scene-parse", {
    cache_type: "scene_parse",
    model,
    promptVersion: SCENE_PARSE_PROMPT_VERSION,
    sourceLanguage: params.sourceLanguage ?? "en",
    sourceText: normalizedSource,
  });

  const cached = await getAiCacheByKey(cacheKey);
  if (cached && isObject(cached.output_json) && isValidParsedScene(cached.output_json)) {
    return {
      source: "ai_cache" as const,
      cacheKey,
      parsedScene: cached.output_json as ParsedScene,
    };
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

  const parsedScene = parseSceneFromModelOutput(rawModelText);

  await setAiCache({
    cacheKey,
    cacheType: "scene_parse",
    inputJson: {
      sourceText: normalizedSource,
      sourceLanguage: params.sourceLanguage ?? "en",
    },
    outputJson: parsedScene,
    model,
    promptVersion: SCENE_PARSE_PROMPT_VERSION,
    createdBy: params.userId ?? null,
  });

  return {
    source: "glm" as const,
    cacheKey,
    parsedScene,
  };
}
