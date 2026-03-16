import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AiCacheRow } from "@/lib/server/db/types";

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

export async function getAiCacheByKey(cacheKey: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ai_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .maybeSingle<AiCacheRow>();

  if (error) {
    throw new Error(`Failed to read ai_cache: ${error.message}`);
  }

  return data ?? null;
}

export async function setAiCache(params: {
  cacheKey: string;
  cacheType: string;
  inputJson: unknown;
  outputJson: unknown;
  model?: string;
  promptVersion?: string;
  createdBy?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ai_cache")
    .upsert(
      {
        cache_key: params.cacheKey,
        cache_type: params.cacheType,
        input_json: params.inputJson,
        output_json: params.outputJson,
        model: params.model ?? null,
        prompt_version: params.promptVersion ?? null,
        created_by: params.createdBy ?? null,
      } as never,
      { onConflict: "cache_key" },
    )
    .select("*")
    .single<AiCacheRow>();

  if (error || !data) {
    throw new Error(`Failed to write ai_cache: ${error?.message ?? "unknown error"}`);
  }

  return data;
}
