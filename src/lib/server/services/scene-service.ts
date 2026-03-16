import { mapLessonToParsedScene, mapParsedSceneToLesson } from "@/lib/adapters/scene-parser-adapter";
import { scenes as seedLessons } from "@/lib/data/mock-lessons";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Lesson } from "@/lib/types";
import { ParsedScene, SceneParserResponse } from "@/lib/types/scene-parser";
import { SceneRow, SceneVariantRow } from "@/lib/server/db/types";
import { getSceneVariantsBySceneId } from "@/lib/server/services/variant-service";

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
  };
};

export async function upsertSeedScenesIfNeeded() {
  const admin = createSupabaseAdminClient();

  for (const lesson of seedLessons) {
    const parsed = mapLessonToParsedScene(lesson);
    const { error } = await admin.from("scenes").upsert(
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
      { onConflict: "slug" },
    );

    if (error) {
      throw new Error(`Failed to upsert seed scenes: ${error.message}`);
    }
  }
}

export async function listScenes(params: { userId: string }) {
  await upsertSeedScenesIfNeeded();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("scenes")
    .select("*")
    .or(`is_public.eq.true,created_by.eq.${params.userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list scenes: ${error.message}`);
  }

  const rows = (data ?? []) as SceneRow[];
  const variantRows = await Promise.all(
    rows.map((row) => getSceneVariantsBySceneId(row.id)),
  );

  return rows.map((row, index) => toSceneSummary(row, variantRows[index] ?? []));
}

export async function getSceneBySlug(params: { slug: string; userId: string }) {
  await upsertSeedScenesIfNeeded();
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

  if (!data) return null;
  return rowToLesson(data);
}

export async function getSceneById(params: { sceneId: string; userId: string }) {
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
  const admin = createSupabaseAdminClient();
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

  const { data, error } = await admin
    .from("scenes")
    .insert({
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
    } as never)
    .select("*")
    .single<SceneRow>();

  if (error || !data) {
    throw new Error(`Failed to create imported scene: ${error?.message ?? "unknown error"}`);
  }

  return rowToLesson(data);
}

export async function deleteImportedScene(params: {
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
