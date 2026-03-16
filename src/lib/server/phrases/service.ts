import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PhraseRow,
  UserDailyLearningStatsRow,
  UserPhraseRow,
  UserSceneProgressRow,
} from "@/lib/server/db/types";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { ValidationError } from "@/lib/server/errors";
import { getSceneRecordBySlug } from "@/lib/server/services/scene-service";

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);

export interface SavePhraseInput {
  text: string;
  translation?: string;
  usageNote?: string;
  difficulty?: string;
  tags?: string[];
  sourceSceneSlug?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
}

export interface UserSavedPhraseItem {
  userPhraseId: string;
  phraseId: string;
  text: string;
  normalizedText: string;
  translation: string | null;
  usageNote: string | null;
  difficulty: string | null;
  tags: string[];
  sourceSceneSlug: string | null;
  sourceSentenceIndex: number | null;
  sourceSentenceText: string | null;
  sourceChunkText: string | null;
  savedAt: string;
  lastSeenAt: string;
}

const parseOptionalTrimmed = (value: unknown, maxLength = 500) => {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const parseTags = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const tags = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  return Array.from(new Set(tags));
};

const mapSavedPhraseRow = (row: UserPhraseRow & { phrase: PhraseRow | null }): UserSavedPhraseItem => ({
  userPhraseId: row.id,
  phraseId: row.phrase_id,
  text: row.phrase?.display_text ?? row.source_chunk_text ?? "",
  normalizedText: row.phrase?.normalized_text ?? "",
  translation: row.phrase?.translation ?? null,
  usageNote: row.phrase?.usage_note ?? null,
  difficulty: row.phrase?.difficulty ?? null,
  tags: Array.isArray(row.phrase?.tags) ? (row.phrase?.tags as string[]) : [],
  sourceSceneSlug: row.source_scene_slug,
  sourceSentenceIndex: row.source_sentence_index,
  sourceSentenceText: row.source_sentence_text,
  sourceChunkText: row.source_chunk_text,
  savedAt: row.saved_at,
  lastSeenAt: row.last_seen_at,
});

async function ensurePhraseEntity(input: {
  normalizedText: string;
  displayText: string;
  translation: string | null;
  usageNote: string | null;
  difficulty: string | null;
  tags: string[];
}) {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: findError } = await admin
    .from("phrases")
    .select("*")
    .eq("normalized_text", input.normalizedText)
    .maybeSingle<PhraseRow>();

  if (findError) {
    throw new Error(`Failed to find phrase: ${findError.message}`);
  }
  if (existing) return existing;

  const insertPayload = {
    normalized_text: input.normalizedText,
    display_text: input.displayText,
    translation: input.translation,
    usage_note: input.usageNote,
    difficulty: input.difficulty,
    tags: input.tags,
  };

  const { data: inserted, error: insertError } = await admin
    .from("phrases")
    .insert(insertPayload as never)
    .select("*")
    .single<PhraseRow>();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raceWinner, error: raceReadError } = await admin
        .from("phrases")
        .select("*")
        .eq("normalized_text", input.normalizedText)
        .single<PhraseRow>();
      if (raceReadError || !raceWinner) {
        throw new Error(
          `Failed to resolve phrase upsert race: ${raceReadError?.message ?? "unknown error"}`,
        );
      }
      return raceWinner;
    }
    throw new Error(`Failed to create phrase: ${insertError.message}`);
  }

  return inserted;
}

async function addDailyPhraseSaved(userId: string) {
  const admin = createSupabaseAdminClient();
  const today = todayDate();
  const { data: existing, error: readError } = await admin
    .from("user_daily_learning_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle<UserDailyLearningStatsRow>();

  if (readError) {
    throw new Error(`Failed to read user_daily_learning_stats: ${readError.message}`);
  }

  const next = {
    user_id: userId,
    date: today,
    study_seconds: existing?.study_seconds ?? 0,
    scenes_started: existing?.scenes_started ?? 0,
    scenes_completed: existing?.scenes_completed ?? 0,
    review_items_completed: existing?.review_items_completed ?? 0,
    phrases_saved: (existing?.phrases_saved ?? 0) + 1,
  };

  const { error: upsertError } = await admin
    .from("user_daily_learning_stats")
    .upsert(next as never, { onConflict: "user_id,date" });
  if (upsertError) {
    throw new Error(`Failed to update user_daily_learning_stats: ${upsertError.message}`);
  }
}

async function incrementSceneSavedPhraseCount(userId: string, sceneId: string) {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: readError } = await admin
    .from("user_scene_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .maybeSingle<UserSceneProgressRow>();

  if (readError) {
    throw new Error(`Failed to read user_scene_progress: ${readError.message}`);
  }

  const next = {
    user_id: userId,
    scene_id: sceneId,
    status: existing?.status ?? "not_started",
    progress_percent: existing?.progress_percent ?? 0,
    last_sentence_index: existing?.last_sentence_index ?? null,
    last_variant_index: existing?.last_variant_index ?? null,
    started_at: existing?.started_at ?? null,
    last_viewed_at: existing?.last_viewed_at ?? nowIso(),
    completed_at: existing?.completed_at ?? null,
    total_study_seconds: existing?.total_study_seconds ?? 0,
    today_study_seconds: existing?.today_study_seconds ?? 0,
    // Phase3 compatibility: this mirror counter stays in sync for legacy cards/tasks.
    saved_phrase_count: (existing?.saved_phrase_count ?? 0) + 1,
  };

  const { error: upsertError } = await admin
    .from("user_scene_progress")
    .upsert(next as never, { onConflict: "user_id,scene_id" });

  if (upsertError) {
    throw new Error(`Failed to update scene progress saved_phrase_count: ${upsertError.message}`);
  }
}

export async function savePhraseForUser(userId: string, input: SavePhraseInput) {
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text) {
    throw new ValidationError("text is required.");
  }
  if (text.length < 2) {
    throw new ValidationError("text is too short.");
  }
  if (text.length > 200) {
    throw new ValidationError("text must be <= 200 characters.");
  }

  const normalizedText = normalizePhraseText(text);
  const phrase = await ensurePhraseEntity({
    normalizedText,
    displayText: text,
    translation: parseOptionalTrimmed(input.translation, 500),
    usageNote: parseOptionalTrimmed(input.usageNote, 1000),
    difficulty: parseOptionalTrimmed(input.difficulty, 64),
    tags: parseTags(input.tags),
  });

  let sourceSceneId: string | null = null;
  const sourceSceneSlug = parseOptionalTrimmed(input.sourceSceneSlug, 200);
  if (sourceSceneSlug) {
    const scene = await getSceneRecordBySlug({ slug: sourceSceneSlug, userId });
    if (scene) sourceSceneId = scene.row.id;
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("user_phrases")
    .select("*")
    .eq("user_id", userId)
    .eq("phrase_id", phrase.id)
    .maybeSingle<UserPhraseRow>();

  if (existingError) {
    throw new Error(`Failed to read user phrase: ${existingError.message}`);
  }

  const now = nowIso();
  const nextPayload = {
    user_id: userId,
    phrase_id: phrase.id,
    status: "saved" as const,
    source_scene_id: sourceSceneId ?? existing?.source_scene_id ?? null,
    source_scene_slug: sourceSceneSlug ?? existing?.source_scene_slug ?? null,
    source_sentence_index:
      typeof input.sourceSentenceIndex === "number" &&
      Number.isFinite(input.sourceSentenceIndex)
        ? Math.max(0, Math.floor(input.sourceSentenceIndex))
        : existing?.source_sentence_index ?? null,
    source_sentence_text:
      parseOptionalTrimmed(input.sourceSentenceText, 3000) ??
      existing?.source_sentence_text ??
      null,
    source_chunk_text:
      parseOptionalTrimmed(input.sourceChunkText, 500) ??
      existing?.source_chunk_text ??
      text,
    saved_at: existing?.saved_at ?? now,
    last_seen_at: now,
  };

  const { data: savedRow, error: upsertError } = await admin
    .from("user_phrases")
    .upsert(nextPayload as never, { onConflict: "user_id,phrase_id" })
    .select("*")
    .single<UserPhraseRow>();

  if (upsertError || !savedRow) {
    throw new Error(`Failed to save user phrase: ${upsertError?.message ?? "unknown error"}`);
  }

  const created = !existing;
  if (created) {
    await addDailyPhraseSaved(userId);
    if (sourceSceneId) {
      await incrementSceneSavedPhraseCount(userId, sourceSceneId);
    }
  }

  return {
    phrase,
    userPhrase: savedRow,
    created,
  };
}

export async function listUserSavedPhrases(params: {
  userId: string;
  query?: string;
  status?: "saved" | "archived";
  page?: number;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = admin
    .from("user_phrases")
    .select("*, phrase:phrases(*)", { count: "exact" })
    .eq("user_id", params.userId)
    .order("saved_at", { ascending: false })
    .range(from, to);

  query = query.eq("status", params.status ?? "saved");

  const textQuery = params.query?.trim();
  if (textQuery) {
    query = query.or(
      `source_chunk_text.ilike.%${textQuery}%,source_sentence_text.ilike.%${textQuery}%,phrase.display_text.ilike.%${textQuery}%,phrase.translation.ilike.%${textQuery}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list user phrases: ${error.message}`);
  }

  const rows = (data ?? []) as Array<UserPhraseRow & { phrase: PhraseRow | null }>;
  return {
    rows: rows.map(mapSavedPhraseRow),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function listUserSavedPhraseTextsByNormalized(
  userId: string,
  normalizedTexts: string[],
) {
  const uniqueTexts = Array.from(
    new Set(normalizedTexts.map((text) => normalizePhraseText(text)).filter(Boolean)),
  ).slice(0, 120);
  if (uniqueTexts.length === 0) return [];

  const admin = createSupabaseAdminClient();
  const { data: phraseRows, error: phraseError } = await admin
    .from("phrases")
    .select("id,normalized_text")
    .in("normalized_text", uniqueTexts);
  if (phraseError) {
    throw new Error(`Failed to read phrases for normalized lookup: ${phraseError.message}`);
  }

  const phraseIdByText = new Map<string, string>();
  for (const row of (phraseRows ?? []) as Array<{ id: string; normalized_text: string }>) {
    phraseIdByText.set(row.normalized_text, row.id);
  }
  const phraseIds = Array.from(phraseIdByText.values());
  if (phraseIds.length === 0) return [];

  const { data: userRows, error: userError } = await admin
    .from("user_phrases")
    .select("phrase_id")
    .eq("user_id", userId)
    .eq("status", "saved")
    .in("phrase_id", phraseIds);
  if (userError) {
    throw new Error(`Failed to read user phrases for normalized lookup: ${userError.message}`);
  }

  const savedPhraseIds = new Set(
    ((userRows ?? []) as Array<{ phrase_id: string }>).map((row) => row.phrase_id),
  );
  return uniqueTexts.filter((text) => {
    const phraseId = phraseIdByText.get(text);
    if (!phraseId) return false;
    return savedPhraseIds.has(phraseId);
  });
}

export async function getUserPhraseSummary(userId: string) {
  const admin = createSupabaseAdminClient();

  const [{ count: totalSavedPhrases, error: totalError }, { data: dailyStats, error: dailyError }] =
    await Promise.all([
      admin
        .from("user_phrases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "saved"),
      admin
        .from("user_daily_learning_stats")
        .select("phrases_saved")
        .eq("user_id", userId)
        .eq("date", todayDate())
        .maybeSingle<{ phrases_saved: number }>(),
    ]);

  if (totalError) {
    throw new Error(`Failed to count saved phrases: ${totalError.message}`);
  }
  if (dailyError) {
    throw new Error(`Failed to read daily phrase summary: ${dailyError.message}`);
  }

  return {
    totalSavedPhrases: totalSavedPhrases ?? 0,
    todaySavedPhrases: dailyStats?.phrases_saved ?? 0,
  };
}
