import { isValidParsedScene } from "@/lib/server/scene-json";
import { generateSceneVariants, getSceneVariantsBySceneId } from "@/lib/server/services/variant-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AiCacheRow, SceneRow, SceneVariantRow } from "@/lib/server/db/types";
import { runSeedScenesSync } from "@/lib/server/services/scene-service";
import { listRecentAiCacheStats } from "@/lib/server/services/ai-cache-service";
import { NotFoundError } from "@/lib/server/errors";

export interface AdminSceneListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  origin?: "seed" | "imported";
  isPublic?: boolean;
}

export interface AdminAiCacheFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  cacheType?: string;
  status?: "success" | "error";
}

const clampPage = (value: number | undefined) => {
  if (!value || Number.isNaN(value)) return 1;
  return Math.max(1, Math.floor(value));
};

const clampPageSize = (value: number | undefined) => {
  if (!value || Number.isNaN(value)) return 20;
  return Math.min(100, Math.max(1, Math.floor(value)));
};

const normalizeSearch = (value: string | undefined) => {
  const text = value?.trim();
  return text ? text : undefined;
};

export async function listAdminScenes(filters: AdminSceneListFilters) {
  await runSeedScenesSync();
  const admin = createSupabaseAdminClient();
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const search = normalizeSearch(filters.search);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("scenes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.origin) {
    query = query.eq("origin", filters.origin);
  }
  if (typeof filters.isPublic === "boolean") {
    query = query.eq("is_public", filters.isPublic);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list admin scenes: ${error.message}`);
  }

  return {
    rows: (data ?? []) as SceneRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAdminSceneDetail(sceneId: string) {
  await runSeedScenesSync();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .maybeSingle<SceneRow>();

  if (error) {
    throw new Error(`Failed to load scene detail: ${error.message}`);
  }
  if (!data) return null;

  const variants = await getSceneVariantsBySceneId(sceneId);

  const {
    data: progressRows,
    error: progressError,
  } = await admin
    .from("user_scene_progress")
    .select("status,progress_percent,last_viewed_at")
    .eq("scene_id", sceneId);

  if (progressError) {
    throw new Error(`Failed to read scene progress rows: ${progressError.message}`);
  }
  const progressStatsRows = (progressRows ?? []) as Array<{
    status: string;
    progress_percent: number | null;
    last_viewed_at: string | null;
  }>;
  const startedRows = progressStatsRows.filter((row) => row.status !== "not_started");

  const progressStartedCount = startedRows.length;
  const progressCompletedCount = startedRows.filter(
    (row) => row.status === "completed",
  ).length;
  const progressLastViewedAt = startedRows
    .map((row) => row.last_viewed_at as string | null)
    .filter(Boolean)
    .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] ?? null;
  const avgProgressPercent =
    startedRows.length > 0
      ? startedRows.reduce(
          (sum, row) => sum + Number(row.progress_percent ?? 0),
          0,
        ) / startedRows.length
      : 0;

  const { count: variantCacheCount, error: variantCacheError } = await admin
    .from("ai_cache")
    .select("*", { count: "exact", head: true })
    .eq("cache_type", "scene_variants")
    .contains("input_json", { sceneId });

  if (variantCacheError) {
    throw new Error(`Failed to read scene-related cache rows: ${variantCacheError.message}`);
  }

  return {
    scene: data,
    variants,
    diagnostics: {
      variantsCount: variants.length,
      relatedVariantCacheCount: variantCacheCount ?? 0,
      sourceTextLength: data.source_text?.length ?? 0,
      progressStartedCount,
      progressCompletedCount,
      progressLastViewedAt,
      avgProgressPercent,
    },
  };
}

export async function deleteSceneById(sceneId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("scenes").delete().eq("id", sceneId);
  if (error) {
    throw new Error(`Failed to delete scene: ${error.message}`);
  }
}

export async function updateSceneVisibility(params: {
  sceneId: string;
  isPublic: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scenes")
    .update({ is_public: params.isPublic } as never)
    .eq("id", params.sceneId)
    .select("*")
    .maybeSingle<SceneRow>();

  if (error) {
    throw new Error(`Failed to update scene visibility: ${error.message}`);
  }
  if (!data) {
    throw new NotFoundError("Scene not found.");
  }
  return data;
}

export async function regenerateSceneVariants(params: {
  sceneId: string;
  variantCount?: number;
  retainChunkRatio?: number;
  force?: boolean;
  createdBy?: string | null;
}) {
  const detail = await getAdminSceneDetail(params.sceneId);
  if (!detail) {
    throw new Error("Scene not found.");
  }

  const sourceScene = detail.scene.scene_json;
  if (!isValidParsedScene(sourceScene)) {
    throw new Error("Scene JSON is invalid for variant generation.");
  }

  return generateSceneVariants({
    sceneId: params.sceneId,
    scene: {
      ...sourceScene,
      id: detail.scene.id,
      slug: detail.scene.slug,
    },
    variantCount: params.variantCount,
    retainChunkRatio: params.retainChunkRatio,
    model: process.env.GLM_MODEL ?? "glm-4.6",
    createdBy: params.createdBy ?? null,
    force: params.force,
  });
}

export async function listAdminVariants(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: "asc" | "desc";
}) {
  const admin = createSupabaseAdminClient();
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);
  const search = normalizeSearch(params.search);
  const sortAscending = params.sort === "asc";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await admin
    .from("scene_variants")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("variant_index", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list admin variants: ${error.message}`);
  }

  const rows = (data ?? []) as SceneVariantRow[];
  const sceneIds = Array.from(new Set(rows.map((row) => row.scene_id)));
  const scenesById = new Map<string, Pick<SceneRow, "id" | "title" | "slug">>();

  if (sceneIds.length > 0) {
    const { data: sceneRows, error: sceneError } = await admin
      .from("scenes")
      .select("id,title,slug")
      .in("id", sceneIds);

    if (sceneError) {
      throw new Error(`Failed to list scene metadata for variants: ${sceneError.message}`);
    }

    for (const row of (sceneRows ?? []) as Array<Pick<SceneRow, "id" | "title" | "slug">>) {
      scenesById.set(row.id, row);
    }
  }

  let filteredRows = rows;
  if (search) {
    filteredRows = rows.filter((row) => {
      const scene = scenesById.get(row.scene_id);
      return (
        row.scene_id.includes(search) ||
        row.cache_key?.includes(search) ||
        scene?.slug?.toLowerCase().includes(search.toLowerCase()) ||
        scene?.title?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }

  const orderedRows = filteredRows.sort((a, b) => {
    const lhs = new Date(a.created_at).getTime();
    const rhs = new Date(b.created_at).getTime();
    return sortAscending ? lhs - rhs : rhs - lhs;
  });

  return {
    rows: orderedRows.map((row) => ({
      ...row,
      scene: scenesById.get(row.scene_id) ?? null,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listAdminAiCache(filters: AdminAiCacheFilters) {
  const admin = createSupabaseAdminClient();
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const search = normalizeSearch(filters.search);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("ai_cache")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.cacheType) {
    query = query.eq("cache_type", filters.cacheType);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (search) {
    query = query.ilike("cache_key", `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list ai cache: ${error.message}`);
  }

  return {
    rows: (data ?? []) as AiCacheRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAdminOverviewStats() {
  await runSeedScenesSync();
  const admin = createSupabaseAdminClient();

  const [sceneRes, importedRes, variantRes, cacheStats, progressUsersRes, inProgressRes, completedRes, latestLearningRes] = await Promise.all([
    admin.from("scenes").select("*", { count: "exact", head: true }),
    admin
      .from("scenes")
      .select("*", { count: "exact", head: true })
      .eq("origin", "imported"),
    admin.from("scene_variants").select("*", { count: "exact", head: true }),
    listRecentAiCacheStats(),
    admin
      .from("user_scene_progress")
      .select("user_id")
      .in("status", ["in_progress", "paused", "completed"]),
    admin
      .from("user_scene_progress")
      .select("*", { count: "exact", head: true })
      .in("status", ["in_progress", "paused"]),
    admin
      .from("user_scene_progress")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    admin
      .from("user_scene_progress")
      .select("last_viewed_at")
      .order("last_viewed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<{ last_viewed_at: string | null }>(),
  ]);

  if (sceneRes.error) throw new Error(`Failed to count scenes: ${sceneRes.error.message}`);
  if (importedRes.error) {
    throw new Error(`Failed to count imported scenes: ${importedRes.error.message}`);
  }
  if (variantRes.error) {
    throw new Error(`Failed to count scene variants: ${variantRes.error.message}`);
  }
  if (progressUsersRes.error) {
    throw new Error(`Failed to count progress users: ${progressUsersRes.error.message}`);
  }
  if (inProgressRes.error) {
    throw new Error(`Failed to count in-progress rows: ${inProgressRes.error.message}`);
  }
  if (completedRes.error) {
    throw new Error(`Failed to count completed rows: ${completedRes.error.message}`);
  }
  if (latestLearningRes.error) {
    throw new Error(`Failed to read latest learning activity: ${latestLearningRes.error.message}`);
  }

  const uniqueProgressUsers = new Set(
    ((progressUsersRes.data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id),
  ).size;

  return {
    totalScenes: sceneRes.count ?? 0,
    importedScenes: importedRes.count ?? 0,
    totalVariants: variantRes.count ?? 0,
    totalCacheRows: cacheStats.total,
    latestCacheCreatedAt: cacheStats.latestCreatedAt,
    totalUsersWithProgress: uniqueProgressUsers,
    scenesInProgressCount: inProgressRes.count ?? 0,
    scenesCompletedCount: completedRes.count ?? 0,
    latestLearningActivityAt: latestLearningRes.data?.last_viewed_at ?? null,
  };
}
