import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  LearningStatus,
  SceneMasteryStage,
  SceneRow,
  SceneTrainingStep,
  UserDailyLearningStatsRow,
  UserSceneProgressRow,
  UserSceneSessionRow,
} from "@/lib/server/db/types";
import { getSceneRecordBySlug } from "@/lib/server/scene/service";
import { getUserPhraseSummary } from "@/lib/server/phrases/service";
import { getReviewSummary } from "@/lib/server/review/service";
import { NotFoundError } from "@/lib/server/errors";

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const TRAINING_STEP_RANK: Record<SceneTrainingStep, number> = {
  listen: 1,
  focus_expression: 2,
  practice_sentence: 3,
  scene_practice: 4,
  done: 5,
};

const MASTERY_STAGE_RANK: Record<SceneMasteryStage, number> = {
  listening: 1,
  focus: 2,
  sentence_practice: 3,
  scene_practice: 4,
  variant_unlocked: 5,
  mastered: 6,
};

const MASTERY_STAGE_PERCENT: Record<SceneMasteryStage, number> = {
  listening: 20,
  focus: 35,
  sentence_practice: 60,
  scene_practice: 80,
  variant_unlocked: 85,
  mastered: 100,
};

const toLearningSchemaErrorMessage = (context: string, originalMessage: string) =>
  `Learning schema is not up to date (${context}): ${originalMessage}. Run supabase/sql/20260324_phase16_scene_training_station_mvp.sql and supabase/sql/20260331_phase19_sentence_completion_tracking.sql after earlier learning migrations.`;

const throwLearningQueryError = (
  context: string,
  error: { message: string; code?: string | null },
) => {
  if (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.message.includes("user_scene_progress.") ||
    error.message.includes("user_scene_sessions")
  ) {
    throw new Error(toLearningSchemaErrorMessage(context, error.message));
  }
  throw new Error(`Failed to ${context}: ${error.message}`);
};

export interface SceneProgressView {
  id: string;
  sceneId: string;
  status: LearningStatus;
  progressPercent: number;
  masteryStage: SceneMasteryStage;
  masteryPercent: number;
  focusedExpressionCount: number;
  practicedSentenceCount: number;
  completedSentenceCount: number;
  scenePracticeCount: number;
  variantUnlockedAt: string | null;
  lastSentenceIndex: number | null;
  lastVariantIndex: number | null;
  startedAt: string | null;
  lastViewedAt: string | null;
  completedAt: string | null;
  lastPracticedAt: string | null;
  totalStudySeconds: number;
  todayStudySeconds: number;
  savedPhraseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneSessionView {
  id: string;
  sceneId: string;
  currentStep: SceneTrainingStep;
  selectedBlockId: string | null;
  fullPlayCount: number;
  openedExpressionCount: number;
  practicedSentenceCount: number;
  completedSentenceCount: number;
  scenePracticeCompleted: boolean;
  isDone: boolean;
  startedAt: string;
  endedAt: string | null;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SceneLearningStateResponse {
  progress: SceneProgressView;
  session: SceneSessionView | null;
}

export interface ContinueLearningItem {
  sceneSlug: string;
  title: string;
  subtitle: string | null;
  progressPercent: number;
  masteryStage: SceneMasteryStage;
  masteryPercent: number;
  currentStep: SceneTrainingStep | null;
  lastViewedAt: string | null;
  lastSentenceIndex: number | null;
  estimatedMinutes: number | null;
  savedPhraseCount: number;
  completedSentenceCount: number;
  repeatMode?: "practice" | "variants" | null;
  isRepeat?: boolean;
}

export interface TodayLearningTasks {
  sceneTask: {
    done: boolean;
    continueSceneSlug: string | null;
    currentStep: SceneTrainingStep | null;
    masteryStage: SceneMasteryStage | null;
    progressPercent: number;
    completedSentenceCount: number;
  };
  reviewTask: {
    done: boolean;
    reviewItemsCompleted: number;
    dueReviewCount: number;
    confidentOutputCountToday: number;
    fullOutputCountToday: number;
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

export type SceneTrainingEvent =
  | "full_play"
  | "open_expression"
  | "practice_sentence"
  | "sentence_completed"
  | "scene_practice_complete";

const chooseHigherTrainingStep = (
  current: SceneTrainingStep | null | undefined,
  next: SceneTrainingStep,
) => {
  if (!current) return next;
  return TRAINING_STEP_RANK[current] >= TRAINING_STEP_RANK[next] ? current : next;
};

const chooseHigherMasteryStage = (
  current: SceneMasteryStage | null | undefined,
  next: SceneMasteryStage,
) => {
  if (!current) return next;
  return MASTERY_STAGE_RANK[current] >= MASTERY_STAGE_RANK[next] ? current : next;
};

const toProgressView = (row: UserSceneProgressRow): SceneProgressView => ({
  id: row.id,
  sceneId: row.scene_id,
  status: row.status,
  progressPercent: Number(row.progress_percent ?? 0),
  masteryStage: row.mastery_stage ?? "listening",
  masteryPercent: Number(row.mastery_percent ?? 0),
  focusedExpressionCount: row.focused_expression_count ?? 0,
  practicedSentenceCount: row.practiced_sentence_count ?? 0,
  completedSentenceCount: row.completed_sentence_count ?? 0,
  scenePracticeCount: row.scene_practice_count ?? 0,
  variantUnlockedAt: row.variant_unlocked_at,
  lastSentenceIndex: row.last_sentence_index,
  lastVariantIndex: row.last_variant_index,
  startedAt: row.started_at,
  lastViewedAt: row.last_viewed_at,
  completedAt: row.completed_at,
  lastPracticedAt: row.last_practiced_at,
  totalStudySeconds: row.total_study_seconds,
  todayStudySeconds: row.today_study_seconds,
  savedPhraseCount: row.saved_phrase_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSessionView = (row: UserSceneSessionRow): SceneSessionView => ({
  id: row.id,
  sceneId: row.scene_id,
  currentStep: row.current_step,
  selectedBlockId: row.selected_block_id,
  fullPlayCount: row.full_play_count,
  openedExpressionCount: row.opened_expression_count,
  practicedSentenceCount: row.practiced_sentence_count,
  completedSentenceCount: row.completed_sentence_count ?? 0,
  scenePracticeCompleted: row.scene_practice_completed,
  isDone: row.is_done,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  lastActiveAt: row.last_active_at,
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
    throwLearningQueryError("read user_scene_progress", error);
  }
  return data ?? null;
}

async function getLatestSessionByUserAndScene(userId: string, sceneId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_scene_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<UserSceneSessionRow>();
  if (error) {
    throwLearningQueryError("read user_scene_sessions", error);
  }
  return data ?? null;
}

async function countCompletedSentencesByUserAndScene(userId: string, sceneId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_scene_practice_attempts")
    .select("sentence_id,exercise_id,assessment_level")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .eq("assessment_level", "complete")
    .returns<
      Array<{
        sentence_id: string | null;
        exercise_id: string;
        assessment_level: "complete";
      }>
    >();

  if (error) {
    throwLearningQueryError("read completed sentence attempts", error);
  }

  const completedSentenceKeys = new Set(
    (data ?? []).map((row) => row.sentence_id ?? row.exercise_id),
  );
  return completedSentenceKeys.size;
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
    mastery_stage: existing?.mastery_stage ?? "listening",
    mastery_percent: existing?.mastery_percent ?? 0,
    last_sentence_index: existing?.last_sentence_index ?? null,
    last_variant_index: existing?.last_variant_index ?? null,
    started_at: existing?.started_at ?? null,
    last_viewed_at: existing?.last_viewed_at ?? null,
    completed_at: existing?.completed_at ?? null,
    variant_unlocked_at: existing?.variant_unlocked_at ?? null,
    last_practiced_at: existing?.last_practiced_at ?? null,
    total_study_seconds: existing?.total_study_seconds ?? 0,
    today_study_seconds: existing?.today_study_seconds ?? 0,
    saved_phrase_count: existing?.saved_phrase_count ?? 0,
    focused_expression_count: existing?.focused_expression_count ?? 0,
    practiced_sentence_count: existing?.practiced_sentence_count ?? 0,
    completed_sentence_count: existing?.completed_sentence_count ?? 0,
    scene_practice_count: existing?.scene_practice_count ?? 0,
    ...patch,
  };

  const { data, error } = await admin
    .from("user_scene_progress")
    .upsert(next as never, { onConflict: "user_id,scene_id" })
    .select("*")
    .single<UserSceneProgressRow>();

  if (error || !data) {
    throwLearningQueryError("upsert user_scene_progress", {
      message: error?.message ?? "unknown error",
      code: error?.code,
    });
  }
  return { existing, row: data as UserSceneProgressRow };
}

async function upsertSession(
  userId: string,
  sceneId: string,
  patch: Partial<UserSceneSessionRow>,
  existing?: UserSceneSessionRow | null,
) {
  const admin = createSupabaseAdminClient();
  const current = existing ?? (await getLatestSessionByUserAndScene(userId, sceneId));
  const timestamp = nowIso();
  const next = {
    id: current?.id,
    user_id: userId,
    scene_id: sceneId,
    current_step: current?.current_step ?? "listen",
    selected_block_id: current?.selected_block_id ?? null,
    full_play_count: current?.full_play_count ?? 0,
    opened_expression_count: current?.opened_expression_count ?? 0,
    practiced_sentence_count: current?.practiced_sentence_count ?? 0,
    completed_sentence_count: current?.completed_sentence_count ?? 0,
    scene_practice_completed: current?.scene_practice_completed ?? false,
    is_done: current?.is_done ?? false,
    started_at: current?.started_at ?? timestamp,
    ended_at: current?.ended_at ?? null,
    last_active_at: current?.last_active_at ?? timestamp,
    ...patch,
  };

  const { data, error } = await admin
    .from("user_scene_sessions")
    .upsert(next as never, { onConflict: "id" })
    .select("*")
    .single<UserSceneSessionRow>();

  if (error || !data) {
    throwLearningQueryError("upsert user_scene_sessions", {
      message: error?.message ?? "unknown error",
      code: error?.code,
    });
  }
  return data as UserSceneSessionRow;
}

async function ensureActiveSceneSession(userId: string, sceneId: string) {
  const latestSession = await getLatestSessionByUserAndScene(userId, sceneId);
  if (latestSession && !latestSession.is_done) {
    return upsertSession(
      userId,
      sceneId,
      {
        last_active_at: nowIso(),
      },
      latestSession,
    );
  }
  return upsertSession(userId, sceneId, {
    current_step: "listen",
    selected_block_id: null,
    full_play_count: 0,
    opened_expression_count: 0,
    practiced_sentence_count: 0,
    completed_sentence_count: 0,
    scene_practice_completed: false,
    is_done: false,
    started_at: nowIso(),
    ended_at: null,
    last_active_at: nowIso(),
  });
}

export const evaluateSceneSessionDone = (session: Pick<
  UserSceneSessionRow,
  | "full_play_count"
  | "opened_expression_count"
  | "completed_sentence_count"
  | "scene_practice_completed"
>) =>
  session.full_play_count >= 1 &&
  session.opened_expression_count >= 1 &&
  session.completed_sentence_count >= 1 &&
  Boolean(session.scene_practice_completed);

function buildTrainingStagePatch(
  current: UserSceneProgressRow | null,
  nextStage: SceneMasteryStage,
) {
  const stage = chooseHigherMasteryStage(current?.mastery_stage, nextStage);
  const rawPercent = MASTERY_STAGE_PERCENT[stage];
  const cappedPercent = stage === "mastered" ? 100 : Math.min(rawPercent, 85);
  const nextPercent = Math.max(Number(current?.mastery_percent ?? 0), cappedPercent);
  return {
    mastery_stage: stage,
    mastery_percent: nextPercent,
    progress_percent: nextPercent,
  };
}

const parseEstimatedMinutesFromSceneJson = (scene: SceneRow) => {
  const json = scene.scene_json as { estimatedMinutes?: unknown };
  return typeof json?.estimatedMinutes === "number" ? json.estimatedMinutes : null;
};

const toContinueItem = (
  scene: Pick<SceneRow, "slug" | "title" | "translation" | "scene_json">,
  progress: UserSceneProgressRow,
  session: UserSceneSessionRow | null,
): ContinueLearningItem => ({
  sceneSlug: scene.slug,
  title: scene.title,
  subtitle: scene.translation,
  progressPercent: Number(progress.progress_percent ?? 0),
  masteryStage: progress.mastery_stage ?? "listening",
  masteryPercent: Number(progress.mastery_percent ?? 0),
  currentStep: session?.current_step ?? null,
  lastViewedAt: progress.last_viewed_at,
  lastSentenceIndex: progress.last_sentence_index,
  estimatedMinutes: parseEstimatedMinutesFromSceneJson(scene as SceneRow),
  savedPhraseCount: progress.saved_phrase_count ?? 0,
  completedSentenceCount: session?.completed_sentence_count ?? progress.completed_sentence_count ?? 0,
  repeatMode: null,
  isRepeat: false,
});

async function getLatestRepeatPracticeRun(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_scene_practice_runs")
    .select("scene_id,practice_set_id,source_type,source_variant_id,last_active_at")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<{
      scene_id: string;
      practice_set_id: string;
      source_type: "original" | "variant";
      source_variant_id: string | null;
      last_active_at: string;
    }>();

  if (error) {
    throwLearningQueryError("read repeat practice continue run", error);
  }
  if (!data) return null;

  return {
    sceneId: data.scene_id,
    practiceSetId: data.practice_set_id,
    sourceType: data.source_type,
    sourceVariantId: data.source_variant_id,
    lastActiveAt: data.last_active_at,
  };
}

async function getLatestRepeatVariantRun(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_scene_variant_runs")
    .select("scene_id,variant_set_id,active_variant_id,last_active_at")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<{
      scene_id: string;
      variant_set_id: string;
      active_variant_id: string | null;
      last_active_at: string;
    }>();

  if (error) {
    throwLearningQueryError("read repeat variant continue run", error);
  }
  if (!data) return null;

  return {
    sceneId: data.scene_id,
    variantSetId: data.variant_set_id,
    activeVariantId: data.active_variant_id,
    lastActiveAt: data.last_active_at,
  };
}

const toRepeatPracticeContinueItem = (params: {
  scene: Pick<SceneRow, "slug" | "title" | "translation" | "scene_json">;
  progress: UserSceneProgressRow | null;
  run: {
    lastActiveAt: string;
  };
}): ContinueLearningItem => ({
  sceneSlug: params.scene.slug,
  title: params.scene.title,
  subtitle: params.scene.translation,
  progressPercent: 100,
  masteryStage: "mastered",
  masteryPercent: 100,
  currentStep: "scene_practice",
  lastViewedAt: params.run.lastActiveAt,
  lastSentenceIndex: params.progress?.last_sentence_index ?? null,
  estimatedMinutes: parseEstimatedMinutesFromSceneJson(params.scene as SceneRow),
  savedPhraseCount: params.progress?.saved_phrase_count ?? 0,
  completedSentenceCount: params.progress?.completed_sentence_count ?? 0,
  repeatMode: "practice",
  isRepeat: true,
});

const toRepeatVariantContinueItem = (params: {
  scene: Pick<SceneRow, "slug" | "title" | "translation" | "scene_json">;
  progress: UserSceneProgressRow | null;
  run: {
    lastActiveAt: string;
  };
}): ContinueLearningItem => ({
  sceneSlug: params.scene.slug,
  title: params.scene.title,
  subtitle: params.scene.translation,
  progressPercent: 100,
  masteryStage: "mastered",
  masteryPercent: 100,
  currentStep: "done",
  lastViewedAt: params.run.lastActiveAt,
  lastSentenceIndex: params.progress?.last_sentence_index ?? null,
  estimatedMinutes: parseEstimatedMinutesFromSceneJson(params.scene as SceneRow),
  savedPhraseCount: params.progress?.saved_phrase_count ?? 0,
  completedSentenceCount: params.progress?.completed_sentence_count ?? 0,
  repeatMode: "variants",
  isRepeat: true,
});

const pickMostRecentContinueScene = (
  items: Array<ContinueLearningItem | null>,
) =>
  items
    .filter((item): item is ContinueLearningItem => item !== null)
    .sort(
      (left, right) =>
        new Date(right.lastViewedAt ?? 0).getTime() - new Date(left.lastViewedAt ?? 0).getTime(),
    )[0] ?? null;

export async function startSceneLearning(userId: string, sceneSlug: string) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const timestamp = nowIso();
  const current = await getProgressByUserAndScene(userId, scene.id);

  let nextStatus: LearningStatus = current?.status ?? "in_progress";
  if (!current || current.status === "not_started" || current.status === "paused") {
    nextStatus = "in_progress";
  }

  const { row, existing } = await upsertProgress(userId, scene.id, {
    status: nextStatus,
    started_at: current?.started_at ?? timestamp,
    last_viewed_at: timestamp,
    ...buildTrainingStagePatch(current, current?.mastery_stage ?? "listening"),
  });
  const session = await ensureActiveSceneSession(userId, scene.id);
  const completedSentenceCount = await countCompletedSentencesByUserAndScene(userId, scene.id);

  const hydratedProgress =
    completedSentenceCount > (row.completed_sentence_count ?? 0)
      ? await upsertProgress(userId, scene.id, {
          completed_sentence_count: completedSentenceCount,
        }).then((result) => result.row)
      : row;
  const hydratedSession =
    completedSentenceCount > (session.completed_sentence_count ?? 0)
      ? await upsertSession(
          userId,
          scene.id,
          {
            completed_sentence_count: completedSentenceCount,
            current_step:
              completedSentenceCount >= 1 && session.current_step === "practice_sentence"
                ? "scene_practice"
                : session.current_step,
          },
          session,
        )
      : session;

  if (!existing || !existing.started_at) {
    await upsertDailyStats({ userId, scenesStartedDelta: 1 });
  }

  return {
    scene,
    progress: toProgressView(hydratedProgress),
    session: toSessionView(hydratedSession),
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
  const session = await ensureActiveSceneSession(userId, scene.id);
  const timestamp = nowIso();
  const studyDelta = Math.max(0, Math.floor(input.studySecondsDelta ?? 0));
  const phraseDelta = Math.max(0, Math.floor(input.savedPhraseDelta ?? 0));

  const nextProgressPercent = clamp(
    input.progressPercent ?? Number(current?.progress_percent ?? 0),
    0,
    100,
  );
  const oldProgressPercent = Number(current?.progress_percent ?? 0);
  const monotonicProgressPercent = Math.max(oldProgressPercent, nextProgressPercent);

  const nextStatus: LearningStatus =
    current?.status === "completed" ? "completed" : "in_progress";

  const { row } = await upsertProgress(userId, scene.id, {
    status: nextStatus,
    progress_percent: nextStatus === "completed" ? Math.max(monotonicProgressPercent, Number(current?.mastery_percent ?? 0)) : monotonicProgressPercent,
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

  const nextSession = await upsertSession(
    userId,
    scene.id,
    {
      last_active_at: timestamp,
    },
    session,
  );

  return {
    scene,
    progress: toProgressView(row),
    session: toSessionView(nextSession),
  };
}

export async function recordSceneTrainingEvent(
  userId: string,
  sceneSlug: string,
  input: {
    event: SceneTrainingEvent;
    selectedBlockId?: string;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const currentProgress = await getProgressByUserAndScene(userId, scene.id);
  const activeSession = await ensureActiveSceneSession(userId, scene.id);
  const timestamp = nowIso();

  let sessionPatch: Partial<UserSceneSessionRow> = {
    last_active_at: timestamp,
  };
  let progressPatch: Partial<UserSceneProgressRow> = {
    last_viewed_at: timestamp,
    last_practiced_at: timestamp,
  };

  if (input.event === "full_play") {
    sessionPatch = {
      ...sessionPatch,
      full_play_count: (activeSession.full_play_count ?? 0) + 1,
      current_step: chooseHigherTrainingStep(activeSession.current_step, "listen"),
    };
    progressPatch = {
      ...progressPatch,
      ...buildTrainingStagePatch(currentProgress, "listening"),
    };
  }

  if (input.event === "open_expression") {
    sessionPatch = {
      ...sessionPatch,
      opened_expression_count: (activeSession.opened_expression_count ?? 0) + 1,
      current_step: chooseHigherTrainingStep(activeSession.current_step, "focus_expression"),
      selected_block_id: input.selectedBlockId ?? activeSession.selected_block_id ?? null,
    };
    progressPatch = {
      ...progressPatch,
      focused_expression_count: (currentProgress?.focused_expression_count ?? 0) + 1,
      ...buildTrainingStagePatch(currentProgress, "focus"),
    };
  }

  if (input.event === "practice_sentence") {
    sessionPatch = {
      ...sessionPatch,
      practiced_sentence_count: (activeSession.practiced_sentence_count ?? 0) + 1,
      current_step: chooseHigherTrainingStep(activeSession.current_step, "practice_sentence"),
    };
    progressPatch = {
      ...progressPatch,
      practiced_sentence_count: (currentProgress?.practiced_sentence_count ?? 0) + 1,
      ...buildTrainingStagePatch(currentProgress, "sentence_practice"),
    };
  }

  if (input.event === "sentence_completed") {
    sessionPatch = {
      ...sessionPatch,
      completed_sentence_count: (activeSession.completed_sentence_count ?? 0) + 1,
      current_step: chooseHigherTrainingStep(activeSession.current_step, "scene_practice"),
    };
    progressPatch = {
      ...progressPatch,
      completed_sentence_count: (currentProgress?.completed_sentence_count ?? 0) + 1,
      ...buildTrainingStagePatch(currentProgress, "sentence_practice"),
    };
  }

  if (input.event === "scene_practice_complete") {
    sessionPatch = {
      ...sessionPatch,
      scene_practice_completed: true,
      current_step: chooseHigherTrainingStep(activeSession.current_step, "scene_practice"),
    };
    progressPatch = {
      ...progressPatch,
      scene_practice_count: (currentProgress?.scene_practice_count ?? 0) + 1,
      ...buildTrainingStagePatch(currentProgress, "scene_practice"),
    };
  }

  const nextSessionDraft = {
    ...activeSession,
    ...sessionPatch,
  } as UserSceneSessionRow;

  if (input.event === "scene_practice_complete" && (nextSessionDraft.completed_sentence_count ?? 0) < 1) {
    const completedSentenceCount = await countCompletedSentencesByUserAndScene(userId, scene.id);
    if (completedSentenceCount > 0) {
      nextSessionDraft.completed_sentence_count = completedSentenceCount;
      sessionPatch = {
        ...sessionPatch,
        completed_sentence_count: Math.max(
          sessionPatch.completed_sentence_count ?? 0,
          completedSentenceCount,
        ),
      };
      progressPatch = {
        ...progressPatch,
        completed_sentence_count: Math.max(
          currentProgress?.completed_sentence_count ?? 0,
          completedSentenceCount,
        ),
      };
    }
  }

  const sessionDone = evaluateSceneSessionDone(nextSessionDraft);
  if (sessionDone) {
    sessionPatch = {
      ...sessionPatch,
      is_done: true,
      current_step: "done",
      ended_at: timestamp,
    };
    progressPatch = {
      ...progressPatch,
      status: "completed",
      completed_at: currentProgress?.completed_at ?? timestamp,
      variant_unlocked_at: currentProgress?.variant_unlocked_at ?? timestamp,
      ...buildTrainingStagePatch(currentProgress, "variant_unlocked"),
    };
  } else if ((currentProgress?.status ?? "not_started") !== "completed") {
    progressPatch.status = "in_progress";
  }

  const nextSession = await upsertSession(userId, scene.id, sessionPatch, activeSession);
  const { existing, row } = await upsertProgress(userId, scene.id, progressPatch);

  if (sessionDone && existing?.status !== "completed") {
    await upsertDailyStats({ userId, scenesCompletedDelta: 1 });
  }

  return {
    scene,
    progress: toProgressView(row),
    session: toSessionView(nextSession),
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

  const trainingState = await recordSceneTrainingEvent(userId, sceneSlug, {
    event: "scene_practice_complete",
  });

  const { row } = await upsertProgress(userId, scene.id, {
    total_study_seconds: (current?.total_study_seconds ?? 0) + studyDelta,
    today_study_seconds: (current?.today_study_seconds ?? 0) + studyDelta,
    saved_phrase_count: (current?.saved_phrase_count ?? 0) + phraseDelta,
    last_viewed_at: timestamp,
    last_practiced_at: timestamp,
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
    session: trainingState.session,
  };
}

export async function pauseSceneLearning(userId: string, sceneSlug: string) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const current = await getProgressByUserAndScene(userId, scene.id);
  if (!current) {
    return startSceneLearning(userId, sceneSlug);
  }

  const session = await getLatestSessionByUserAndScene(userId, scene.id);
  const { row } = await upsertProgress(userId, scene.id, {
    status: current.status === "in_progress" ? "paused" : current.status,
    last_viewed_at: nowIso(),
  });

  const nextSession = session
    ? await upsertSession(
        userId,
        scene.id,
        {
          last_active_at: nowIso(),
        },
        session,
      )
    : null;

  return {
    scene,
    progress: toProgressView(row),
    session: nextSession ? toSessionView(nextSession) : null,
  };
}

export async function getContinueLearningScene(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_scene_progress")
    .select("*, scenes!inner(id,slug,title,translation,scene_json)")
    .eq("user_id", userId)
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
  const targetRow =
    rows.find((row) => row.status === "in_progress") ??
    rows.find((row) => row.status === "paused") ??
    null;
  if (!targetRow) return null;

  const latestSession = await getLatestSessionByUserAndScene(userId, targetRow.scene_id);
  const completedSentenceCount = await countCompletedSentencesByUserAndScene(userId, targetRow.scene_id);
  const resolvedSession = latestSession
    ? ({
        ...latestSession,
        completed_sentence_count: Math.max(
          latestSession.completed_sentence_count ?? 0,
          completedSentenceCount,
        ),
        current_step:
          completedSentenceCount >= 1 && latestSession.current_step === "practice_sentence"
            ? "scene_practice"
            : latestSession.current_step,
      } satisfies UserSceneSessionRow)
    : null;
  const resolvedProgress = {
    ...targetRow,
    completed_sentence_count: Math.max(
      targetRow.completed_sentence_count ?? 0,
      completedSentenceCount,
    ),
  } satisfies UserSceneProgressRow;
  return toContinueItem(targetRow.scenes, resolvedProgress, resolvedSession);
}

async function getRepeatPracticeContinueScene(userId: string) {
  const repeatRun = await getLatestRepeatPracticeRun(userId);
  if (!repeatRun) return null;

  const admin = createSupabaseAdminClient();
  const [sceneRes, progressRes] = await Promise.all([
    admin
      .from("scenes")
      .select("id,slug,title,translation,scene_json")
      .eq("id", repeatRun.sceneId)
      .maybeSingle<Pick<SceneRow, "id" | "slug" | "title" | "translation" | "scene_json">>(),
    admin
      .from("user_scene_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("scene_id", repeatRun.sceneId)
      .maybeSingle<UserSceneProgressRow>(),
  ]);

  if (sceneRes.error) {
    throwLearningQueryError("read repeat practice scene", sceneRes.error);
  }
  if (progressRes.error) {
    throwLearningQueryError("read repeat practice progress", progressRes.error);
  }
  if (!sceneRes.data) return null;

  return toRepeatPracticeContinueItem({
    scene: sceneRes.data,
    progress: progressRes.data ?? null,
    run: repeatRun,
  });
}

async function getRepeatVariantContinueScene(userId: string) {
  const repeatRun = await getLatestRepeatVariantRun(userId);
  if (!repeatRun) return null;

  const admin = createSupabaseAdminClient();
  const [sceneRes, progressRes] = await Promise.all([
    admin
      .from("scenes")
      .select("id,slug,title,translation,scene_json")
      .eq("id", repeatRun.sceneId)
      .maybeSingle<Pick<SceneRow, "id" | "slug" | "title" | "translation" | "scene_json">>(),
    admin
      .from("user_scene_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("scene_id", repeatRun.sceneId)
      .maybeSingle<UserSceneProgressRow>(),
  ]);

  if (sceneRes.error) {
    throwLearningQueryError("read repeat variant scene", sceneRes.error);
  }
  if (progressRes.error) {
    throwLearningQueryError("read repeat variant progress", progressRes.error);
  }
  if (!sceneRes.data) return null;

  return toRepeatVariantContinueItem({
    scene: sceneRes.data,
    progress: progressRes.data ?? null,
    run: repeatRun,
  });
}

export async function getTodayLearningTasks(userId: string): Promise<TodayLearningTasks> {
  const admin = createSupabaseAdminClient();
  const [directContinueScene, repeatPracticeContinue, repeatVariantContinue] = await Promise.all([
    getContinueLearningScene(userId),
    getRepeatPracticeContinueScene(userId),
    getRepeatVariantContinueScene(userId),
  ]);
  const continueScene = pickMostRecentContinueScene([
    directContinueScene,
    repeatVariantContinue,
    repeatPracticeContinue,
  ]);
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
      done: continueScene?.isRepeat ? false : scenesCompleted > 0,
      continueSceneSlug: continueScene?.sceneSlug ?? null,
      currentStep: continueScene?.currentStep ?? null,
      masteryStage: continueScene?.masteryStage ?? null,
      progressPercent: continueScene?.progressPercent ?? 0,
      completedSentenceCount: continueScene?.completedSentenceCount ?? 0,
    },
    reviewTask: {
      done: reviewSummary.dueReviewCount === 0 || reviewItemsCompleted > 0,
      reviewItemsCompleted,
      dueReviewCount: reviewSummary.dueReviewCount,
      confidentOutputCountToday: reviewSummary.confidentOutputCountToday,
      fullOutputCountToday: reviewSummary.fullOutputCountToday,
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
  const [overview, continueLearning, repeatPracticeContinue, repeatVariantContinue, todayTasks] =
    await Promise.all([
    getLearningOverview(userId),
    getContinueLearningScene(userId),
    getRepeatPracticeContinueScene(userId),
    getRepeatVariantContinueScene(userId),
    getTodayLearningTasks(userId),
    ]);

  return {
    overview,
    continueLearning: pickMostRecentContinueScene([
      continueLearning,
      repeatVariantContinue,
      repeatPracticeContinue,
    ]),
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
