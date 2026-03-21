import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import { parseJsonWithFallback } from "@/lib/server/scene-json";

type PhraseRow = {
  id: string;
  user_id: string;
  source_scene_slug: string | null;
  source_note: string | null;
  source_chunk_text: string | null;
  source_sentence_text: string | null;
  saved_at: string;
  phrase: {
    display_text: string | null;
    translation: string | null;
  } | null;
};

type RelationRow = {
  source_user_phrase_id: string;
  target_user_phrase_id: string;
  relation_type: "similar" | "contrast";
};

type ModelCluster = {
  mainUserPhraseId: string;
  members: Array<{
    userPhraseId: string;
    relationType: "similar" | "contrast";
  }>;
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

async function ensureClusterForSimilarPair(params: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  mainUserPhraseId: string;
  targetUserPhraseId: string;
  title: string;
}) {
  const { admin, userId, mainUserPhraseId, targetUserPhraseId, title } = params;
  const { data: membershipRows, error: membershipError } = await admin
    .from("user_expression_cluster_members")
    .select("user_phrase_id,cluster_id,role")
    .in("user_phrase_id", [mainUserPhraseId, targetUserPhraseId]);
  if (membershipError) {
    throw new Error(`Failed to load inferred cluster memberships: ${membershipError.message}`);
  }

  const existingMainMembership = ((membershipRows ?? []) as Array<{
    user_phrase_id: string;
    cluster_id: string;
    role: "main" | "variant";
  }>).find((row) => row.user_phrase_id === mainUserPhraseId);
  let clusterId = existingMainMembership?.cluster_id ?? null;

  if (!clusterId) {
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
      throw new Error(`Failed to create inferred expression cluster: ${clusterError?.message ?? "unknown error"}`);
    }
    clusterId = clusterRow.id;
  }

  const membershipPayload = [
    {
      cluster_id: clusterId,
      user_phrase_id: mainUserPhraseId,
      role: "main" as const,
    },
    {
      cluster_id: clusterId,
      user_phrase_id: targetUserPhraseId,
      role: "variant" as const,
    },
  ];

  const { error: upsertMembershipError } = await admin
    .from("user_expression_cluster_members")
    .upsert(membershipPayload as never, { onConflict: "user_phrase_id" });
  if (upsertMembershipError) {
    throw new Error(`Failed to save inferred cluster members: ${upsertMembershipError.message}`);
  }

  const { error: updateClusterError } = await admin
    .from("user_expression_clusters")
    .update({ main_user_phrase_id: mainUserPhraseId } as never)
    .eq("id", clusterId)
    .eq("user_id", userId);
  if (updateClusterError) {
    throw new Error(`Failed to update inferred cluster main item: ${updateClusterError.message}`);
  }
}

const SYSTEM_PROMPT = `
You are clustering English learning expressions from the same scene.
Return JSON only.

Goal:
1) Find strong similar/contrast relations inside the same scene.
2) Choose a good main expression for each cluster.
3) Do NOT group items that are only topically related but not similar/contrast in meaning.

Rules:
- "similar" means close paraphrase / same learner substitution family.
- "contrast" means opposite or reverse direction.
- Leave expressions independent if relation is weak.
- Prefer a main expression that is broad, natural, and best represents the cluster.
- Be conservative. Fewer high-quality relations are better than weak grouping.

JSON shape:
{
  "clusters": [
    {
      "mainUserPhraseId": "uuid",
      "members": [
        { "userPhraseId": "uuid", "relationType": "similar" }
      ]
    }
  ]
}
`;

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const { userId } = parseArgs();
  const admin = createSupabaseAdminClient();

  const { data: phraseRows, error: phraseError } = await admin
    .from("user_phrases")
    .select(
      "id,user_id,source_scene_slug,source_note,source_chunk_text,source_sentence_text,saved_at,phrase:phrases(display_text,translation)",
    )
    .eq("status", "saved")
    .eq("learning_item_type", "expression")
    .order("saved_at", { ascending: true })
    .limit(5000);

  if (phraseError) {
    throw new Error(`Failed to load expressions: ${phraseError.message}`);
  }

  const allRows = (phraseRows ?? []) as PhraseRow[];
  const scopedRows = userId ? allRows.filter((row) => row.user_id === userId) : allRows;
  const userIds = Array.from(new Set(scopedRows.map((row) => row.user_id)));

  const { data: relationRows, error: relationError } = await admin
    .from("user_phrase_relations")
    .select("source_user_phrase_id,target_user_phrase_id,relation_type")
    .limit(10000);

  if (relationError) {
    throw new Error(`Failed to load relations: ${relationError.message}`);
  }

  const allRelations = (relationRows ?? []) as RelationRow[];

  let createdRelations = 0;

  for (const currentUserId of userIds) {
    const rows = scopedRows.filter((row) => row.user_id === currentUserId);
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const existingPairKeys = new Set(
      allRelations
        .filter((row) => rowById.has(row.source_user_phrase_id) && rowById.has(row.target_user_phrase_id))
        .map((row) => `${row.source_user_phrase_id}:${row.target_user_phrase_id}:${row.relation_type}`),
    );
    const groups = new Map<string, PhraseRow[]>();

    for (const row of rows) {
      const sceneSlug = row.source_scene_slug?.trim();
      if (!sceneSlug) continue;
      const bucket = groups.get(sceneSlug) ?? [];
      bucket.push(row);
      groups.set(sceneSlug, bucket);
    }

    for (const [sceneSlug, groupRows] of groups.entries()) {
      if (groupRows.length < 2) continue;
      const independentRows = groupRows.filter((row) => !isDerivedRelatedExpression(row.source_note));
      if (independentRows.length < 2) continue;

      const userPrompt = JSON.stringify(
        {
          sceneSlug,
          expressions: independentRows.map((row) => ({
            userPhraseId: row.id,
            text: row.phrase?.display_text ?? row.source_chunk_text ?? "",
            translation: row.phrase?.translation ?? null,
            sourceSentenceText: row.source_sentence_text ?? null,
          })),
        },
        null,
        2,
      );

      const raw = await callGlmChatCompletion({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        temperature: 0.1,
      });
      const parsed = parseJsonWithFallback(raw) as {
        clusters?: ModelCluster[];
      };
      const clusters = Array.isArray(parsed.clusters) ? parsed.clusters : [];

      for (const cluster of clusters) {
        const main = rowById.get(cluster.mainUserPhraseId);
        if (!main) continue;
        for (const member of cluster.members ?? []) {
          const target = rowById.get(member.userPhraseId);
          if (!target || target.id === main.id) continue;

          const pairA = `${main.id}:${target.id}`;
          const pairB = `${target.id}:${main.id}`;
          const relationPairA = `${pairA}:${member.relationType}`;
          const relationPairB = `${pairB}:${member.relationType}`;
          if (!existingPairKeys.has(relationPairA)) {
            const oppositeRelationType = member.relationType === "similar" ? "contrast" : "similar";
            const { error: deleteOppositeError } = await admin
              .from("user_phrase_relations")
              .delete()
              .eq("user_id", currentUserId)
              .eq("relation_type", oppositeRelationType)
              .or(
                `and(source_user_phrase_id.eq.${main.id},target_user_phrase_id.eq.${target.id}),and(source_user_phrase_id.eq.${target.id},target_user_phrase_id.eq.${main.id})`,
              );
            if (deleteOppositeError) {
              throw new Error(
                `Failed to normalize inferred opposite relation: ${deleteOppositeError.message}`,
              );
            }
            const payload = [
              {
                user_id: currentUserId,
                source_user_phrase_id: main.id,
                target_user_phrase_id: target.id,
                relation_type: member.relationType,
              },
              {
                user_id: currentUserId,
                source_user_phrase_id: target.id,
                target_user_phrase_id: main.id,
                relation_type: member.relationType,
              },
            ];
            const { error } = await admin
              .from("user_phrase_relations")
              .upsert(payload as never, {
                onConflict: "user_id,source_user_phrase_id,target_user_phrase_id,relation_type",
              });
            if (error) {
              throw new Error(`Failed to upsert inferred relation: ${error.message}`);
            }
            existingPairKeys.add(relationPairA);
            existingPairKeys.add(relationPairB);
            createdRelations += 2;
          }

          if (member.relationType === "similar") {
            await ensureClusterForSimilarPair({
              admin,
              userId: currentUserId,
              mainUserPhraseId: main.id,
              targetUserPhraseId: target.id,
              title: (main.phrase?.display_text ?? main.source_chunk_text ?? main.id).trim(),
            });
          }
        }
      }
    }

    console.log(`[infer-missing-phrase-relations] user=${currentUserId} done`);
  }

  console.log(`[infer-missing-phrase-relations] createdRelations=${createdRelations}`);
}

void main().catch((error) => {
  console.error(
    "[infer-missing-phrase-relations] fatal",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
