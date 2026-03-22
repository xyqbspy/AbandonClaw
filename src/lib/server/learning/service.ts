import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  LearningStatus,
  SceneRow,
  UserDailyLearningStatsRow,
  UserSceneProgressRow,
} from "@/lib/server/db/types";
import { getSceneRecordBySlug } from "@/lib/server/scene/service";
import { getUserPhraseSummary } from "@/lib/server/phrases/service";
import { getReviewSummary } from "@/lib/server/review/service";
import { NotFoundError } from "@/lib/server/errors";

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toLearningSchemaErrorMessage = (context: string, originalMessage: string) =>
  `Learning schema is not up to date (${context}): ${originalMessage}. Run supabase/sql/20260316_phase3_learning_loop_mvp.sql first.`;

const throwLearningQueryError = (
  context: string,
  error: { message: string; code?: string | null },
) => {
  if (error.code === "42703" || error.message.includes("column user_scene_progress.")) {
    throw new Error(toLearningSchemaErrorMessage(context, error.message));
  }
  throw new Error(`Failed to ${context}: ${error.message}`);
};

export interface SceneProgressView {
  id: string;
  sceneId: string;
  status: LearningStatus;
  progressPercent: number;
  lastSentenceIndex: number | null;
  lastVariantIndex: number | null;
  startedAt: string | null;
  lastViewedAt: string | null;
  completedAt: string | null;
  totalStudySeconds: number;
  // Phase3 note: today_study_seconds is a lightweight mirror for write-side convenience.
  // Dashboard/statistics should use user_daily_learning_stats as the source of truth.
  todayStudySeconds: number;
  // Phase3 placeholder: saved_phrase_count is currently progress-level aggregation,
  // and will be replaced by the dedicated phrase system in a later phase.
  savedPhraseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContinueLearningItem {
  sceneSlug: string;
  title: string;
  subtitle: string | null;
  progressPercent: number;
  lastViewedAt: string | null;
  lastSentenceIndex: number | null;
  estimatedMinutes: number | null;
  savedPhraseCount: number;
}

export interface TodayLearningTasks {
  sceneTask: {
    done: boolean;
    continueSceneSlug: string | null;
  };
  reviewTask: {
    done: boolean;
    reviewItemsCompleted: number;
    dueReviewCount: number;
  };
  outputTask: {
    done: boolean;
    phrasesSavedToday: number;
  };
}

export interface LearningOverview {
  streakDays: number;
  completedScenesCount: number;
  inProgressScenesCount: number;
  savedPhraseCount: number;
  recentStudyMinutes: number;
  reviewAccuracy: number | null;
}

const toProgressView = (row: UserSceneProgressRow): SceneProgressView => ({
  id: row.id,
  sceneId: row.scene_id,
  status: row.status,
  progressPercent: Number(row.progress_percent ?? 0),
  lastSentenceIndex: row.last_sentence_index,
  lastVariantIndex: row.last_variant_index,
  startedAt: row.started_at,
  lastViewedAt: row.last_viewed_at,
  completedAt: row.completed_at,
  totalStudySeconds: row.total_study_seconds,
  todayStudySeconds: row.today_study_seconds,
  savedPhraseCount: row.saved_phrase_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function resolveVisibleSceneBySlug(userId: string, sceneSlug: string) {
  const scene = await getSceneRecordBySlug({ slug: sceneSlug, userId });
  if (!scene) {
    throw new NotFoundError("Scene not found.");
  }
  return scene.row;
}

async function getProgressByUserAndScene(userId: string, sceneId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_scene_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .maybeSingle<UserSceneProgressRow>();
  if (error) {
    throw new Error(`Failed to read user_scene_progress: ${error.message}`);
  }
  return data ?? null;
}

async function upsertDailyStats(params: {
  userId: string;
  date?: string;
  studySecondsDelta?: number;
  scenesStartedDelta?: number;
  scenesCompletedDelta?: number;
  phrasesSavedDelta?: number;
}) {
  const admin = createSupabaseAdminClient();
  const date = params.date ?? todayDate();

  const { data: existing, error: readError } = await admin
    .from("user_daily_learning_stats")
    .select("*")
    .eq("user_id", params.userId)
    .eq("date", date)
    .maybeSingle<UserDailyLearningStatsRow>();

  if (readError) {
    throw new Error(`Failed to read user_daily_learning_stats: ${readError.message}`);
  }

  const next = {
    user_id: params.userId,
    date,
    study_seconds: (existing?.study_seconds ?? 0) + (params.studySecondsDelta ?? 0),
    scenes_started: (existing?.scenes_started ?? 0) + (params.scenesStartedDelta ?? 0),
    scenes_completed: (existing?.scenes_completed ?? 0) + (params.scenesCompletedDelta ?? 0),
    review_items_completed: existing?.review_items_completed ?? 0,
    phrases_saved: (existing?.phrases_saved ?? 0) + (params.phrasesSavedDelta ?? 0),
  };

  const { error: upsertError } = await admin
    .from("user_daily_learning_stats")
    .upsert(next as never, { onConflict: "user_id,date" });

  if (upsertError) {
    throw new Error(`Failed to upsert user_daily_learning_stats: ${upsertError.message}`);
  }
}

async function upsertProgress(
  userId: string,
  sceneId: string,
  patch: Partial<UserSceneProgressRow>,
) {
  const admin = createSupabaseAdminClient();
  const existing = await getProgressByUserAndScene(userId, sceneId);
  const next = {
    user_id: userId,
    scene_id: sceneId,
    status: existing?.status ?? "not_started",
    progress_percent: existing?.progress_percent ?? 0,
    last_sentence_index: existing?.last_sentence_index ?? null,
    last_variant_index: existing?.last_variant_index ?? null,
    started_at: existing?.started_at ?? null,
    last_viewed_at: existing?.last_viewed_at ?? null,
    completed_at: existing?.completed_at ?? null,
    total_study_seconds: existing?.total_study_seconds ?? 0,
    today_study_seconds: existing?.today_study_seconds ?? 0,
    saved_phrase_count: existing?.saved_phrase_count ?? 0,
    ...patch,
  };

  const { data, error } = await admin
    .from("user_scene_progress")
    .upsert(next as never, { onConflict: "user_id,scene_id" })
    .select("*")
    .single<UserSceneProgressRow>();

  if (error || !data) {
    throw new Error(`Failed to upsert user_scene_progress: ${error?.message ?? "unknown error"}`);
  }
  return { existing, row: data };
}

export async function startSceneLearning(userId: string, sceneSlug: string) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const timestamp = nowIso();
  const current = await getProgressByUserAndScene(userId, scene.id);

  let nextStatus: LearningStatus = current?.status ?? "in_progress";
  // Closed-loop MVP rule: re-entering a completed scene keeps it completed
  // (we only refresh last_viewed_at), avoiding accidental status regression.
  if (!current || current.status === "not_started" || current.status === "paused") {
    nextStatus = "in_progress";
  } else if (current.status === "completed") {
    nextStatus = "completed";
  }

  const { row, existing } = await upsertProgress(userId, scene.id, {
    status: nextStatus,
    started_at: current?.started_at ?? timestamp,
    last_viewed_at: timestamp,
  });

  if (!existing || !existing.started_at) {
    await upsertDailyStats({ userId, scenesStartedDelta: 1 });
  }

  return {
    scene,
    progress: toProgressView(row),
  };
}

export async function updateSceneProgress(
  userId: string,
  sceneSlug: string,
  input: {
    progressPercent?: number;
    lastSentenceIndex?: number;
    lastVariantIndex?: number;
    studySecondsDelta?: number;
    savedPhraseDelta?: number;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const current = await getProgressByUserAndScene(userId, scene.id);
  const timestamp = nowIso();
  const studyDelta = Math.max(0, Math.floor(input.studySecondsDelta ?? 0));
  const phraseDelta = Math.max(0, Math.floor(input.savedPhraseDelta ?? 0));

  const nextProgressPercent = clamp(
    input.progressPercent ?? Number(current?.progress_percent ?? 0),
    0,
    100,
  );
  const oldProgressPercent = Number(current?.progress_percent ?? 0);
  // Progress updates should be monotonic in MVP to avoid accidental regressions
  // from out-of-order UI events or stale local state.
  const monotonicProgressPercent = Math.max(oldProgressPercent, nextProgressPercent);

  const nextStatus: LearningStatus =
    current?.status === "completed" ? "completed" : "in_progress";

  const { row } = await upsertProgress(userId, scene.id, {
    status: nextStatus,
    progress_percent: nextStatus === "completed" ? 100 : monotonicProgressPercent,
    last_sentence_index:
      input.lastSentenceIndex ?? current?.last_sentence_index ?? null,
    last_variant_index:
      input.lastVariantIndex ?? current?.last_variant_index ?? null,
    started_at: current?.started_at ?? timestamp,
    last_viewed_at: timestamp,
    total_study_seconds: (current?.total_study_seconds ?? 0) + studyDelta,
    today_study_seconds: (current?.today_study_seconds ?? 0) + studyDelta,
    saved_phrase_count: (current?.saved_phrase_count ?? 0) + phraseDelta,
  });

  if (studyDelta > 0 || phraseDelta > 0) {
    await upsertDailyStats({
      userId,
      studySecondsDelta: studyDelta,
      phrasesSavedDelta: phraseDelta,
    });
  }

  return {
    scene,
    progress: toProgressView(row),
  };
}

export async function completeSceneLearning(
  userId: string,
  sceneSlug: string,
  input?: {
    studySecondsDelta?: number;
    savedPhraseDelta?: number;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const timestamp = nowIso();
  const current = await getProgressByUserAndScene(userId, scene.id);
  const studyDelta = Math.max(0, Math.floor(input?.studySecondsDelta ?? 0));
  const phraseDelta = Math.max(0, Math.floor(input?.savedPhraseDelta ?? 0));

  const transitionedToCompleted = current?.status !== "completed";

  const { row } = await upsertProgress(userId, scene.id, {
    status: "completed",
    // Completion is authoritative: always force 100 on server side.
    progress_percent: 100,
    started_at: current?.started_at ?? timestamp,
    completed_at: current?.completed_at ?? timestamp,
    last_viewed_at: timestamp,
    total_study_seconds: (current?.total_study_seconds ?? 0) + studyDelta,
    today_study_seconds: (current?.today_study_seconds ?? 0) + studyDelta,
    saved_phrase_count: (current?.saved_phrase_count ?? 0) + phraseDelta,
  });

  await upsertDailyStats({
    userId,
    studySecondsDelta: studyDelta,
    phrasesSavedDelta: phraseDelta,
    scenesCompletedDelta: transitionedToCompleted ? 1 : 0,
  });

  return {
    scene,
    progress: toProgressView(row),
  };
}

export async function pauseSceneLearning(userId: string, sceneSlug: string) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const current = await getProgressByUserAndScene(userId, scene.id);
  if (!current) {
    const { progress } = await startSceneLearning(userId, sceneSlug);
    return { scene, progress };
  }

  const { row } = await upsertProgress(userId, scene.id, {
    status: current.status === "in_progress" ? "paused" : current.status,
    last_viewed_at: nowIso(),
  });

  return {
    scene,
    progress: toProgressView(row),
  };
}

const parseEstimatedMinutesFromSceneJson = (scene: SceneRow) => {
  const json = scene.scene_json as { estimatedMinutes?: unknown };
  return typeof json?.estimatedMinutes === "number" ? json.estimatedMinutes : null;
};

const toContinueItem = (
  scene: Pick<SceneRow, "slug" | "title" | "translation" | "scene_json">,
  progress: UserSceneProgressRow,
): ContinueLearningItem => ({
  sceneSlug: scene.slug,
  title: scene.title,
  subtitle: scene.translation,
  progressPercent: Number(progress.progress_percent ?? 0),
  lastViewedAt: progress.last_viewed_at,
  lastSentenceIndex: progress.last_sentence_index,
  estimatedMinutes: parseEstimatedMinutesFromSceneJson(scene as SceneRow),
  savedPhraseCount: progress.saved_phrase_count ?? 0,
});

export async function getContinueLearningScene(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_scene_progress")
    .select("*, scenes!inner(id,slug,title,translation,scene_json)")
    .eq("user_id", userId)
    // Continue card only accepts active/interrupted learning states.
    // Completed scenes are intentionally excluded.
    .in("status", ["in_progress", "paused"])
    .order("last_viewed_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) {
    throwLearningQueryError("query continue learning scene", error);
  }

  const rows = (data ?? []) as Array<
    UserSceneProgressRow & {
      scenes: Pick<SceneRow, "id" | "slug" | "title" | "translation" | "scene_json">;
    }
  >;
  if (rows.length === 0) return null;
  const inProgress = rows.find((row) => row.status === "in_progress") ?? null;
  if (inProgress) return toContinueItem(inProgress.scenes, inProgress);
  const paused = rows.find((row) => row.status === "paused") ?? null;
  return paused ? toContinueItem(paused.scenes, paused) : null;
}

export async function getTodayLearningTasks(userId: string): Promise<TodayLearningTasks> {
  const admin = createSupabaseAdminClient();
  const continueScene = await getContinueLearningScene(userId);
  const [reviewSummary, statsQuery] = await Promise.all([
    getReviewSummary(userId),
    admin
      .from("user_daily_learning_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("date", todayDate())
      .maybeSingle<UserDailyLearningStatsRow>(),
  ]);

  const { data: statsRow, error: statsError } = statsQuery;
  if (statsError) {
    throwLearningQueryError("query today learning stats", statsError);
  }

  const scenesCompleted = statsRow?.scenes_completed ?? 0;
  const phrasesSaved = statsRow?.phrases_saved ?? 0;
  const reviewItemsCompleted = statsRow?.review_items_completed ?? 0;

  return {
    sceneTask: {
      done: scenesCompleted > 0,
      continueSceneSlug: continueScene?.sceneSlug ?? null,
    },
    reviewTask: {
      done: reviewSummary.dueReviewCount === 0 || reviewItemsCompleted > 0,
      reviewItemsCompleted,
      dueReviewCount: reviewSummary.dueReviewCount,
    },
    outputTask: {
      done: phrasesSaved >= 1,
      phrasesSavedToday: phrasesSaved,
    },
  };
}

const calculateStreakDays = (dates: string[]) => {
  if (dates.length === 0) return 0;
  const dateSet = new Set(dates);
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const day = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(day)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export async function getLearningOverview(userId: string): Promise<LearningOverview> {
  const admin = createSupabaseAdminClient();

  const [completedRes, inProgressRes, phraseSummary, recentStatsRes, streakRes, reviewSummary] =
    await Promise.all([
      admin
        .from("user_scene_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed"),
      admin
        .from("user_scene_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["in_progress", "paused"]),
      getUserPhraseSummary(userId),
      admin
        .from("user_daily_learning_stats")
        .select("study_seconds,date")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(7),
      admin
        .from("user_daily_learning_stats")
        .select("date")
        .eq("user_id", userId)
        .gt("study_seconds", 0)
        .order("date", { ascending: false })
        .limit(60),
      getReviewSummary(userId),
    ]);

  if (completedRes.error) {
    throwLearningQueryError("count completed scenes", completedRes.error);
  }
  if (inProgressRes.error) {
    throwLearningQueryError("count in-progress scenes", inProgressRes.error);
  }
  if (recentStatsRes.error) {
    throwLearningQueryError("read recent study stats", recentStatsRes.error);
  }
  if (streakRes.error) {
    throwLearningQueryError("read streak stats", streakRes.error);
  }

  const totalSavedPhrases = phraseSummary.totalSavedPhrases;
  const recentStudySeconds = (recentStatsRes.data ?? []).reduce(
    (sum, row) => sum + Number((row as { study_seconds?: number }).study_seconds ?? 0),
    0,
  );
  const streakDays = calculateStreakDays(
    (streakRes.data ?? []).map((row) => (row as { date: string }).date),
  );

  return {
    streakDays,
    completedScenesCount: completedRes.count ?? 0,
    inProgressScenesCount: inProgressRes.count ?? 0,
    savedPhraseCount: totalSavedPhrases,
    recentStudyMinutes: Math.round(recentStudySeconds / 60),
    reviewAccuracy: reviewSummary.reviewAccuracy,
  };
}

export async function getLearningDashboard(userId: string) {
  const [overview, continueLearning, todayTasks] = await Promise.all([
    getLearningOverview(userId),
    getContinueLearningScene(userId),
    getTodayLearningTasks(userId),
  ]);

  return {
    overview,
    continueLearning,
    todayTasks,
  };
}

export async function listLearningProgress(params: {
  userId: string;
  status?: LearningStatus;
  page?: number;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = admin
    .from("user_scene_progress")
    .select("*, scenes!inner(slug,title,translation)", { count: "exact" })
    .eq("user_id", params.userId)
    .order("last_viewed_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query;
  if (error) {
    throwLearningQueryError("list learning progress", error);
  }

  const rows = (data ?? []) as Array<
    UserSceneProgressRow & {
      scenes: Pick<SceneRow, "slug" | "title" | "translation">;
    }
  >;

  return {
    rows: rows.map((row) => ({
      progress: toProgressView(row),
      scene: {
        slug: row.scenes.slug,
        title: row.scenes.title,
        subtitle: row.scenes.translation,
      },
    })),
    total: count ?? 0,
    page,
    limit,
  };
}
