import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UserPhraseLiteRow = {
  id: string;
  user_id: string;
  saved_at: string;
  source_note: string | null;
  source_chunk_text: string | null;
  phrase: {
    display_text: string | null;
  } | null;
};

type RelationLiteRow = {
  source_user_phrase_id: string;
  target_user_phrase_id: string;
  relation_type: "similar" | "contrast";
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const loadEnvFile = (filename: string) => {
  const filePath = path.join(projectRoot, filename);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const userArg = args.find((item) => item.startsWith("--user="));
  return {
    userId: userArg ? userArg.slice("--user=".length).trim() : "",
  };
};

const isDerivedRelatedExpression = (sourceNote: string | null | undefined) => {
  const normalized = (sourceNote ?? "").trim().toLowerCase();
  return (
    normalized === "manual-similar-ai" ||
    normalized === "focus-similar-ai" ||
    normalized === "similar-ai-mvp" ||
    normalized === "manual-contrast-ai" ||
    normalized === "focus-contrast-ai"
  );
};

async function createClusterWithMembers(params: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  mainUserPhraseId: string;
  memberUserPhraseIds: string[];
  title: string;
}) {
  const { admin, userId, mainUserPhraseId, memberUserPhraseIds, title } = params;
  const { data: clusterRow, error: clusterError } = await admin
    .from("user_expression_clusters")
    .insert({
      user_id: userId,
      main_user_phrase_id: mainUserPhraseId,
      title,
    } as never)
    .select("id")
    .single<{ id: string }>();
  if (clusterError || !clusterRow) {
    throw new Error(`Failed to create backfill expression cluster: ${clusterError?.message ?? "unknown error"}`);
  }

  const membershipPayload = memberUserPhraseIds.map((userPhraseId) => ({
    cluster_id: clusterRow.id,
    user_phrase_id: userPhraseId,
    role: userPhraseId === mainUserPhraseId ? ("main" as const) : ("variant" as const),
  }));
  const { error: membershipError } = await admin
    .from("user_expression_cluster_members")
    .upsert(membershipPayload as never, { onConflict: "user_phrase_id" });
  if (membershipError) {
    throw new Error(`Failed to create backfill cluster members: ${membershipError.message}`);
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const { userId } = parseArgs();
  const admin = createSupabaseAdminClient();

  const { data: phraseRows, error: phraseError } = await admin
    .from("user_phrases")
    .select("id,user_id,saved_at,source_note,source_chunk_text,phrase:phrases(display_text)")
    .eq("status", "saved")
    .eq("learning_item_type", "expression")
    .order("saved_at", { ascending: true })
    .limit(5000);

  if (phraseError) {
    throw new Error(`Failed to load user phrases: ${phraseError.message}`);
  }

  const allRows = (phraseRows ?? []) as UserPhraseLiteRow[];
  const scopedRows = userId ? allRows.filter((row) => row.user_id === userId) : allRows;
  const userIds = Array.from(new Set(scopedRows.map((row) => row.user_id)));
  if (userIds.length === 0) {
    console.log("[backfill-phrase-relation-families] no expression rows found");
    return;
  }

  const { data: relationRows, error: relationError } = await admin
    .from("user_phrase_relations")
    .select("source_user_phrase_id,target_user_phrase_id,relation_type")
    .limit(10000);

  if (relationError) {
    throw new Error(`Failed to load phrase relations: ${relationError.message}`);
  }

  const allRelations = (relationRows ?? []) as RelationLiteRow[];

  let updatedCount = 0;

  for (const currentUserId of userIds) {
    const rows = scopedRows.filter((row) => row.user_id === currentUserId);
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const relations = allRelations.filter(
      (row) => rowById.has(row.source_user_phrase_id) && rowById.has(row.target_user_phrase_id),
    );

    const graph = new Map<string, Set<string>>();
    for (const row of rows) {
      graph.set(row.id, new Set());
    }
    for (const relation of relations) {
      if (relation.relation_type !== "similar") continue;
      graph.get(relation.source_user_phrase_id)?.add(relation.target_user_phrase_id);
      graph.get(relation.target_user_phrase_id)?.add(relation.source_user_phrase_id);
    }

    const visited = new Set<string>();
    let clusterCreated = 0;

    for (const row of rows) {
      if (visited.has(row.id)) continue;
      const queue = [row.id];
      const component: string[] = [];
      visited.add(row.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);
        for (const next of graph.get(current) ?? []) {
          if (visited.has(next)) continue;
          visited.add(next);
          queue.push(next);
        }
      }

      if (component.length <= 1) continue;

      const componentRows = component
        .map((id) => rowById.get(id))
        .filter((item): item is UserPhraseLiteRow => Boolean(item))
        .sort((a, b) => a.saved_at.localeCompare(b.saved_at));

      const nonDerivedRows = componentRows.filter((item) => !isDerivedRelatedExpression(item.source_note));
      const mainRow = nonDerivedRows[0] ?? componentRows[0];
      if (!mainRow) continue;

      await createClusterWithMembers({
        admin,
        userId: currentUserId,
        mainUserPhraseId: mainRow.id,
        memberUserPhraseIds: componentRows.map((item) => item.id),
        title: normalizeText(mainRow.phrase?.display_text ?? mainRow.source_chunk_text) || mainRow.id.slice(0, 8),
      });
      clusterCreated += 1;
      updatedCount += componentRows.length;
    }

    console.log(
      `[backfill-phrase-relation-families] user=${currentUserId} clusters=${clusterCreated}`,
    );
  }

  console.log(`[backfill-phrase-relation-families] completed updated=${updatedCount}`);
}

void main().catch((error) => {
  console.error(
    "[backfill-phrase-relation-families] fatal",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
