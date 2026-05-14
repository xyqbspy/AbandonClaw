import { mapLessonToParsedScene, mapParsedSceneToLesson } from "@/lib/adapters/scene-parser-adapter";
import { builtinSceneSeeds } from "@/lib/data/builtin-scene-seeds";
import { Lesson } from "@/lib/types";
import { ParsedScene, SceneParserResponse } from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { SceneRow, UserSceneProgressRow } from "@/lib/server/db/types";
import { getSceneVariantsBySceneId } from "@/lib/server/scene/variants";
import { deleteSceneTtsAudioBySlug, warmLessonTtsAudio } from "@/lib/server/tts/storage";
import {
  deleteObsoleteSeedScenes,
  deleteImportedSceneByOwner,
  getVisibleSceneById,
  getVisibleSceneBySlug,
  insertScene,
  listSceneSlugsByOriginExcludingKeep,
  listUserSceneProgressBySceneIds,
  listVisibleScenesByUserId,
  upsertSceneBySlug,
} from "@/lib/server/scene/repository";

export interface SceneListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  level: string;
  category: string;
  subcategory: string | null;
  difficulty: string;
  estimatedMinutes: number;
  learningGoal: string | null;
  tags: string[];
  sentenceCount: number;
  sceneType: "dialogue" | "monologue";
  sourceType: "builtin" | "user_generated" | "imported" | "ai_generated";
  isStarter: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  variantLinks: Array<{ id: string; label: string }>;
  learningStatus: "not_started" | "in_progress" | "completed" | "paused";
  progressPercent: number;
  lastViewedAt: string | null;
}

const SCENE_PARSE_PROMPT_VERSION = "scene-parse-v1";
const toSceneSourceType = (
  row: Pick<SceneRow, "origin" | "source_type">,
): "builtin" | "user_generated" | "imported" | "ai_generated" =>
  row.source_type ?? (row.origin === "imported" ? "imported" : "builtin");
const toLessonSourceType = (
  row: Pick<SceneRow, "origin" | "source_type">,
): "builtin" | "imported" =>
  toSceneSourceType(row) === "imported" ? "imported" : "builtin";
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
      typeof row.estimated_minutes === "number"
        ? row.estimated_minutes
        : typeof raw.estimatedMinutes === "number"
          ? raw.estimatedMinutes
          : 10,
    tags: Array.isArray(row.tags)
      ? (row.tags as string[])
      : Array.isArray(raw.tags)
        ? raw.tags
        : [],
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
  lesson.sourceType = toLessonSourceType(row);
  return lesson;
};

export async function upsertSeedScenesIfNeeded() {
  const keepSlugs = builtinSceneSeeds.map((item) => item.meta.slug);

  for (const { lesson, meta } of builtinSceneSeeds) {
    const parsed = mapLessonToParsedScene(lesson);
    await upsertSceneBySlug(
      {
        slug: lesson.slug,
        title: lesson.title,
        theme: meta.subcategory ?? lesson.tags?.[0] ?? null,
        source_text: null,
        scene_json: parsed,
        translation: lesson.subtitle,
        difficulty: lesson.difficulty,
        origin: "seed",
        level: meta.level,
        category: meta.category,
        subcategory: meta.subcategory ?? null,
        source_type: meta.sourceType,
        is_starter: meta.isStarter,
        is_featured: meta.isFeatured,
        sort_order: meta.sortOrder,
        estimated_minutes: meta.estimatedMinutes,
        learning_goal: meta.learningGoal,
        tags: meta.tags,
        is_public: true,
        created_by: null,
        model: process.env.GLM_MODEL ?? "glm-4.6",
        prompt_version: "seed-v1",
      } as never,
    );
  }

  const obsoleteSeedSlugs = await listSceneSlugsByOriginExcludingKeep("seed", keepSlugs);
  for (const slug of obsoleteSeedSlugs) {
    await deleteSceneTtsAudioBySlug(slug);
  }

  await deleteObsoleteSeedScenes(keepSlugs);
}

export async function runSeedScenesSync() {
  await upsertSeedScenesIfNeeded();
  return {
    total: builtinSceneSeeds.length,
  };
}

export async function listScenes(params: { userId: string }) {
  await runSeedScenesSync();
  const rows = await listVisibleScenesByUserId(params.userId);
  const variantRows = await Promise.all(
    rows.map((row) => getSceneVariantsBySceneId(row.id)),
  );
  const sceneIds = rows.map((row) => row.id);
  const progressRows = await listUserSceneProgressBySceneIds({
    userId: params.userId,
    sceneIds,
  });

  const progressBySceneId = new Map<string, UserSceneProgressRow>();
  for (const row of progressRows) {
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
      level: row.level,
      category: row.category,
      subcategory: row.subcategory,
      difficulty: scene.difficulty ?? "Intermediate",
      estimatedMinutes: row.estimated_minutes ?? scene.estimatedMinutes ?? 8,
      learningGoal: row.learning_goal,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : scene.tags ?? [],
      sentenceCount: getSceneSentenceCount(scene),
      sceneType: scene.type ?? "monologue",
      sourceType: toSceneSourceType(row),
      isStarter: row.is_starter,
      isFeatured: row.is_featured,
      sortOrder: row.sort_order,
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
      level: "L1",
      category: "general",
      subcategory: null,
      source_type: "imported",
      is_starter: false,
      is_featured: false,
      sort_order: 0,
      estimated_minutes: params.parsedScene.estimatedMinutes ?? 8,
      learning_goal: params.parsedScene.description ?? null,
      tags: mergedTags,
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
