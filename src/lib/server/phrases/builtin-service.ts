import { builtinSceneSeeds } from "@/lib/data/builtin-scene-seeds";
import { PhraseRow, SceneRow } from "@/lib/server/db/types";
import { runSeedScenesSync } from "@/lib/server/scene/service";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface BuiltinPhraseSourceScene {
  slug: string;
  title: string;
}

export interface BuiltinPhraseItem {
  id: string;
  text: string;
  normalizedText: string;
  translation: string | null;
  usageNote: string | null;
  level: string | null;
  category: string | null;
  phraseType: string | null;
  isCore: boolean;
  frequencyRank: number | null;
  tags: string[];
  sourceScene: BuiltinPhraseSourceScene | null;
  isSaved: boolean;
}

const BUILTIN_SYNC_TTL_MS = 5 * 60 * 1000;

let builtinSyncPromise: Promise<void> | null = null;
let builtinSyncExpiresAt = 0;

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];

const getBuiltinPhraseCategory = (slug: string, fallbackCategory: string) => {
  if (slug === "daily-greeting") return "greeting";
  if (slug === "self-introduction" || slug === "meeting-someone-new") return "social";
  if (
    slug === "asking-someone-to-repeat" ||
    slug === "i-dont-understand"
  ) {
    return "clarification";
  }
  if (slug === "asking-for-help") return "help";
  if (
    slug === "ordering-coffee" ||
    slug === "takeout-order" ||
    slug === "grocery-shopping"
  ) {
    return "ordering";
  }
  if (
    slug === "making-an-appointment" ||
    slug === "running-late" ||
    slug === "meeting-reschedule"
  ) {
    return "scheduling";
  }
  if (
    slug === "saying-no-politely" ||
    slug === "replying-to-an-invite" ||
    slug === "small-talk-at-work"
  ) {
    return "polite_response";
  }
  if (slug === "sharing-an-opinion") return "opinion";
  if (
    slug === "asking-for-directions" ||
    slug === "airport-check-in" ||
    slug === "hotel-check-in"
  ) {
    return "travel";
  }
  if (fallbackCategory === "social") return "social";
  if (fallbackCategory === "time_plan") return "scheduling";
  return "daily_life";
};

const getBuiltinPhraseType = (category: string) => {
  if (category === "clarification" || category === "help") return "request";
  if (category === "polite_response") return "response";
  if (category === "opinion") return "opinion";
  return "conversation";
};

export const buildBuiltinSeedPhraseRowsForTest = () => {
  const rows = new Map<
    string,
    {
      normalizedText: string;
      displayText: string;
      translation: string | null;
      usageNote: string | null;
      difficulty: string | null;
      tags: string[];
      level: string;
      category: string;
      phraseType: string;
      sourceSceneSlug: string;
      frequencyRank: number;
    }
  >();

  for (const seed of builtinSceneSeeds) {
    const sceneCategory = getBuiltinPhraseCategory(seed.meta.slug, seed.meta.category);
    const phraseType = getBuiltinPhraseType(sceneCategory);
    for (const [index, explanation] of seed.lesson.explanations.entries()) {
      const displayText = explanation.text.trim();
      const normalizedText = normalizePhraseText(displayText);
      if (!displayText || !normalizedText) continue;

      const candidate = {
        normalizedText,
        displayText,
        translation: explanation.translation?.trim() || null,
        usageNote: explanation.explanation?.trim() || seed.meta.learningGoal || null,
        difficulty: seed.meta.level,
        tags: Array.from(
          new Set([
            "builtin",
            "core_phrase",
            `level:${seed.meta.level.toLowerCase()}`,
            `category:${sceneCategory}`,
            ...seed.meta.tags,
          ]),
        ),
        level: seed.meta.level,
        category: sceneCategory,
        phraseType,
        sourceSceneSlug: seed.meta.slug,
        frequencyRank: seed.meta.sortOrder * 100 + index,
      };

      const existing = rows.get(normalizedText);
      if (!existing || candidate.frequencyRank < existing.frequencyRank) {
        rows.set(normalizedText, candidate);
      }
    }
  }

  return Array.from(rows.values()).sort((left, right) => left.frequencyRank - right.frequencyRank);
};

async function syncBuiltinCorePhrasesFromSeeds() {
  await runSeedScenesSync();

  const admin = createSupabaseAdminClient();
  const seedRows = buildBuiltinSeedPhraseRowsForTest();
  const normalizedTexts = seedRows.map((row) => row.normalizedText);

  const { data: existingRows, error: existingError } = await admin
    .from("phrases")
    .select("*")
    .in("normalized_text", normalizedTexts);

  if (existingError) {
    throw new Error(`Failed to read existing builtin phrases: ${existingError.message}`);
  }

  const existingByNormalized = new Map(
    ((existingRows ?? []) as PhraseRow[]).map((row) => [row.normalized_text, row]),
  );

  const payload = seedRows.map((row) => {
    const existing = existingByNormalized.get(row.normalizedText);
    return {
      normalized_text: row.normalizedText,
      display_text: existing?.display_text?.trim() || row.displayText,
      translation: existing?.translation ?? row.translation,
      usage_note: existing?.usage_note ?? row.usageNote,
      difficulty: existing?.difficulty ?? row.difficulty,
      tags: Array.from(new Set([...toStringArray(existing?.tags), ...row.tags])),
      is_builtin: true,
      is_core: true,
      level: row.level,
      category: row.category,
      phrase_type: row.phraseType,
      source_scene_slug: row.sourceSceneSlug,
      frequency_rank: row.frequencyRank,
    };
  });

  const { error: upsertError } = await admin
    .from("phrases")
    .upsert(payload as never[], { onConflict: "normalized_text" });

  if (upsertError) {
    throw new Error(`Failed to sync builtin phrases: ${upsertError.message}`);
  }
}

async function ensureBuiltinCorePhrasesSynced() {
  if (Date.now() < builtinSyncExpiresAt) return;
  if (!builtinSyncPromise) {
    builtinSyncPromise = syncBuiltinCorePhrasesFromSeeds()
      .then(() => {
        builtinSyncExpiresAt = Date.now() + BUILTIN_SYNC_TTL_MS;
      })
      .finally(() => {
        builtinSyncPromise = null;
      });
  }
  await builtinSyncPromise;
}

const matchSearch = (item: BuiltinPhraseItem, search: string) => {
  if (!search) return true;
  const lower = search.toLowerCase();
  return [
    item.text,
    item.translation ?? "",
    item.usageNote ?? "",
    item.category ?? "",
    item.sourceScene?.title ?? "",
  ].some((value) => value.toLowerCase().includes(lower));
};

const levelPriority = (level: string | null) => {
  if (level === "L0") return 0;
  if (level === "L1") return 1;
  if (level === "L2") return 2;
  return 3;
};

export async function listBuiltinPhrases(params: {
  userId: string;
  level?: string | null;
  category?: string | null;
  search?: string | null;
  limit?: number | null;
}) {
  await ensureBuiltinCorePhrasesSynced();

  const admin = createSupabaseAdminClient();
  const { data: phraseRows, error: phraseError } = await admin
    .from("phrases")
    .select("*")
    .eq("is_builtin", true)
    .eq("is_core", true)
    .order("frequency_rank", { ascending: true, nullsFirst: false });

  if (phraseError) {
    throw new Error(`Failed to read builtin phrases: ${phraseError.message}`);
  }

  const rows = (phraseRows ?? []) as PhraseRow[];
  const phraseIds = rows.map((row) => row.id);
  const sourceSceneSlugs = Array.from(
    new Set(rows.map((row) => row.source_scene_slug).filter((slug): slug is string => Boolean(slug))),
  );

  const [savedRowsResult, sceneRowsResult] = await Promise.all([
    phraseIds.length === 0
      ? Promise.resolve({ data: [] as Array<{ phrase_id: string }>, error: null })
      : admin
          .from("user_phrases")
          .select("phrase_id")
          .eq("user_id", params.userId)
          .eq("status", "saved")
          .in("phrase_id", phraseIds),
    sourceSceneSlugs.length === 0
      ? Promise.resolve({ data: [] as Array<Pick<SceneRow, "slug" | "title">>, error: null })
      : admin
          .from("scenes")
          .select("slug,title")
          .in("slug", sourceSceneSlugs),
  ]);

  if (savedRowsResult.error) {
    throw new Error(`Failed to read saved builtin phrase states: ${savedRowsResult.error.message}`);
  }
  if (sceneRowsResult.error) {
    throw new Error(`Failed to read builtin phrase source scenes: ${sceneRowsResult.error.message}`);
  }

  const savedPhraseIds = new Set(
    ((savedRowsResult.data ?? []) as Array<{ phrase_id: string }>).map((row) => row.phrase_id),
  );
  const sceneBySlug = new Map(
    ((sceneRowsResult.data ?? []) as Array<Pick<SceneRow, "slug" | "title">>).map((row) => [
      row.slug,
      row.title,
    ]),
  );

  const levelFilter = params.level?.trim() ?? "";
  const categoryFilter = params.category?.trim() ?? "";
  const search = params.search?.trim().toLowerCase() ?? "";
  const limit = params.limit == null ? 120 : Math.max(1, Math.min(200, Math.floor(params.limit)));

  const items = rows
    .map((row) => ({
      id: row.id,
      text: row.display_text,
      normalizedText: row.normalized_text,
      translation: row.translation,
      usageNote: row.usage_note,
      level: row.level,
      category: row.category,
      phraseType: row.phrase_type,
      isCore: row.is_core,
      frequencyRank: row.frequency_rank,
      tags: toStringArray(row.tags),
      sourceScene: row.source_scene_slug
        ? {
            slug: row.source_scene_slug,
            title: sceneBySlug.get(row.source_scene_slug) ?? row.source_scene_slug,
          }
        : null,
      isSaved: savedPhraseIds.has(row.id),
    }))
    .filter((row) => (levelFilter ? row.level === levelFilter : true))
    .filter((row) => (categoryFilter ? row.category === categoryFilter : true))
    .filter((row) => matchSearch(row, search))
    .sort((left, right) => {
      const frequencyDelta = (left.frequencyRank ?? Number.MAX_SAFE_INTEGER) - (right.frequencyRank ?? Number.MAX_SAFE_INTEGER);
      if (frequencyDelta !== 0) return frequencyDelta;
      const levelDelta = levelPriority(left.level) - levelPriority(right.level);
      if (levelDelta !== 0) return levelDelta;
      return left.text.localeCompare(right.text);
    })
    .slice(0, limit);

  return {
    items,
    total: items.length,
  };
}
