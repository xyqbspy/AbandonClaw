import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface UserExpressionMapPhraseRow {
  id: string;
  source_scene_slug: string | null;
  phrase:
    | { display_text: string | null; normalized_text: string | null }
    | Array<{ display_text: string | null; normalized_text: string | null }>
    | null;
}

export interface UserExpressionMapMembershipRow {
  cluster_id: string;
  cluster:
    | { id: string; user_id: string; main_user_phrase_id: string | null }
    | Array<{ id: string; user_id: string; main_user_phrase_id: string | null }>
    | null;
}

export interface UserExpressionMapClusterMemberRow {
  cluster_id: string;
  role: "main" | "variant";
  user_phrase_id: string;
  cluster:
    | {
        id: string;
        user_id: string;
        main_user_phrase_id: string | null;
        title: string | null;
        semantic_focus: string | null;
      }
    | Array<{
        id: string;
        user_id: string;
        main_user_phrase_id: string | null;
        title: string | null;
        semantic_focus: string | null;
      }>
    | null;
  user_phrase:
    | {
        id: string;
        source_scene_slug: string | null;
        phrase:
          | { display_text: string | null; normalized_text: string | null }
          | Array<{ display_text: string | null; normalized_text: string | null }>
          | null;
      }
    | Array<{
        id: string;
        source_scene_slug: string | null;
        phrase:
          | { display_text: string | null; normalized_text: string | null }
          | Array<{ display_text: string | null; normalized_text: string | null }>
          | null;
      }>
    | null;
}

export async function listSavedUserPhrasesForExpressionMap(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_phrases")
    .select("id,source_scene_slug,phrase:phrases(display_text,normalized_text)")
    .eq("user_id", userId)
    .eq("status", "saved");

  if (error) {
    throw new Error(`Failed to load user expressions for map: ${error.message}`);
  }

  return (data ?? []) as UserExpressionMapPhraseRow[];
}

export async function listExpressionMapMembershipsByPhraseIds(userPhraseIds: string[]) {
  if (userPhraseIds.length === 0) return [] as UserExpressionMapMembershipRow[];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_expression_cluster_members")
    .select(
      "cluster_id,role,user_phrase_id,cluster:user_expression_clusters!inner(id,user_id,main_user_phrase_id)",
    )
    .in("user_phrase_id", userPhraseIds);

  if (error) {
    throw new Error(`Failed to load expression cluster memberships for map: ${error.message}`);
  }

  return (data ?? []) as UserExpressionMapMembershipRow[];
}

export async function listExpressionMapClusterMembers(clusterIds: string[]) {
  if (clusterIds.length === 0) return [] as UserExpressionMapClusterMemberRow[];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_expression_cluster_members")
    .select(
      "cluster_id,role,user_phrase_id,cluster:user_expression_clusters!inner(id,user_id,main_user_phrase_id,title,semantic_focus), user_phrase:user_phrases!inner(id,source_scene_slug,phrase:phrases(display_text,normalized_text))",
    )
    .in("cluster_id", clusterIds);

  if (error) {
    throw new Error(`Failed to load full expression cluster map data: ${error.message}`);
  }

  return (data ?? []) as UserExpressionMapClusterMemberRow[];
}
