import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PhraseReviewFullOutputStatus,
  PhraseReviewOutputConfidence,
  PhraseReviewRecognitionState,
  PhraseReviewLogRow,
  PhraseReviewResult,
  PhraseRow,
  ScenePracticeAssessmentLevel,
  ScenePracticeMode,
  UserDailyLearningStatsRow,
  UserScenePracticeAttemptRow,
  UserPhraseReviewStatus,
  UserPhraseRow,
} from "@/lib/server/db/types";
import { ValidationError } from "@/lib/server/errors";
import { listVisibleScenesBySlugs } from "@/lib/server/scene/repository";

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);
const addHours = (hours: number) => {
  const timestamp = Date.now() + hours * 60 * 60 * 1000;
  return new Date(timestamp).toISOString();
};

const addDays = (days: number) => {
  const timestamp = Date.now() + days * 24 * 60 * 60 * 1000;
  return new Date(timestamp).toISOString();
};

export type ReviewSchedulingFocus =
  | "low_output_confidence"
  | "missing_full_output"
  | "recognition_only"
  | null;

export interface ReviewLatestSignals {
  recognitionState: PhraseReviewRecognitionState | null;
  outputConfidence: PhraseReviewOutputConfidence | null;
  fullOutputStatus: PhraseReviewFullOutputStatus | null;
  schedulingFocus: ReviewSchedulingFocus;
}

export interface DueReviewItem {
  userPhraseId: string;
  phraseId: string;
  text: string;
  translation: string | null;
  usageNote: string | null;
  sourceSceneSlug: string | null;
  sourceSceneAvailable: boolean;
  sourceSentenceText: string | null;
  expressionClusterId: string | null;
  reviewStatus: UserPhraseReviewStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewAt: string | null;
  recognitionState: PhraseReviewRecognitionState | null;
  outputConfidence: PhraseReviewOutputConfidence | null;
  fullOutputStatus: PhraseReviewFullOutputStatus | null;
  schedulingFocus: ReviewSchedulingFocus;
}

export interface SubmitPhraseReviewInput {
  userPhraseId: string;
  reviewResult: PhraseReviewResult;
  source?: string;
  recognitionState?: PhraseReviewRecognitionState;
  outputConfidence?: PhraseReviewOutputConfidence;
  fullOutputStatus?: PhraseReviewFullOutputStatus;
}

export interface ReviewSummary {
  dueReviewCount: number;
  reviewedTodayCount: number;
  reviewAccuracy: number | null;
  masteredPhraseCount: number;
  confidentOutputCountToday: number;
  fullOutputCountToday: number;
}

export interface DueScenePracticeReviewItem {
  sceneSlug: string;
  sceneTitle: string;
  exerciseId: string;
  sentenceId: string | null;
  sourceMode: ScenePracticeMode;
  recommendedMode: ScenePracticeMode;
  assessmentLevel: ScenePracticeAssessmentLevel;
  expectedAnswer: string | null;
  promptText: string | null;
  displayText: string | null;
  hint: string | null;
  latestAnswer: string;
  reviewedAt: string;
}

const practiceAssessmentPriority: Record<ScenePracticeAssessmentLevel, number> = {
  incorrect: 0,
  keyword: 1,
  structure: 2,
  complete: 3,
};

const toRecommendedPracticeMode = (
  assessmentLevel: ScenePracticeAssessmentLevel,
  sourceMode: ScenePracticeMode,
): ScenePracticeMode => {
  if (assessmentLevel === "structure") return "sentence_recall";
  if (assessmentLevel === "keyword") return sourceMode === "cloze" ? "guided_recall" : sourceMode;
  if (assessmentLevel === "incorrect") {
    if (sourceMode === "full_dictation") return "sentence_recall";
    if (sourceMode === "sentence_recall") return "guided_recall";
    return sourceMode;
  }
  return sourceMode;
};

async function loadClusterIdByUserPhraseId(userId: string, userPhraseIds: string[]) {
  const uniqueIds = Array.from(new Set(userPhraseIds.map((item) => item.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, string>();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_expression_cluster_members")
    .select("user_phrase_id, cluster:user_expression_clusters!inner(id,user_id)")
    .in("user_phrase_id", uniqueIds);

  if (error) {
    throw new Error(`Failed to load review expression clusters: ${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{
    user_phrase_id: string;
    cluster:
      | { id: string; user_id: string }
      | Array<{ id: string; user_id: string }>
      | null;
  }>) {
    const cluster = Array.isArray(row.cluster) ? (row.cluster[0] ?? null) : row.cluster;
    if (!cluster || cluster.user_id !== userId) continue;
    map.set(row.user_phrase_id, cluster.id);
  }

  return map;
}

const mapDueItem = (
  row: UserPhraseRow & { phrase: PhraseRow | null },
  expressionClusterId: string | null,
  sourceSceneAvailable: boolean,
  latestSignals?: ReviewLatestSignals,
): DueReviewItem => ({
  userPhraseId: row.id,
  phraseId: row.phrase_id,
  text: row.phrase?.display_text ?? row.source_chunk_text ?? "",
  translation: row.phrase?.translation ?? null,
  usageNote: row.phrase?.usage_note ?? null,
  sourceSceneSlug: row.source_scene_slug,
  sourceSceneAvailable,
  sourceSentenceText: row.source_sentence_text,
  expressionClusterId,
  reviewStatus: row.review_status,
  reviewCount: row.review_count,
  correctCount: row.correct_count,
  incorrectCount: row.incorrect_count,
  nextReviewAt: row.next_review_at,
  recognitionState: latestSignals?.recognitionState ?? null,
  outputConfidence: latestSignals?.outputConfidence ?? null,
  fullOutputStatus: latestSignals?.fullOutputStatus ?? null,
  schedulingFocus: latestSignals?.schedulingFocus ?? null,
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
  const fetchLimit = Math.min(400, Math.max(limit * 4, limit));
  const now = nowIso();

  const { data, error } = await admin
    .from("user_phrases")
    .select("*, phrase:phrases(*)")
    .eq("user_id", userId)
    .in("review_status", ["saved", "reviewing"])
    .or(`next_review_at.is.null,next_review_at.lte.${now}`)
    .order("next_review_at", { ascending: true, nullsFirst: true })
    .order("saved_at", { ascending: true })
    .limit(fetchLimit);

  if (error) {
    throw new Error(`Failed to load due review items: ${error.message}`);
  }

  const rows = (data ?? []) as Array<UserPhraseRow & { phrase: PhraseRow | null }>;
  const visibleScenes = await listVisibleScenesBySlugs({
    userId,
    slugs: rows.map((row) => row.source_scene_slug ?? ""),
  });
  const visibleSceneSlugSet = new Set(visibleScenes.map((row) => row.slug));
  const clusterIdByPhraseId = await loadClusterIdByUserPhraseId(
    userId,
    rows.map((row) => row.id),
  );
  const latestSignalsByPhraseId = await loadLatestReviewSignalsByUserPhraseId(
    userId,
    rows.map((row) => row.id),
  );
  const mapped = rows.map((row) =>
    mapDueItem(
      row,
      clusterIdByPhraseId.get(row.id) ?? null,
      row.source_scene_slug ? visibleSceneSlugSet.has(row.source_scene_slug) : false,
      latestSignalsByPhraseId.get(row.id),
    ),
  );

  mapped.sort((left, right) => {
    const urgencyDelta =
      getReviewSchedulingUrgencyRank(left.schedulingFocus) -
      getReviewSchedulingUrgencyRank(right.schedulingFocus);
    if (urgencyDelta !== 0) return urgencyDelta;
    const leftNext = left.nextReviewAt ?? "";
    const rightNext = right.nextReviewAt ?? "";
    const nextDelta = leftNext.localeCompare(rightNext);
    if (nextDelta !== 0) return nextDelta;
    return left.userPhraseId.localeCompare(right.userPhraseId);
  });

  return mapped.slice(0, limit);
}

export const resolveReviewSchedulingFocus = ({
  recognitionState,
  outputConfidence,
  fullOutputStatus,
}: {
  recognitionState: PhraseReviewRecognitionState | null;
  outputConfidence: PhraseReviewOutputConfidence | null;
  fullOutputStatus: PhraseReviewFullOutputStatus | null;
}): ReviewSchedulingFocus => {
  if (outputConfidence === "low") return "low_output_confidence";
  if (fullOutputStatus === "not_started") return "missing_full_output";
  if (recognitionState === "unknown") return "recognition_only";
  return null;
};

export const getReviewSchedulingUrgencyRank = (focus: ReviewSchedulingFocus) => {
  if (focus === "low_output_confidence") return 0;
  if (focus === "missing_full_output") return 1;
  if (focus === "recognition_only") return 2;
  return 3;
};

export const resolveNextReviewAt = ({
  reviewResult,
  recognitionState,
  outputConfidence,
  fullOutputStatus,
  reachesMastered,
}: {
  reviewResult: PhraseReviewResult;
  recognitionState: PhraseReviewRecognitionState | null;
  outputConfidence: PhraseReviewOutputConfidence | null;
  fullOutputStatus: PhraseReviewFullOutputStatus | null;
  reachesMastered: boolean;
}) => {
  if (reviewResult === "again") {
    if (
      outputConfidence === "low" ||
      recognitionState === "unknown" ||
      fullOutputStatus === "not_started"
    ) {
      return addHours(12);
    }
    return addDays(1);
  }

  if (reviewResult === "hard") {
    if (outputConfidence === "low" || fullOutputStatus === "not_started") {
      return addDays(2);
    }
    return addDays(3);
  }

  if (reachesMastered) return null;
  if (
    recognitionState === "recognized" &&
    outputConfidence === "high" &&
    fullOutputStatus === "completed"
  ) {
    return addDays(10);
  }
  if (outputConfidence === "low" || recognitionState === "unknown") {
    return addDays(4);
  }
  if (fullOutputStatus === "not_started") {
    return addDays(5);
  }
  return addDays(7);
};

async function loadLatestReviewSignalsByUserPhraseId(userId: string, userPhraseIds: string[]) {
  const uniqueIds = Array.from(new Set(userPhraseIds.map((item) => item.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, ReviewLatestSignals>();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("phrase_review_logs")
    .select("user_phrase_id, recognition_state, output_confidence, full_output_status, reviewed_at")
    .eq("user_id", userId)
    .in("user_phrase_id", uniqueIds)
    .order("reviewed_at", { ascending: false });

  if (error) {
    if (isReviewSignalsQueryError(error)) {
      throw new Error(toReviewSchemaErrorMessage("load latest review signals", error.message));
    }
    throw new Error(`Failed to load latest review signals: ${error.message}`);
  }

  const result = new Map<string, ReviewLatestSignals>();
  for (const row of (data ?? []) as Array<{
    user_phrase_id: string;
    recognition_state: PhraseReviewRecognitionState | null;
    output_confidence: PhraseReviewOutputConfidence | null;
    full_output_status: PhraseReviewFullOutputStatus | null;
  }>) {
    if (result.has(row.user_phrase_id)) continue;
    result.set(row.user_phrase_id, {
      recognitionState: row.recognition_state,
      outputConfidence: row.output_confidence,
      fullOutputStatus: row.full_output_status,
      schedulingFocus: resolveReviewSchedulingFocus({
        recognitionState: row.recognition_state,
        outputConfidence: row.output_confidence,
        fullOutputStatus: row.full_output_status,
      }),
    });
  }

  return result;
}

export async function getDueScenePracticeReviewItems(
  userId: string,
  params?: { limit?: number },
) {
  const admin = createSupabaseAdminClient();
  const limit = Math.min(20, Math.max(1, Math.floor(params?.limit ?? 6)));
  const { data, error } = await admin
    .from("user_scene_practice_attempts")
    .select("*, scene:scenes!inner(slug,title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(180);

  if (error) {
    throw new Error(`Failed to load scene practice review items: ${error.message}`);
  }

  const rows = (data ?? []) as Array<
    UserScenePracticeAttemptRow & {
      scene: { slug: string; title: string } | Array<{ slug: string; title: string }> | null;
    }
  >;

  const latestByKey = new Map<
    string,
    UserScenePracticeAttemptRow & {
      scene: { slug: string; title: string } | Array<{ slug: string; title: string }> | null;
    }
  >();
  for (const row of rows) {
    const key = `${row.scene_id}:${row.sentence_id ?? row.exercise_id}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, row);
    }
  }

  const candidates: DueScenePracticeReviewItem[] = [];
  for (const row of latestByKey.values()) {
    if (row.assessment_level === "complete") continue;
    const scene = Array.isArray(row.scene) ? (row.scene[0] ?? null) : row.scene;
    if (!scene) continue;
    const metadata =
      row.metadata_json && typeof row.metadata_json === "object" && !Array.isArray(row.metadata_json)
        ? (row.metadata_json as Record<string, unknown>)
        : {};
    candidates.push({
      sceneSlug: scene.slug,
      sceneTitle: scene.title,
      exerciseId: row.exercise_id,
      sentenceId: row.sentence_id,
      sourceMode: row.mode,
      recommendedMode: toRecommendedPracticeMode(row.assessment_level, row.mode),
      assessmentLevel: row.assessment_level,
      expectedAnswer:
        typeof metadata.expectedAnswer === "string" ? metadata.expectedAnswer : null,
      promptText: typeof metadata.prompt === "string" ? metadata.prompt : null,
      displayText: typeof metadata.displayText === "string" ? metadata.displayText : null,
      hint: typeof metadata.hint === "string" ? metadata.hint : null,
      latestAnswer: row.user_answer,
      reviewedAt: row.created_at,
    });
  }

  candidates.sort((left, right) => {
    const severityDelta =
      practiceAssessmentPriority[left.assessmentLevel] - practiceAssessmentPriority[right.assessmentLevel];
    if (severityDelta !== 0) return severityDelta;
    return right.reviewedAt.localeCompare(left.reviewedAt);
  });

  return candidates.slice(0, limit);
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

const isReviewSignalsQueryError = (error: { message: string; code?: string | null }) =>
  error.code === "42703" ||
  error.message.includes("recognition_state") ||
  error.message.includes("output_confidence") ||
  error.message.includes("full_output_status");

const toReviewSchemaErrorMessage = (context: string, originalMessage: string) =>
  `Review schema is not up to date (${context}): ${originalMessage}. Run supabase/sql/20260317_phase6_review_loop_mvp.sql and supabase/sql/20260331_phase20_review_practice_signals.sql after earlier review migrations.`;

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
  const reachesMastered = input.reviewResult === "good" && nextCorrectCount >= 3;
  const latestSignals: ReviewLatestSignals = {
    recognitionState: input.recognitionState ?? null,
    outputConfidence: input.outputConfidence ?? null,
    fullOutputStatus: input.fullOutputStatus ?? null,
    schedulingFocus: resolveReviewSchedulingFocus({
      recognitionState: input.recognitionState ?? null,
      outputConfidence: input.outputConfidence ?? null,
      fullOutputStatus: input.fullOutputStatus ?? null,
    }),
  };

  let nextReviewAt: string | null = null;
  let reviewStatus: UserPhraseReviewStatus = "reviewing";
  let masteredAt: string | null = existing.mastered_at ?? null;

  if (reachesMastered) {
    reviewStatus = "mastered";
    nextReviewAt = null;
    masteredAt = now;
  } else {
    reviewStatus = "reviewing";
    nextReviewAt = resolveNextReviewAt({
      reviewResult: input.reviewResult,
      recognitionState: latestSignals.recognitionState,
      outputConfidence: latestSignals.outputConfidence,
      fullOutputStatus: latestSignals.fullOutputStatus,
      reachesMastered,
    });
    masteredAt = null;
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
    recognition_state: input.recognitionState ?? null,
    output_confidence: input.outputConfidence ?? null,
    full_output_status: input.fullOutputStatus ?? null,
    was_correct: input.reviewResult !== "again",
    reviewed_at: now,
    scheduled_next_review_at: nextReviewAt,
    source: input.source?.trim() ? input.source.trim().slice(0, 80) : "review_page",
  } as never);
  if (logError) {
    throw new Error(`Failed to write phrase_review_logs: ${logError.message}`);
  }

  await addDailyReviewCompleted(userId);

  const clusterIdByPhraseId = await loadClusterIdByUserPhraseId(userId, [updated.id]);
  const visibleScenes = await listVisibleScenesBySlugs({
    userId,
    slugs: [updated.source_scene_slug ?? ""],
  });
  const visibleSceneSlugSet = new Set(visibleScenes.map((row) => row.slug));
  return mapDueItem(
    updated,
    clusterIdByPhraseId.get(updated.id) ?? null,
    updated.source_scene_slug ? visibleSceneSlugSet.has(updated.source_scene_slug) : false,
    latestSignals,
  );
}

export async function getReviewSummary(userId: string): Promise<ReviewSummary> {
  const admin = createSupabaseAdminClient();
  const now = nowIso();
  const today = todayDate();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [dueRes, todayStatsRes, accuracyRes, masteredRes, todaySignalsRes] = await Promise.all([
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
    admin
      .from("phrase_review_logs")
      .select("output_confidence,full_output_status")
      .eq("user_id", userId)
      .gte("reviewed_at", `${today}T00:00:00.000Z`)
      .lt("reviewed_at", `${today}T23:59:59.999Z`),
  ]);

  if (dueRes.error) throw new Error(`Failed to count due review items: ${dueRes.error.message}`);
  if (todayStatsRes.error) throw new Error(`Failed to read today's review stats: ${todayStatsRes.error.message}`);
  if (accuracyRes.error) throw new Error(`Failed to read phrase_review_logs: ${accuracyRes.error.message}`);
  if (masteredRes.error) throw new Error(`Failed to count mastered phrases: ${masteredRes.error.message}`);
  if (todaySignalsRes.error) {
    if (isReviewSignalsQueryError(todaySignalsRes.error)) {
      throw new Error(toReviewSchemaErrorMessage("read review practice signals", todaySignalsRes.error.message));
    }
    throw new Error(`Failed to read review practice signals: ${todaySignalsRes.error.message}`);
  }

  const accuracyRows = (accuracyRes.data ?? []) as Array<Pick<PhraseReviewLogRow, "was_correct">>;
  const signalRows = (todaySignalsRes.data ?? []) as Array<
    Pick<PhraseReviewLogRow, "output_confidence" | "full_output_status">
  >;
  const totalLogs = accuracyRows.length;
  const correctLogs = accuracyRows.filter((row) => row.was_correct).length;
  const reviewAccuracy = totalLogs === 0 ? null : Math.round((correctLogs / totalLogs) * 100);
  const confidentOutputCountToday = signalRows.filter(
    (row) => row.output_confidence === "high",
  ).length;
  const fullOutputCountToday = signalRows.filter(
    (row) => row.full_output_status === "completed",
  ).length;

  return {
    dueReviewCount: dueRes.count ?? 0,
    reviewedTodayCount: todayStatsRes.data?.review_items_completed ?? 0,
    reviewAccuracy,
    masteredPhraseCount: masteredRes.count ?? 0,
    confidentOutputCountToday,
    fullOutputCountToday,
  };
}
