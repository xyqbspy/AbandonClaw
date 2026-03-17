import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PhraseReviewLogRow,
  PhraseReviewResult,
  PhraseRow,
  UserDailyLearningStatsRow,
  UserPhraseReviewStatus,
  UserPhraseRow,
} from "@/lib/server/db/types";
import { ValidationError } from "@/lib/server/errors";

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);

const addDays = (days: number) => {
  const timestamp = Date.now() + days * 24 * 60 * 60 * 1000;
  return new Date(timestamp).toISOString();
};

export interface DueReviewItem {
  userPhraseId: string;
  phraseId: string;
  text: string;
  translation: string | null;
  usageNote: string | null;
  sourceSceneSlug: string | null;
  sourceSentenceText: string | null;
  expressionFamilyId: string | null;
  reviewStatus: UserPhraseReviewStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewAt: string | null;
}

export interface SubmitPhraseReviewInput {
  userPhraseId: string;
  reviewResult: PhraseReviewResult;
  source?: string;
}

const mapDueItem = (row: UserPhraseRow & { phrase: PhraseRow | null }): DueReviewItem => ({
  userPhraseId: row.id,
  phraseId: row.phrase_id,
  text: row.phrase?.display_text ?? row.source_chunk_text ?? "",
  translation: row.phrase?.translation ?? null,
  usageNote: row.phrase?.usage_note ?? null,
  sourceSceneSlug: row.source_scene_slug,
  sourceSentenceText: row.source_sentence_text,
  expressionFamilyId: row.expression_family_id,
  reviewStatus: row.review_status,
  reviewCount: row.review_count,
  correctCount: row.correct_count,
  incorrectCount: row.incorrect_count,
  nextReviewAt: row.next_review_at,
});

const isReviewableStatus = (status: UserPhraseReviewStatus) =>
  status === "saved" || status === "reviewing";

async function addDailyReviewCompleted(userId: string) {
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
    review_items_completed: (existing?.review_items_completed ?? 0) + 1,
    phrases_saved: existing?.phrases_saved ?? 0,
  };

  const { error: upsertError } = await admin
    .from("user_daily_learning_stats")
    .upsert(next as never, { onConflict: "user_id,date" });
  if (upsertError) {
    throw new Error(`Failed to update user_daily_learning_stats: ${upsertError.message}`);
  }
}

export async function getDueReviewItems(userId: string, params?: { limit?: number }) {
  const admin = createSupabaseAdminClient();
  const limit = Math.min(100, Math.max(1, Math.floor(params?.limit ?? 20)));
  const now = nowIso();

  const { data, error } = await admin
    .from("user_phrases")
    .select("*, phrase:phrases(*)")
    .eq("user_id", userId)
    .in("review_status", ["saved", "reviewing"])
    .or(`next_review_at.is.null,next_review_at.lte.${now}`)
    .order("next_review_at", { ascending: true, nullsFirst: true })
    .order("saved_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load due review items: ${error.message}`);
  }

  const rows = (data ?? []) as Array<UserPhraseRow & { phrase: PhraseRow | null }>;
  return rows.map(mapDueItem);
}

export async function getUserPhraseReviewBuckets(userId: string) {
  const admin = createSupabaseAdminClient();
  const now = nowIso();

  const [savedRes, reviewingRes, masteredRes, dueRes] = await Promise.all([
    admin
      .from("user_phrases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("review_status", "saved"),
    admin
      .from("user_phrases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("review_status", "reviewing"),
    admin
      .from("user_phrases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("review_status", "mastered"),
    admin
      .from("user_phrases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("review_status", ["saved", "reviewing"])
      .or(`next_review_at.is.null,next_review_at.lte.${now}`),
  ]);

  if (savedRes.error) throw new Error(`Failed to count saved review phrases: ${savedRes.error.message}`);
  if (reviewingRes.error) throw new Error(`Failed to count reviewing phrases: ${reviewingRes.error.message}`);
  if (masteredRes.error) throw new Error(`Failed to count mastered phrases: ${masteredRes.error.message}`);
  if (dueRes.error) throw new Error(`Failed to count due review phrases: ${dueRes.error.message}`);

  return {
    savedCount: savedRes.count ?? 0,
    reviewingCount: reviewingRes.count ?? 0,
    masteredCount: masteredRes.count ?? 0,
    dueCount: dueRes.count ?? 0,
  };
}

export async function submitPhraseReview(userId: string, input: SubmitPhraseReviewInput) {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("user_phrases")
    .select("*")
    .eq("id", input.userPhraseId)
    .eq("user_id", userId)
    .maybeSingle<UserPhraseRow>();
  if (existingError) {
    throw new Error(`Failed to read review phrase: ${existingError.message}`);
  }
  if (!existing) {
    throw new ValidationError("Review item not found.");
  }
  if (!isReviewableStatus(existing.review_status)) {
    throw new ValidationError("This phrase is not in an active review status.");
  }

  const now = nowIso();
  const nextReviewCount = (existing.review_count ?? 0) + 1;
  const nextCorrectCount =
    (existing.correct_count ?? 0) + (input.reviewResult === "again" ? 0 : 1);
  const nextIncorrectCount =
    (existing.incorrect_count ?? 0) + (input.reviewResult === "again" ? 1 : 0);

  let nextReviewAt: string | null = null;
  let reviewStatus: UserPhraseReviewStatus = "reviewing";
  let masteredAt: string | null = existing.mastered_at ?? null;

  if (input.reviewResult === "again") {
    nextReviewAt = addDays(1);
    reviewStatus = "reviewing";
    masteredAt = null;
  } else if (input.reviewResult === "hard") {
    nextReviewAt = addDays(3);
    reviewStatus = "reviewing";
    masteredAt = null;
  } else {
    const reachesMastered = nextCorrectCount >= 3;
    if (reachesMastered) {
      reviewStatus = "mastered";
      nextReviewAt = null;
      masteredAt = now;
    } else {
      reviewStatus = "reviewing";
      nextReviewAt = addDays(7);
      masteredAt = null;
    }
  }

  const updatePayload = {
    review_status: reviewStatus,
    review_count: nextReviewCount,
    correct_count: nextCorrectCount,
    incorrect_count: nextIncorrectCount,
    last_reviewed_at: now,
    next_review_at: nextReviewAt,
    mastered_at: masteredAt,
  };

  const { data: updated, error: updateError } = await admin
    .from("user_phrases")
    .update(updatePayload as never)
    .eq("id", existing.id)
    .eq("user_id", userId)
    .select("*, phrase:phrases(*)")
    .single<UserPhraseRow & { phrase: PhraseRow | null }>();

  if (updateError || !updated) {
    throw new Error(`Failed to update review phrase: ${updateError?.message ?? "unknown error"}`);
  }

  const { error: logError } = await admin.from("phrase_review_logs").insert({
    user_id: userId,
    phrase_id: existing.phrase_id,
    user_phrase_id: existing.id,
    review_result: input.reviewResult,
    was_correct: input.reviewResult !== "again",
    reviewed_at: now,
    scheduled_next_review_at: nextReviewAt,
    source: input.source?.trim() ? input.source.trim().slice(0, 80) : "review_page",
  } as never);
  if (logError) {
    throw new Error(`Failed to write phrase_review_logs: ${logError.message}`);
  }

  await addDailyReviewCompleted(userId);

  return mapDueItem(updated);
}

export async function getReviewSummary(userId: string) {
  const admin = createSupabaseAdminClient();
  const now = nowIso();
  const today = todayDate();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [dueRes, todayStatsRes, accuracyRes, masteredRes] = await Promise.all([
    admin
      .from("user_phrases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("review_status", ["saved", "reviewing"])
      .or(`next_review_at.is.null,next_review_at.lte.${now}`),
    admin
      .from("user_daily_learning_stats")
      .select("review_items_completed")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle<{ review_items_completed: number }>(),
    admin
      .from("phrase_review_logs")
      .select("was_correct")
      .eq("user_id", userId)
      .gte("reviewed_at", thirtyDaysAgo),
    admin
      .from("user_phrases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("review_status", "mastered"),
  ]);

  if (dueRes.error) throw new Error(`Failed to count due review items: ${dueRes.error.message}`);
  if (todayStatsRes.error) throw new Error(`Failed to read today's review stats: ${todayStatsRes.error.message}`);
  if (accuracyRes.error) throw new Error(`Failed to read phrase_review_logs: ${accuracyRes.error.message}`);
  if (masteredRes.error) throw new Error(`Failed to count mastered phrases: ${masteredRes.error.message}`);

  const accuracyRows = (accuracyRes.data ?? []) as Array<Pick<PhraseReviewLogRow, "was_correct">>;
  const totalLogs = accuracyRows.length;
  const correctLogs = accuracyRows.filter((row) => row.was_correct).length;
  const reviewAccuracy = totalLogs === 0 ? null : Math.round((correctLogs / totalLogs) * 100);

  return {
    dueReviewCount: dueRes.count ?? 0,
    reviewedTodayCount: todayStatsRes.data?.review_items_completed ?? 0,
    reviewAccuracy,
    masteredPhraseCount: masteredRes.count ?? 0,
  };
}
