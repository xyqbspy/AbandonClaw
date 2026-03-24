import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SceneRow } from "@/lib/server/db/types";
import { repairGeneratedSceneDuplicateSentences } from "@/lib/server/scene/repair";
import { ParsedScene } from "@/lib/types/scene-parser";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCENE_GENERATE_PROMPT_VERSION = "scene-generate-v1";
const PAGE_SIZE = 200;

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
  const sceneArg = args.find((item) => item.startsWith("--scene="));
  const userArg = args.find((item) => item.startsWith("--user="));
  return {
    apply: args.includes("--apply"),
    sceneSlug: sceneArg ? sceneArg.slice("--scene=".length).trim() : "",
    userId: userArg ? userArg.slice("--user=".length).trim() : "",
  };
};

const loadCandidateScenes = async (params: {
  sceneSlug?: string;
  userId?: string;
}) => {
  const admin = createSupabaseAdminClient();
  const rows: SceneRow[] = [];
  let from = 0;

  while (true) {
    let query = admin
      .from("scenes")
      .select(
        "id,slug,title,theme,source_text,scene_json,translation,difficulty,origin,is_public,created_by,model,prompt_version,created_at,updated_at",
      )
      .eq("origin", "imported")
      .eq("prompt_version", SCENE_GENERATE_PROMPT_VERSION)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (params.sceneSlug) {
      query = query.eq("slug", params.sceneSlug);
    }
    if (params.userId) {
      query = query.eq("created_by", params.userId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`加载场景失败: ${error.message}`);
    }

    const batch = (data ?? []) as SceneRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE || params.sceneSlug) break;
    from += PAGE_SIZE;
  }

  return rows;
};

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const { apply, sceneSlug, userId } = parseArgs();
  const admin = createSupabaseAdminClient();
  const rows = await loadCandidateScenes({ sceneSlug, userId });

  let changedSceneCount = 0;
  let changedBlockCount = 0;
  let changedSentenceCount = 0;

  for (const row of rows) {
    const rawScene = row.scene_json as ParsedScene;
    const result = repairGeneratedSceneDuplicateSentences(rawScene);
    if (result.changedBlockCount === 0) continue;

    changedSceneCount += 1;
    changedBlockCount += result.changedBlockCount;
    changedSentenceCount += result.changedSentenceCount;

    console.log(
      `[repair-generated-scene-duplicate-sentences] scene=${row.slug} blocks=${result.changedBlockCount} sentences=${result.changedSentenceCount}`,
    );

    if (!apply) continue;

    const { error } = await admin
      .from("scenes")
      .update({ scene_json: result.repairedScene } as never)
      .eq("id", row.id)
      .eq("origin", "imported");
    if (error) {
      throw new Error(`更新场景失败 slug=${row.slug}: ${error.message}`);
    }
  }

  console.log(
    `[repair-generated-scene-duplicate-sentences] mode=${apply ? "apply" : "dry-run"} scanned=${rows.length} changedScenes=${changedSceneCount} changedBlocks=${changedBlockCount} changedSentences=${changedSentenceCount}`,
  );
}

void main().catch((error) => {
  console.error(
    "[repair-generated-scene-duplicate-sentences] fatal",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
