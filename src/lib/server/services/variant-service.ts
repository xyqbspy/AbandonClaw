import {
  MutateSceneRequest,
  ParsedScene,
  SceneMutateResponse,
} from "@/lib/types/scene-parser";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildSceneMutateUserPrompt,
  SCENE_MUTATE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/scene-mutate-prompt";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import {
  isValidParsedScene,
  parseJsonWithFallback,
} from "@/lib/server/scene-json";
import {
  buildSceneVariantsCacheKey,
  getAiCacheByKey,
  hashPayload,
  setAiCache,
} from "@/lib/server/services/ai-cache-service";
import { SceneVariantRow } from "@/lib/server/db/types";
import { ValidationError } from "@/lib/server/errors";
import { getUserChunkCandidatesForSceneMutation } from "@/lib/server/chunks/service";

const SCENE_MUTATE_PROMPT_VERSION = "scene-mutate-v1";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const sanitizeVariantCount = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 3;
  return clamp(Math.round(value), 1, 3);
};

const sanitizeRetainChunkRatio = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.6;
  return clamp(value, 0.5, 0.7);
};

const normalizeMutateResponseVersion = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  const record = value as { version?: unknown };

  if (record.version === "1") {
    return {
      ...(value as Record<string, unknown>),
      version: "v1",
    };
  }

  return value;
};

const isValidSceneMutateResponse = (
  value: unknown,
): value is SceneMutateResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as SceneMutateResponse;

  if (response.version !== "v1") return false;
  if (!Array.isArray(response.variants) || response.variants.length === 0) {
    return false;
  }

  return response.variants.every(isValidParsedScene);
};

const buildVariantCacheKey = (params: {
  sceneId: string;
  sceneSlug: string;
  variantCount: number;
  retainChunkRatio: number;
  theme?: string;
  model: string;
  knownChunksHash?: string | null;
}) =>
  buildSceneVariantsCacheKey({
    sceneId: params.sceneId,
    sceneSlug: params.sceneSlug,
    model: params.model,
    promptVersion: SCENE_MUTATE_PROMPT_VERSION,
    variantCount: params.variantCount,
    retainChunkRatio: params.retainChunkRatio,
    theme: params.theme,
    knownChunksHash: params.knownChunksHash ?? null,
  });

const normalizeMutateParams = (
  params: Omit<MutateSceneRequest, "scene"> & { scene: ParsedScene },
) => {
  const variantCount = sanitizeVariantCount(params.variantCount);
  const retainChunkRatio = sanitizeRetainChunkRatio(params.retainChunkRatio);
  const theme = typeof params.theme === "string" && params.theme.trim() ? params.theme.trim() : undefined;

  return { variantCount, retainChunkRatio, theme };
};

async function insertSceneVariants(params: {
  sceneId: string;
  variants: ParsedScene[];
  retainChunkRatio: number;
  theme?: string;
  model: string;
  cacheKey: string;
  createdBy?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { error: deleteError } = await admin
    .from("scene_variants")
    .delete()
    .eq("cache_key", params.cacheKey);
  if (deleteError) {
    throw new Error(`Failed to clear existing scene variants by cache key: ${deleteError.message}`);
  }

  if (params.variants.length === 0) return;

  const rows = params.variants.map((variant, index) => ({
    scene_id: params.sceneId,
    variant_index: index + 1,
    variant_json: variant,
    retain_chunk_ratio: params.retainChunkRatio,
    theme: params.theme ?? null,
    model: params.model,
    prompt_version: SCENE_MUTATE_PROMPT_VERSION,
    cache_key: params.cacheKey,
    created_by: params.createdBy ?? null,
  }));

  const { error } = await admin.from("scene_variants").insert(rows as never);
  if (error) {
    if (
      error.code === "23505" ||
      (typeof error.message === "string" &&
        error.message.toLowerCase().includes("duplicate"))
    ) {
      const existingRows = await readSceneVariantsByCacheKey(params.cacheKey);
      if (existingRows.length >= params.variants.length) {
        return;
      }
      throw new Error(
        "Variant insert conflict detected. Ensure phase-2 SQL migration is applied (cache_key must be non-unique in scene_variants).",
      );
    }
    throw new Error(`Failed to persist scene variants: ${error.message}`);
  }
}

async function readSceneVariantsByCacheKey(cacheKey: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scene_variants")
    .select("*")
    .eq("cache_key", cacheKey)
    .order("variant_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to read scene variants by cache key: ${error.message}`);
  }

  return (data ?? []) as SceneVariantRow[];
}

export async function getSceneVariantsBySceneId(sceneId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scene_variants")
    .select("*")
    .eq("scene_id", sceneId)
    .order("created_at", { ascending: false })
    .order("variant_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to read scene variants: ${error.message}`);
  }

  return (data ?? []) as SceneVariantRow[];
}

export async function generateSceneVariants(params: {
  sceneId: string;
  scene: ParsedScene;
  variantCount?: number;
  retainChunkRatio?: number;
  theme?: string;
  model?: string;
  createdBy?: string | null;
  force?: boolean;
}) {
  if (!isValidParsedScene(params.scene)) {
    throw new ValidationError("scene payload is invalid.");
  }

  const normalized = normalizeMutateParams(params);
  const model = params.model ?? process.env.GLM_MODEL ?? "glm-4.6";
  const force = params.force === true;
  const preferredKnownChunkCandidates = params.createdBy
    ? await getUserChunkCandidatesForSceneMutation(params.createdBy, {
        sceneSlug: params.scene.slug,
        themeHint: normalized.theme,
        limit: 16,
      })
    : [];
  const preferredKnownChunks = preferredKnownChunkCandidates
    .map((item) => item.text)
    .filter(Boolean)
    .slice(0, 12);
  const effectiveKnownChunks = preferredKnownChunks.length >= 2 ? preferredKnownChunks : [];
  const knownChunksHash =
    effectiveKnownChunks.length > 0 ? hashPayload(effectiveKnownChunks) : null;

  const cacheKey = buildVariantCacheKey({
    sceneId: params.sceneId,
    sceneSlug: params.scene.slug,
    variantCount: normalized.variantCount,
    retainChunkRatio: normalized.retainChunkRatio,
    theme: normalized.theme,
    model,
    knownChunksHash,
  });

  if (!force) {
    const cached = await getAiCacheByKey(cacheKey);
    if (cached) {
      const cachedOutput = cached.output_json as SceneMutateResponse;
      if (isValidSceneMutateResponse(cachedOutput)) {
        console.info("[scene-variants-cache]", {
          cacheStatus: "hit",
          cacheKey,
          sceneId: params.sceneId,
          model,
        });
        return {
          source: "ai_cache" as const,
          cacheKey,
          cacheStatus: "hit" as const,
          response: cachedOutput,
        };
      }
    }
  }

  if (!force) {
    const cachedRows = await readSceneVariantsByCacheKey(cacheKey);
    if (cachedRows.length > 0) {
      const variants = cachedRows
        .map((row) => row.variant_json as ParsedScene)
        .filter(isValidParsedScene);
      if (variants.length > 0) {
        const response: SceneMutateResponse = { version: "v1", variants };
        await setAiCache({
          cacheKey,
          cacheType: "scene_variants",
          status: "success",
          inputHash: hashPayload({
            sceneId: params.sceneId,
            variantCount: normalized.variantCount,
            retainChunkRatio: normalized.retainChunkRatio,
            theme: normalized.theme ?? null,
            knownChunksHash,
          }),
          sourceRef: `scene:${params.sceneId}`,
          inputJson: {
            sceneId: params.sceneId,
            variantCount: normalized.variantCount,
            retainChunkRatio: normalized.retainChunkRatio,
            theme: normalized.theme ?? null,
            preferredKnownChunks: effectiveKnownChunks,
          },
          outputJson: response,
          metaJson: {
            cacheStatus: "written",
            source: "scene_variants",
          },
          model,
          promptVersion: SCENE_MUTATE_PROMPT_VERSION,
          createdBy: params.createdBy ?? null,
        });
        console.info("[scene-variants-cache]", {
          cacheStatus: "hit",
          cacheKey,
          sceneId: params.sceneId,
          model,
          source: "scene_variants",
        });
        return {
          source: "scene_variants" as const,
          cacheKey,
          cacheStatus: "hit" as const,
          response,
        };
      }
    }
  }

  console.info("[scene-variants-cache]", {
    cacheStatus: force ? "forced" : "miss",
    cacheKey,
    sceneId: params.sceneId,
    model,
  });

  const rawModelText = await callGlmChatCompletion({
    model,
    systemPrompt: SCENE_MUTATE_SYSTEM_PROMPT,
      userPrompt: buildSceneMutateUserPrompt({
        sceneJson: JSON.stringify(params.scene),
        variantCount: normalized.variantCount,
        retainChunkRatio: normalized.retainChunkRatio,
        theme: normalized.theme,
        preferredKnownChunks: effectiveKnownChunks,
      }),
      temperature: 0.3,
  });

  const parsed = normalizeMutateResponseVersion(parseJsonWithFallback(rawModelText));
  if (!isValidSceneMutateResponse(parsed)) {
    throw new Error("Model output JSON does not match SceneMutateResponse structure.");
  }

  await insertSceneVariants({
    sceneId: params.sceneId,
    variants: parsed.variants,
    retainChunkRatio: normalized.retainChunkRatio,
    theme: normalized.theme,
    model,
    cacheKey,
    createdBy: params.createdBy ?? null,
  });

  await setAiCache({
    cacheKey,
    cacheType: "scene_variants",
    status: "success",
    inputHash: hashPayload({
      sceneId: params.sceneId,
      variantCount: normalized.variantCount,
      retainChunkRatio: normalized.retainChunkRatio,
      theme: normalized.theme ?? null,
      knownChunksHash,
    }),
    sourceRef: `scene:${params.sceneId}`,
    inputJson: {
      sceneId: params.sceneId,
      variantCount: normalized.variantCount,
      retainChunkRatio: normalized.retainChunkRatio,
      theme: normalized.theme ?? null,
      preferredKnownChunks: effectiveKnownChunks,
    },
    outputJson: parsed,
    metaJson: {
      cacheStatus: force ? "forced" : "written",
      source: "glm",
    },
    model,
    promptVersion: SCENE_MUTATE_PROMPT_VERSION,
    createdBy: params.createdBy ?? null,
  });

  console.info("[scene-variants-cache]", {
    cacheStatus: force ? "forced" : "written",
    cacheKey,
    sceneId: params.sceneId,
    model,
  });

  return {
    source: "glm" as const,
    cacheKey,
    cacheStatus: force ? ("forced" as const) : ("written" as const),
    response: parsed,
  };
}
