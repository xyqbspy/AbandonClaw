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
  buildSceneParseCacheKey,
  getAiCacheByKey,
  hashPayload,
  setAiCache,
} from "@/lib/server/services/ai-cache-service";
import { ValidationError } from "@/lib/server/errors";

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
      console.info("[scene-parse-cache]", {
        cacheStatus: "hit",
        cacheKey,
        model,
      });
      return {
        source: "ai_cache" as const,
        cacheKey,
        cacheStatus: "hit" as const,
        parsedScene: cached.output_json as ParsedScene,
      };
    }
  }

  console.info("[scene-parse-cache]", {
    cacheStatus: force ? "forced" : "miss",
    cacheKey,
    model,
  });

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
    outputJson: parsedScene,
    metaJson: {
      cacheStatus: force ? "forced" : "written",
    },
    model,
    promptVersion: SCENE_PARSE_PROMPT_VERSION,
    createdBy: params.userId ?? null,
  });
  console.info("[scene-parse-cache]", {
    cacheStatus: force ? "forced" : "written",
    cacheKey,
    model,
  });

  return {
    source: "glm" as const,
    cacheKey,
    cacheStatus: force ? ("forced" as const) : ("written" as const),
    parsedScene,
  };
}
