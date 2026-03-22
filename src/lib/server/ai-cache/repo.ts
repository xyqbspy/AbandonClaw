import { AiCacheRow } from "@/lib/server/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getAiCacheRowByKey(cacheKey: string) {
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

export async function upsertAiCacheRow(row: Partial<AiCacheRow> & { cache_key: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ai_cache")
    .upsert(row as never, { onConflict: "cache_key" })
    .select("*")
    .single<AiCacheRow>();

  if (error || !data) {
    throw new Error(`Failed to write ai_cache: ${error?.message ?? "unknown error"}`);
  }
  return data;
}

export async function countAiCacheRows() {
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("ai_cache")
    .select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(`Failed to count ai_cache: ${error.message}`);
  }
  return count ?? 0;
}

export async function getLatestAiCacheCreatedAt() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ai_cache")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>();

  if (error) {
    throw new Error(`Failed to read latest ai_cache row: ${error.message}`);
  }
  return data?.created_at ?? null;
}
