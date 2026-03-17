import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PhraseRow,
  UserDailyLearningStatsRow,
  UserPhraseRow,
  UserPhraseReviewStatus,
  UserSceneProgressRow,
} from "@/lib/server/db/types";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { ValidationError } from "@/lib/server/errors";
import { getSceneRecordBySlug } from "@/lib/server/services/scene-service";

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);
const FAMILY_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "and",
  "or",
  "for",
  "in",
  "on",
  "at",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "this",
  "that",
  "i",
  "you",
  "he",
  "she",
  "we",
  "they",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "with",
  "from",
  "as",
  "my",
  "your",
  "his",
  "her",
  "our",
  "their",
]);

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
  expressionFamilyId?: string;
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
  expressionFamilyId: string | null;
  savedAt: string;
  lastSeenAt: string;
  reviewStatus: UserPhraseReviewStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  masteredAt: string | null;
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

const normalizeSceneLineage = (sceneSlug: string | null) => {
  if (!sceneSlug) return "global";
  return sceneSlug
    .trim()
    .toLowerCase()
    .replace(/-variant-\d+$/i, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "global";
};

const extractCoreTokens = (normalizedText: string) =>
  normalizedText
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !FAMILY_STOP_WORDS.has(token))
    .slice(0, 6);

const computeTokenJaccard = (a: string[], b: string[]) => {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

const buildFamilyIdByRule = (params: {
  sourceSceneSlug: string | null;
  normalizedText: string;
}) => {
  const lineage = normalizeSceneLineage(params.sourceSceneSlug);
  const tokens = extractCoreTokens(params.normalizedText);
  const key = tokens.slice(0, 2).join("-") || params.normalizedText.split(" ").slice(0, 2).join("-");
  const safeKey = key.replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `fam:${lineage}:${safeKey || "expression"}`.slice(0, 120);
};

async function inferExpressionFamilyId(params: {
  userId: string;
  sourceSceneSlug: string | null;
  normalizedText: string;
  providedFamilyId: string | null;
  existingFamilyId: string | null;
}) {
  if (params.providedFamilyId) return params.providedFamilyId;
  if (params.existingFamilyId) return params.existingFamilyId;

  const candidateByRule = buildFamilyIdByRule({
    sourceSceneSlug: params.sourceSceneSlug,
    normalizedText: params.normalizedText,
  });

  const admin = createSupabaseAdminClient();
  const lineage = normalizeSceneLineage(params.sourceSceneSlug);
  const sceneSlugPrefix = lineage === "global" ? null : lineage;

  let query = admin
    .from("user_phrases")
    .select("expression_family_id,source_scene_slug,source_chunk_text")
    .eq("user_id", params.userId)
    .eq("status", "saved")
    .limit(80);

  if (sceneSlugPrefix) {
    query = query.or(
      `source_scene_slug.eq.${sceneSlugPrefix},source_scene_slug.like.${sceneSlugPrefix}-variant-%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return candidateByRule;
  }

  const currentTokens = extractCoreTokens(params.normalizedText);
  let bestMatch: { score: number; familyId: string | null } | null = null;
  for (const row of (data ?? []) as Array<{
    expression_family_id: string | null;
    source_scene_slug: string | null;
    source_chunk_text: string | null;
  }>) {
    const candidateText = normalizePhraseText(row.source_chunk_text ?? "");
    if (!candidateText) continue;
    const candidateTokens = extractCoreTokens(candidateText);
    const jaccard = computeTokenJaccard(currentTokens, candidateTokens);
    const includeScore =
      params.normalizedText.includes(candidateText) || candidateText.includes(params.normalizedText)
        ? 0.4
        : 0;
    const score = jaccard + includeScore;
    if (score < 0.55) continue;
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { score, familyId: row.expression_family_id };
    }
  }

  if (bestMatch?.familyId) return bestMatch.familyId;
  return candidateByRule;
}

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
  expressionFamilyId: row.expression_family_id,
  savedAt: row.saved_at,
  lastSeenAt: row.last_seen_at,
  reviewStatus: row.review_status,
  reviewCount: row.review_count,
  correctCount: row.correct_count,
  incorrectCount: row.incorrect_count,
  lastReviewedAt: row.last_reviewed_at,
  nextReviewAt: row.next_review_at,
  masteredAt: row.mastered_at,
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
  const providedFamilyId = parseOptionalTrimmed(input.expressionFamilyId, 120);
  const inferredFamilyId = await inferExpressionFamilyId({
    userId,
    sourceSceneSlug,
    normalizedText,
    providedFamilyId,
    existingFamilyId: existing?.expression_family_id ?? null,
  });
  const nextPayload = {
    user_id: userId,
    phrase_id: phrase.id,
    status: "saved" as const,
    // MVP review loop: new saved phrases should be immediately due once,
    // so users can see "today due" and complete their first review quickly.
    review_status:
      existing?.review_status === "archived"
        ? ("saved" as const)
        : (existing?.review_status ?? ("saved" as const)),
    review_count: existing?.review_count ?? 0,
    correct_count: existing?.correct_count ?? 0,
    incorrect_count: existing?.incorrect_count ?? 0,
    last_reviewed_at: existing?.last_reviewed_at ?? null,
    next_review_at:
      existing?.next_review_at ??
      (existing?.review_status === "mastered" ? null : now),
    mastered_at: existing?.mastered_at ?? null,
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
    expression_family_id:
      inferredFamilyId ?? null,
    saved_at: existing?.saved_at ?? now,
    last_seen_at: now,
  };

  const { data: savedRow, error: upsertError } = await admin
    .from("user_phrases")
    .upsert(nextPayload as never, { onConflict: "user_id,phrase_id" })
    .select("*")
    .single<UserPhraseRow>();

  let finalSavedRow = savedRow;
  if (upsertError) {
    const shouldFallbackWithoutFamilyColumn =
      upsertError.code === "42703" ||
      upsertError.message.toLowerCase().includes("expression_family_id");

    if (shouldFallbackWithoutFamilyColumn) {
      const fallbackPayload = { ...nextPayload };
      delete (fallbackPayload as Record<string, unknown>).expression_family_id;
      const { data: fallbackRow, error: fallbackError } = await admin
        .from("user_phrases")
        .upsert(fallbackPayload as never, { onConflict: "user_id,phrase_id" })
        .select("*")
        .single<UserPhraseRow>();
      if (fallbackError || !fallbackRow) {
        throw new Error(
          `Failed to save user phrase (fallback): ${fallbackError?.message ?? "unknown error"}`,
        );
      }
      finalSavedRow = fallbackRow;
    } else {
      throw new Error(`Failed to save user phrase: ${upsertError.message}`);
    }
  }

  if (!finalSavedRow) {
    throw new Error("Failed to save user phrase: unknown error");
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
    userPhrase: finalSavedRow,
    created,
  };
}

export async function listUserSavedPhrases(params: {
  userId: string;
  query?: string;
  status?: "saved" | "archived";
  reviewStatus?: UserPhraseReviewStatus | "all";
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
  if (params.reviewStatus && params.reviewStatus !== "all") {
    query = query.eq("review_status", params.reviewStatus);
  }

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
