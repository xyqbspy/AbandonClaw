import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enrichAiExpressionLearningInfo } from "@/lib/server/phrases/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PhraseRow = {
  id: string;
  user_id: string;
  learning_item_type: "expression" | "sentence" | null;
  ai_enrichment_status: "pending" | "done" | "failed" | null;
  ai_example_sentences: unknown;
  ai_semantic_focus: string | null;
  ai_typical_scenario: string | null;
  source_chunk_text: string | null;
  phrase: {
    display_text: string | null;
    translation: string | null;
    usage_note: string | null;
  } | null;
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
  const limitArg = args.find((item) => item.startsWith("--limit="));
  const userId = userArg ? userArg.slice("--user=".length).trim() : "";
  const limitText = limitArg ? limitArg.slice("--limit=".length).trim() : "";
  const limit = Number.parseInt(limitText, 10);
  return {
    userId: userId || null,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
  };
};

const hasEnoughExamples = (value: unknown) => Array.isArray(value) && value.length >= 2;

const isExpressionRow = (row: PhraseRow) =>
  row.learning_item_type === "expression";

const isIncomplete = (row: PhraseRow) => {
  const translation = row.phrase?.translation?.trim() ?? "";
  const usageNote = row.phrase?.usage_note?.trim() ?? "";
  const semanticFocus = row.ai_semantic_focus?.trim() ?? "";
  const typicalScenario = row.ai_typical_scenario?.trim() ?? "";
  return (
    !translation ||
    !usageNote ||
    !semanticFocus ||
    !typicalScenario ||
    !hasEnoughExamples(row.ai_example_sentences) ||
    row.ai_enrichment_status !== "done"
  );
};

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const { userId: requestedUserId, limit } = parseArgs();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("user_phrases")
    .select(
      "id,user_id,learning_item_type,ai_enrichment_status,ai_example_sentences,ai_semantic_focus,ai_typical_scenario,source_chunk_text,phrase:phrases(display_text,translation,usage_note)",
    )
    .order("saved_at", { ascending: false })
    .limit(2000);

  if (error) {
    throw new Error(`Failed to load user phrases: ${error.message}`);
  }

  const rows = (data ?? []) as PhraseRow[];
  const expressionRows = rows.filter(isExpressionRow);
  const incompleteRows = expressionRows.filter(isIncomplete);
  const userIds = Array.from(new Set(incompleteRows.map((row) => row.user_id).filter(Boolean)));

  let targetUserId = requestedUserId;
  if (!targetUserId) {
    if (userIds.length === 1) {
      targetUserId = userIds[0];
    } else if (userIds.length === 0) {
      console.log("[enrich-missing-phrases] 没有待补全的 expression。");
      return;
    } else {
      throw new Error(
        `Found ${userIds.length} users with incomplete expressions. Please pass --user=<userId>.`,
      );
    }
  }

  const targets = incompleteRows
    .filter((row) => row.user_id === targetUserId)
    .slice(0, limit ?? incompleteRows.length);

  console.log(
    `[enrich-missing-phrases] user=${targetUserId} totalExpressions=${expressionRows.filter((row) => row.user_id === targetUserId).length} incomplete=${targets.length}`,
  );

  let done = 0;
  let failed = 0;
  for (const [index, row] of targets.entries()) {
    const label = row.phrase?.display_text?.trim() || row.source_chunk_text || row.id;
    try {
      await enrichAiExpressionLearningInfo({
        userId: row.user_id,
        userPhraseId: row.id,
      });
      done += 1;
      console.log(`[${index + 1}/${targets.length}] done: ${label}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[${index + 1}/${targets.length}] failed: ${label} -> ${message}`);
    }
  }

  console.log(`[enrich-missing-phrases] completed done=${done} failed=${failed}`);
}

void main().catch((error) => {
  console.error(
    "[enrich-missing-phrases] fatal",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
