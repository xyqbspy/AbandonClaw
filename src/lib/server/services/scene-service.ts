import { mapLessonToParsedScene, mapParsedSceneToLesson } from "@/lib/adapters/scene-parser-adapter";
import { scenes as seedLessons } from "@/lib/data/mock-lessons";
import { Lesson } from "@/lib/types";
import { ParsedScene, SceneParserResponse } from "@/lib/types/scene-parser";
import { SceneRow, SceneVariantRow, UserSceneProgressRow } from "@/lib/server/db/types";
import { getSceneVariantsBySceneId } from "@/lib/server/services/variant-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  deleteImportedSceneByOwner,
  getVisibleSceneById,
  getVisibleSceneBySlug,
  insertScene,
  listVisibleScenesByUserId,
  upsertSceneBySlug,
} from "@/lib/server/repositories/scene-repo";

export interface SceneListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  difficulty: string;
  estimatedMinutes: number;
  sentenceCount: number;
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

const normalizeSceneFromRow = (row: SceneRow): ParsedScene => {
  const raw = row.scene_json as ParsedScene;
  return {
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
  };
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

const toSceneSummary = (
  row: SceneRow,
  variants: SceneVariantRow[],
  progress?: UserSceneProgressRow | null,
): SceneListItem => {
  const scene = normalizeSceneFromRow(row);
  const latestCacheKey = variants[0]?.cache_key ?? null;
  const latestRows = latestCacheKey
    ? variants.filter((item) => item.cache_key === latestCacheKey)
    : variants;
  const variantLinks = latestRows
    .sort((a, b) => a.variant_index - b.variant_index)
    .map((variant) => ({
      id: variant.id,
      label: `变体${variant.variant_index}`,
    }));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: scene.subtitle,
    difficulty: scene.difficulty,
    estimatedMinutes: scene.estimatedMinutes,
    sentenceCount: scene.sections.reduce(
      (total, section) => total + section.sentences.length,
      0,
    ),
    sourceType: toSceneOriginSourceType(row.origin),
    createdAt: row.created_at,
    variantLinks,
    learningStatus: progress?.status ?? "not_started",
    progressPercent: Number(progress?.progress_percent ?? 0),
    lastViewedAt: progress?.last_viewed_at ?? null,
  };
};

export async function upsertSeedScenesIfNeeded() {
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

  return rows.map((row, index) =>
    toSceneSummary(
      row,
      variantRows[index] ?? [],
      progressBySceneId.get(row.id) ?? null,
    ),
  );
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
  const parsedTitle = params.title?.trim() || params.parsedScene.title;
  const parsedSlugBase = params.parsedScene.slug || `imported-${Date.now()}`;
  const uniqueSlug = `${parsedSlugBase}-${Math.random().toString(36).slice(2, 8)}`;
  const mergedTags = Array.from(new Set([...(params.parsedScene.tags ?? []), "imported"]));

  const sceneJson: ParsedScene = {
    ...params.parsedScene,
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

  return rowToLesson(data);
}

export async function deleteImportedScene(params: {
  sceneId: string;
  userId: string;
}) {
  await deleteImportedSceneByOwner(params);
}
