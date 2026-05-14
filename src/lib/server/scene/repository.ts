import { SceneRow, UserSceneProgressRow } from "@/lib/server/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function createUserScopedSceneClient() {
  return createSupabaseServerClient();
}

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
  const client = await createUserScopedSceneClient();
  const { data, error } = await client
    .from("scenes")
    .select("*")
    .or(`is_public.eq.true,created_by.eq.${userId}`)
    .order("is_starter", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to list scenes: ${error.message}`);
  }
  return (data ?? []) as SceneRow[];
}

export async function getVisibleSceneBySlug(params: { slug: string; userId: string }) {
  const client = await createUserScopedSceneClient();
  const { data, error } = await client
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

export async function listVisibleScenesBySlugs(params: { userId: string; slugs: string[] }) {
  const uniqueSlugs = Array.from(new Set(params.slugs.map((item) => item.trim()).filter(Boolean)));
  if (uniqueSlugs.length === 0) return [] as Array<Pick<SceneRow, "slug" | "title">>;

  const client = await createUserScopedSceneClient();
  const { data, error } = await client
    .from("scenes")
    .select("slug,title")
    .in("slug", uniqueSlugs)
    .or(`is_public.eq.true,created_by.eq.${params.userId}`);
  if (error) {
    throw new Error(`Failed to list visible scenes by slug: ${error.message}`);
  }
  return (data ?? []) as Array<Pick<SceneRow, "slug" | "title">>;
}

export async function getVisibleSceneById(params: { sceneId: string; userId: string }) {
  const client = await createUserScopedSceneClient();
  const { data, error } = await client
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

  const client = await createUserScopedSceneClient();
  const { data, error } = await client
    .from("user_scene_progress")
    .select("*")
    .eq("user_id", params.userId)
    .in("scene_id", params.sceneIds);

  if (error) {
    throw new Error(`Failed to list scene progress: ${error.message}`);
  }

  return (data ?? []) as UserSceneProgressRow[];
}
