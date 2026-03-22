import { mapLessonToParsedScene, mapParsedSceneToLesson } from "@/lib/adapters/scene-parser-adapter";
import { scenes as seedLessons } from "@/lib/data/mock-lessons";
import { Lesson } from "@/lib/types";
import { ParsedScene, SceneParserResponse } from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { SceneRow, UserSceneProgressRow } from "@/lib/server/db/types";
import { getSceneVariantsBySceneId } from "@/lib/server/scene/variants";
import { deleteSceneTtsAudioBySlug, warmLessonTtsAudio } from "@/lib/server/tts/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  deleteObsoleteSeedScenes,
  deleteImportedSceneByOwner,
  getVisibleSceneById,
  getVisibleSceneBySlug,
  insertScene,
  listVisibleScenesByUserId,
  upsertSceneBySlug,
} from "@/lib/server/scene/repository";

export interface SceneListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  difficulty: string;
  estimatedMinutes: number;
  sentenceCount: number;
  sceneType: "dialogue" | "monologue";
  sourceType: "builtin" | "imported";
  createdAt: string;
  variantLinks: Array<{ id: string; label: string }>;
  learningStatus: "not_started" | "in_progress" | "completed" | "paused";
  progressPercent: number;
  lastViewedAt: string | null;
}

const SCENE_PARSE_PROMPT_VERSION = "scene-parse-v1";
const toSceneOriginSourceType = (origin: string): "builtin" | "imported" =>
  origin === "imported" ? "imported" : "builtin";
const hasChinese = (value: string) => /[\u4e00-\u9fff]/.test(value);
const stripParenSuffix = (value: string) =>
  value.replace(/\s*[\(\（][^)\）]*[\)\）]\s*$/, "").trim();
const toShortChineseHint = (value: string | undefined) => {
  const source = (value ?? "").trim();
  if (!source || !hasChinese(source)) return "";
  const onlyChinese = source
    .replace(/[A-Za-z0-9]/g, " ")
    .replace(/[^\u4e00-\u9fff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return onlyChinese.slice(0, 16);
};
const toBilingualTitle = (title: string, subtitle?: string, description?: string) => {
  const trimmed = title.trim();
  if (!trimmed) return "Imported Scene（导入场景）";
  if (hasChinese(trimmed)) return trimmed;
  const englishBase = stripParenSuffix(trimmed);
  const zh =
    toShortChineseHint(subtitle) ||
    toShortChineseHint(description) ||
    "导入场景";
  return `${englishBase}（${zh}）`;
};

const getSceneSentenceCount = (scene: ParsedScene) =>
  scene.sections.reduce(
    (total, section) =>
      total +
      section.blocks.reduce(
        (sectionTotal, block) => sectionTotal + block.sentences.length,
        0,
      ),
    0,
  );

const normalizeSceneFromRow = (row: SceneRow): ParsedScene => {
  const raw = row.scene_json as ParsedScene;
  const normalized = normalizeParsedSceneDialogue({
    ...raw,
    id: row.id,
    slug: row.slug,
    title: row.title,
    difficulty:
      raw.difficulty === "Beginner" ||
      raw.difficulty === "Intermediate" ||
      raw.difficulty === "Advanced"
        ? raw.difficulty
        : "Intermediate",
    estimatedMinutes:
      typeof raw.estimatedMinutes === "number" ? raw.estimatedMinutes : 10,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    type: raw.type === "dialogue" || raw.type === "monologue" ? raw.type : "monologue",
  });
  return normalized;
};

const tryNormalizeSceneFromRow = (row: SceneRow): ParsedScene | null => {
  try {
    return normalizeSceneFromRow(row);
  } catch (error) {
    console.warn(
      `[scene-service] skip invalid scene slug=${row.slug}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
};

const rowToLesson = (row: SceneRow): Lesson => {
  const response: SceneParserResponse = {
    version: "v1",
    scene: normalizeSceneFromRow(row),
  };
  const lesson = mapParsedSceneToLesson(response);
  lesson.id = row.id;
  lesson.slug = row.slug;
  lesson.title = row.title;
  lesson.sourceType = toSceneOriginSourceType(row.origin);
  return lesson;
};

export async function upsertSeedScenesIfNeeded() {
  const keepSlugs = seedLessons.map((lesson) => lesson.slug);

  for (const lesson of seedLessons) {
    const parsed = mapLessonToParsedScene(lesson);
    await upsertSceneBySlug(
      {
        slug: lesson.slug,
        title: lesson.title,
        theme: lesson.tags?.[0] ?? null,
        source_text: null,
        scene_json: parsed,
        translation: lesson.subtitle,
        difficulty: lesson.difficulty,
        origin: "seed",
        is_public: true,
        created_by: null,
        model: process.env.GLM_MODEL ?? "glm-4.6",
        prompt_version: "seed-v1",
      } as never,
    );
  }

  const { data: obsoleteSeedRows, error: obsoleteSeedError } = await createSupabaseAdminClient()
    .from("scenes")
    .select("slug")
    .eq("origin", "seed")
    .not("slug", "in", `(${keepSlugs.map((slug) => `"${slug}"`).join(",")})`);

  if (obsoleteSeedError) {
    throw new Error(`Failed to list obsolete seed scenes: ${obsoleteSeedError.message}`);
  }

  for (const row of (obsoleteSeedRows ?? []) as Array<Pick<SceneRow, "slug">>) {
    await deleteSceneTtsAudioBySlug(row.slug);
  }

  await deleteObsoleteSeedScenes(keepSlugs);
}

export async function runSeedScenesSync() {
  await upsertSeedScenesIfNeeded();
  return {
    total: seedLessons.length,
  };
}

export async function listScenes(params: { userId: string }) {
  await runSeedScenesSync();
  const rows = await listVisibleScenesByUserId(params.userId);
  const admin = createSupabaseAdminClient();
  const variantRows = await Promise.all(
    rows.map((row) => getSceneVariantsBySceneId(row.id)),
  );
  const sceneIds = rows.map((row) => row.id);
  const { data: progressRows, error: progressError } = await admin
    .from("user_scene_progress")
    .select("*")
    .eq("user_id", params.userId)
    .in("scene_id", sceneIds);

  if (progressError) {
    throw new Error(`Failed to list scene progress: ${progressError.message}`);
  }

  const progressBySceneId = new Map<string, UserSceneProgressRow>();
  for (const row of (progressRows ?? []) as UserSceneProgressRow[]) {
    progressBySceneId.set(row.scene_id, row);
  }

  const items: SceneListItem[] = [];
  for (const [index, row] of rows.entries()) {
    const scene = tryNormalizeSceneFromRow(row);
    if (!scene) continue;
    const latestCacheKey = variantRows[index]?.[0]?.cache_key ?? null;
    const latestRows = latestCacheKey
      ? (variantRows[index] ?? []).filter((item) => item.cache_key === latestCacheKey)
      : (variantRows[index] ?? []);
    const variantLinks = latestRows
      .sort((a, b) => a.variant_index - b.variant_index)
      .map((variant) => ({
        id: variant.id,
        label: `变体${variant.variant_index}`,
      }));

    items.push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: scene.subtitle ?? "",
      difficulty: scene.difficulty ?? "Intermediate",
      estimatedMinutes: scene.estimatedMinutes ?? 8,
      sentenceCount: getSceneSentenceCount(scene),
      sceneType: scene.type ?? "monologue",
      sourceType: toSceneOriginSourceType(row.origin),
      createdAt: row.created_at,
      variantLinks,
      learningStatus: progressBySceneId.get(row.id)?.status ?? "not_started",
      progressPercent: Number(progressBySceneId.get(row.id)?.progress_percent ?? 0),
      lastViewedAt: progressBySceneId.get(row.id)?.last_viewed_at ?? null,
    });
  }

  return items;
}

export async function getSceneBySlug(params: { slug: string; userId: string }) {
  await runSeedScenesSync();
  const data = await getVisibleSceneBySlug(params);

  if (!data) return null;
  return rowToLesson(data);
}

export async function getSceneRecordBySlug(params: { slug: string; userId: string }) {
  await runSeedScenesSync();
  const data = await getVisibleSceneBySlug(params);

  if (!data) return null;
  return {
    row: data,
    lesson: rowToLesson(data),
  };
}

export async function getSceneById(params: { sceneId: string; userId: string }) {
  const data = await getVisibleSceneById(params);

  if (!data) return null;
  return {
    row: data,
    lesson: rowToLesson(data),
  };
}

export async function createImportedScene(params: {
  userId: string;
  title?: string;
  theme?: string;
  sourceText: string;
  parsedScene: ParsedScene;
  model?: string;
  promptVersion?: string;
  cacheKey?: string;
}) {
  const preferredTitle = params.title?.trim() || params.parsedScene.title;
  const parsedTitle = toBilingualTitle(
    preferredTitle,
    params.parsedScene.subtitle,
    params.parsedScene.description,
  );
  const parsedSlugBase = params.parsedScene.slug || `imported-${Date.now()}`;
  const uniqueSlug = `${parsedSlugBase}-${Math.random().toString(36).slice(2, 8)}`;
  const mergedTags = Array.from(new Set([...(params.parsedScene.tags ?? []), "imported"]));

  const sceneJson: ParsedScene = {
    ...normalizeParsedSceneDialogue(params.parsedScene),
    slug: uniqueSlug,
    title: parsedTitle,
    tags: mergedTags,
  };

  const data = await insertScene(
    {
      slug: uniqueSlug,
      title: parsedTitle,
      theme: params.theme?.trim() || null,
      source_text: params.sourceText,
      scene_json: sceneJson,
      translation: params.parsedScene.subtitle,
      difficulty: params.parsedScene.difficulty,
      origin: "imported",
      is_public: false,
      created_by: params.userId,
      model: params.model ?? process.env.GLM_MODEL ?? "glm-4.6",
      prompt_version: params.promptVersion ?? SCENE_PARSE_PROMPT_VERSION,
    } as never,
  );

  const lesson = rowToLesson(data);
  try {
    await warmLessonTtsAudio(lesson, {
      force: false,
      includeSceneFull: true,
      concurrency: 3,
    });
  } catch (error) {
    console.warn(
      `[scene-service] tts warmup failed slug=${lesson.slug}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return lesson;
}

export async function deleteImportedScene(params: {
  sceneId: string;
  userId: string;
}) {
  await deleteImportedSceneByOwner(params);
}
