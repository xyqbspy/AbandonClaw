import { createHash } from "crypto";
import { upsertAiCacheRow, getAiCacheRowByKey, countAiCacheRows, getLatestAiCacheCreatedAt } from "@/lib/server/repositories/ai-cache-repo";

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map(
    (key) =>
      `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
  );
  return `{${entries.join(",")}}`;
};

export const buildStableCacheKey = (
  scope: string,
  payload: unknown,
): string => {
  const hash = createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
  return `${scope}:${hash}`;
};

export const hashPayload = (value: unknown) =>
  createHash("sha256").update(stableStringify(value)).digest("hex");

export const buildSceneParseCacheKey = (params: {
  model: string;
  promptVersion: string;
  sourceLanguage: string;
  sourceText: string;
}) =>
  buildStableCacheKey("scene-parse", {
    cache_type: "scene_parse",
    model: params.model,
    promptVersion: params.promptVersion,
    sourceLanguage: params.sourceLanguage,
    sourceTextHash: hashPayload(params.sourceText),
  });

export const buildSceneVariantsCacheKey = (params: {
  sceneId: string;
  sceneSlug: string;
  model: string;
  promptVersion: string;
  variantCount: number;
  retainChunkRatio: number;
  theme?: string;
}) =>
  buildStableCacheKey("scene-variants", {
    cache_type: "scene_variants",
    sceneId: params.sceneId,
    sceneSlug: params.sceneSlug,
    model: params.model,
    promptVersion: params.promptVersion,
    variantCount: params.variantCount,
    retainChunkRatio: params.retainChunkRatio,
    theme: params.theme ?? null,
  });

export async function getAiCacheByKey(cacheKey: string) {
  return getAiCacheRowByKey(cacheKey);
}

export async function setAiCache(params: {
  cacheKey: string;
  cacheType: string;
  status?: "success" | "error";
  inputHash?: string | null;
  sourceRef?: string | null;
  inputJson: unknown;
  outputJson: unknown;
  metaJson?: unknown;
  model?: string;
  promptVersion?: string;
  createdBy?: string | null;
  expiresAt?: string | null;
}) {
  const inputHash = params.inputHash ?? hashPayload(params.inputJson);

  return upsertAiCacheRow({
    cache_key: params.cacheKey,
    cache_type: params.cacheType,
    status: params.status ?? "success",
    input_hash: inputHash,
    source_ref: params.sourceRef ?? null,
    input_json: params.inputJson,
    output_json: params.outputJson,
    meta_json: params.metaJson ?? null,
    model: params.model ?? null,
    prompt_version: params.promptVersion ?? null,
    created_by: params.createdBy ?? null,
    expires_at: params.expiresAt ?? null,
  });
}

export async function listRecentAiCacheStats() {
  const [total, latestCreatedAt] = await Promise.all([
    countAiCacheRows(),
    getLatestAiCacheCreatedAt(),
  ]);
  return {
    total,
    latestCreatedAt,
  };
}
