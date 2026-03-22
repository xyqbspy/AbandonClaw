import { SceneRow, UserSceneProgressRow } from "@/lib/server/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function upsertSceneBySlug(row: Partial<SceneRow> & { slug: string }) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("scenes").upsert(row as never, {
    onConflict: "slug",
  });
  if (error) {
    throw new Error(`Failed to upsert scene by slug: ${error.message}`);
  }
}

export async function listVisibleScenesByUserId(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scenes")
    .select("*")
    .or(`is_public.eq.true,created_by.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to list scenes: ${error.message}`);
  }
  return (data ?? []) as SceneRow[];
}

export async function getVisibleSceneBySlug(params: { slug: string; userId: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scenes")
    .select("*")
    .eq("slug", params.slug)
    .or(`is_public.eq.true,created_by.eq.${params.userId}`)
    .maybeSingle<SceneRow>();
  if (error) {
    throw new Error(`Failed to load scene by slug: ${error.message}`);
  }
  return data ?? null;
}

export async function getVisibleSceneById(params: { sceneId: string; userId: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scenes")
    .select("*")
    .eq("id", params.sceneId)
    .or(`is_public.eq.true,created_by.eq.${params.userId}`)
    .maybeSingle<SceneRow>();
  if (error) {
    throw new Error(`Failed to load scene by id: ${error.message}`);
  }
  return data ?? null;
}

export async function insertScene(row: Partial<SceneRow>) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scenes")
    .insert(row as never)
    .select("*")
    .single<SceneRow>();
  if (error || !data) {
    throw new Error(`Failed to insert scene: ${error?.message ?? "unknown error"}`);
  }
  return data;
}

export async function deleteImportedSceneByOwner(params: {
  sceneId: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("scenes")
    .delete()
    .eq("id", params.sceneId)
    .eq("origin", "imported")
    .eq("created_by", params.userId);
  if (error) {
    throw new Error(`Failed to delete scene: ${error.message}`);
  }
}

export async function deleteObsoleteSeedScenes(keepSlugs: string[]) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("scenes").delete().eq("origin", "seed");

  if (keepSlugs.length > 0) {
    query = query.not("slug", "in", `(${keepSlugs.map((slug) => `"${slug}"`).join(",")})`);
  }

  const { error } = await query;
  if (error) {
    throw new Error(`Failed to delete obsolete seed scenes: ${error.message}`);
  }
}

export async function listSceneSlugsByOriginExcludingKeep(origin: SceneRow["origin"], keepSlugs: string[]) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("scenes").select("slug").eq("origin", origin);

  if (keepSlugs.length > 0) {
    query = query.not("slug", "in", `(${keepSlugs.map((slug) => `"${slug}"`).join(",")})`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list scene slugs: ${error.message}`);
  }

  return ((data ?? []) as Array<Pick<SceneRow, "slug">>).map((row) => row.slug);
}

export async function listUserSceneProgressBySceneIds(params: {
  userId: string;
  sceneIds: string[];
}) {
  if (params.sceneIds.length === 0) return [] as UserSceneProgressRow[];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_scene_progress")
    .select("*")
    .eq("user_id", params.userId)
    .in("scene_id", params.sceneIds);

  if (error) {
    throw new Error(`Failed to list scene progress: ${error.message}`);
  }

  return (data ?? []) as UserSceneProgressRow[];
}
