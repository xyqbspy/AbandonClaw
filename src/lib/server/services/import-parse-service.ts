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

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const toStringOr = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const toDifficulty = (value: unknown): ParsedScene["difficulty"] =>
  value === "Beginner" || value === "Intermediate" || value === "Advanced"
    ? value
    : "Intermediate";

const toExamples = (value: unknown, text: string, translation: string) => {
  if (Array.isArray(value) && value.length > 0) {
    const next = value
      .map((item) => {
        if (!isObject(item)) return null;
        const en = typeof item.en === "string" ? item.en.trim() : "";
        const zh = typeof item.zh === "string" ? item.zh.trim() : "";
        if (!en || !zh) return null;
        return { en, zh };
      })
      .filter((item): item is { en: string; zh: string } => Boolean(item))
      .slice(0, 3);
    if (next.length > 0) return next;
  }
  return [{ en: text, zh: translation }];
};

const coerceParsedSceneFromLooseResponse = (value: unknown): ParsedScene | null => {
  if (!isObject(value)) return null;

  const maybeScene = isObject(value.scene) ? value.scene : null;
  const source = maybeScene ?? value;
  const rawSections =
    (Array.isArray((source as Record<string, unknown>).sections)
      ? (source as Record<string, unknown>).sections
      : null) ??
    (Array.isArray(value.sections) ? value.sections : null);
  if (!Array.isArray(rawSections) || rawSections.length === 0) return null;

  const normalizedSections: ParsedScene["sections"] = [];
  for (let sectionIndex = 0; sectionIndex < rawSections.length; sectionIndex += 1) {
    const section = rawSections[sectionIndex];
    if (!isObject(section)) continue;

    const rawSentences = Array.isArray(section.sentences) ? section.sentences : [];
    const normalizedSentences: ParsedScene["sections"][number]["sentences"] = [];

    for (let sentenceIndex = 0; sentenceIndex < rawSentences.length; sentenceIndex += 1) {
      const sentence = rawSentences[sentenceIndex];
      if (!isObject(sentence)) continue;

      const text = toStringOr(sentence.text, "");
      if (!text) continue;
      const translation = toStringOr(sentence.translation, text);
      const rawChunks = Array.isArray(sentence.chunks) ? sentence.chunks : [];
      const normalizedChunks: ParsedScene["sections"][number]["sentences"][number]["chunks"] = [];

      for (let chunkIndex = 0; chunkIndex < rawChunks.length; chunkIndex += 1) {
        const chunk = rawChunks[chunkIndex];
        if (!isObject(chunk)) continue;
        const chunkText = toStringOr(chunk.text, "");
        if (!chunkText) continue;
        const chunkTranslation = toStringOr(chunk.translation, chunkText);
        normalizedChunks.push({
          key: toStringOr(chunk.key, `c${sectionIndex + 1}-${sentenceIndex + 1}-${chunkIndex + 1}`),
          text: chunkText,
          translation: chunkTranslation,
          grammarLabel: toStringOr(chunk.grammarLabel, "Chunk"),
          meaningInSentence: toStringOr(chunk.meaningInSentence, chunkText),
          usageNote: toStringOr(chunk.usageNote, "Useful expression in this context."),
          examples: toExamples(chunk.examples, chunkText, chunkTranslation),
        });
      }

      if (normalizedChunks.length === 0) continue;
      const speaker =
        typeof sentence.speaker === "string" && sentence.speaker.trim()
          ? sentence.speaker.trim()
          : undefined;
      normalizedSentences.push({
        id: toStringOr(sentence.id, `s${sectionIndex + 1}-${sentenceIndex + 1}`),
        ...(speaker ? { speaker } : {}),
        text,
        translation,
        chunks: normalizedChunks,
      });
    }

    if (normalizedSentences.length === 0) continue;
    normalizedSections.push({
      id: toStringOr(section.id, `sec${sectionIndex + 1}`),
      title: toStringOr(section.title, `Section ${sectionIndex + 1}`),
      summary: toStringOr(section.summary, normalizedSentences[0]?.text.slice(0, 80) ?? ""),
      sentences: normalizedSentences,
    });
  }
  if (normalizedSections.length === 0) return null;

  const title = toStringOr(source.title, "Generated Scene");
  const slug = toSlug(toStringOr(source.slug, title)) || `generated-${Date.now()}`;
  const tags = Array.isArray(source.tags)
    ? source.tags
        .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        .slice(0, 8)
    : [];

  const parsed: ParsedScene = {
    id: toStringOr(source.id, `scene-${Date.now()}`),
    slug,
    title,
    subtitle: toStringOr(source.subtitle, toStringOr(source.description, title)),
    description: toStringOr(source.description, title),
    difficulty: toDifficulty(source.difficulty),
    estimatedMinutes:
      typeof source.estimatedMinutes === "number" && Number.isFinite(source.estimatedMinutes)
        ? Math.max(3, Math.min(20, Math.round(source.estimatedMinutes)))
        : 8,
    tags,
    sections: normalizedSections,
    glossary: Array.isArray(source.glossary) ? source.glossary : undefined,
  };

  return isValidParsedScene(parsed) ? parsed : null;
};

const summarizeParsedShape = (value: unknown) => {
  if (!isObject(value)) return { type: typeof value };
  const topKeys = Object.keys(value).slice(0, 12);
  const scene = (value as Record<string, unknown>).scene;
  const sceneKeys = isObject(scene) ? Object.keys(scene).slice(0, 12) : [];
  return {
    type: "object",
    topKeys,
    version: (value as Record<string, unknown>).version ?? null,
    hasScene: isObject(scene),
    sceneKeys,
  };
};

const tryParseSceneFromModelOutput = (rawModelText: string) => {
  try {
    const parsed = normalizeParseResponse(parseJsonWithFallback(rawModelText));
    if (!isValidSceneParserResponse(parsed)) {
      const coercedScene = coerceParsedSceneFromLooseResponse(parsed);
      if (coercedScene) {
        return {
          ok: true as const,
          parsedScene: coercedScene,
        };
      }
      return {
        ok: false as const,
        error: "Scene parse model output does not match SceneParserResponse.",
        shape: summarizeParsedShape(parsed),
      };
    }
    return {
      ok: true as const,
      parsedScene: parsed.scene,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unknown parse error",
      shape: null,
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
- Do not add explanation before or after JSON.
- Ensure scene has non-empty sections/sentences/chunks.`;

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
  const runId = `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log("[scene.parse] start", {
    runId,
    model,
    sourceLanguage: params.sourceLanguage ?? "en",
    sourceLength: normalizedSource.length,
  });
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
      console.log("[scene.parse] cache hit", { runId, cacheKey, model });
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
  console.log("[scene.parse] calling glm", { runId, model, cacheKey, attempt: 1 });

  const firstCallStartMs = Date.now();
  const rawModelText = await callGlmChatCompletion({
    model,
    systemPrompt: SCENE_PARSE_SYSTEM_PROMPT,
    userPrompt: buildSceneParseUserPrompt({
      rawText: normalizedSource,
      sourceLanguage: params.sourceLanguage,
    }),
    temperature: 0.2,
  });
  console.log("[scene.parse] glm returned", {
    runId,
    attempt: 1,
    elapsedMs: Date.now() - firstCallStartMs,
    contentLength: rawModelText.length,
    contentPreview: rawModelText.slice(0, 220),
  });

  console.log("[scene.parse] parsing content", { runId, attempt: 1 });
  let parseResult = tryParseSceneFromModelOutput(rawModelText);
  if (!parseResult.ok) {
    console.warn("[scene.parse] first parse invalid, retrying", {
      runId,
      attempt: 1,
      error: parseResult.error,
      shape: parseResult.shape,
    });

    console.log("[scene.parse] calling glm", { runId, model, cacheKey, attempt: 2 });
    const secondCallStartMs = Date.now();
    const repairedRawText = await callGlmChatCompletion({
      model,
      systemPrompt: SCENE_PARSE_SYSTEM_PROMPT,
      userPrompt: buildParseRepairPrompt({
        sourceText: normalizedSource,
        sourceLanguage: params.sourceLanguage,
      }),
      temperature: 0.1,
    });
    console.log("[scene.parse] glm returned", {
      runId,
      attempt: 2,
      elapsedMs: Date.now() - secondCallStartMs,
      contentLength: repairedRawText.length,
      contentPreview: repairedRawText.slice(0, 220),
    });
    console.log("[scene.parse] parsing content", { runId, attempt: 2 });
    parseResult = tryParseSceneFromModelOutput(repairedRawText);
    if (!parseResult.ok) {
      console.error("[scene.parse] parse failed after retry", {
        runId,
        error: parseResult.error,
        shape: parseResult.shape,
      });
      throw new Error(
        `Scene parse model output invalid after retry. ${parseResult.error}`,
      );
    }
  }
  const parsedScene = parseResult.parsedScene;
  console.log("[scene.parse] parsed ok", {
    runId,
    title: parsedScene.title,
    sections: parsedScene.sections.length,
  });

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
  console.log("[scene.parse] cache write ok", { runId, cacheKey, model });

  return {
    source: "glm" as const,
    cacheKey,
    cacheStatus: force ? ("forced" as const) : ("written" as const),
    parsedScene,
  };
}
