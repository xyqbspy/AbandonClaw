import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ScenePracticeAssessmentLevel,
  ScenePracticeMode,
  UserScenePracticeAttemptRow,
  UserScenePracticeRunRow,
} from "@/lib/server/db/types";
import { getSceneRecordBySlug } from "@/lib/server/scene/service";
import { NotFoundError } from "@/lib/server/errors";
import { recordSceneTrainingEvent, startSceneLearning } from "./service";
import {
  assertScenePracticeSetBelongsToScene,
  markScenePracticeSetCompleted,
} from "./practice-set-service";

const nowIso = () => new Date().toISOString();

async function createUserScopedPracticeClient() {
  return createSupabaseServerClient();
}

const toScenePracticeSchemaErrorMessage = (context: string, originalMessage: string) =>
  `Scene practice schema is not up to date (${context}): ${originalMessage}. Run supabase/sql/20260324_phase17_scene_practice_runs_mvp.sql after phase16 learning migrations.`;

const throwPracticeQueryError = (
  context: string,
  error: { message: string; code?: string | null },
) => {
  if (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.message.includes("user_scene_practice_runs") ||
    error.message.includes("user_scene_practice_attempts")
  ) {
    throw new Error(toScenePracticeSchemaErrorMessage(context, error.message));
  }
  throw new Error(`Failed to ${context}: ${error.message}`);
};

export interface ScenePracticeRunView {
  id: string;
  sceneId: string;
  sessionId: string | null;
  practiceSetId: string;
  sourceType: "original" | "variant";
  sourceVariantId: string | null;
  status: "in_progress" | "completed" | "abandoned";
  currentMode: ScenePracticeMode;
  completedModes: ScenePracticeMode[];
  startedAt: string;
  completedAt: string | null;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

interface SceneLearningSnapshot {
  progress: {
    id: string;
    sceneId: string;
    status: "not_started" | "in_progress" | "completed" | "paused";
    progressPercent: number;
    masteryStage:
      | "listening"
      | "focus"
      | "sentence_practice"
      | "scene_practice"
      | "variant_unlocked"
      | "mastered";
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
  };
  session: {
    id: string;
    sceneId: string;
    currentStep:
      | "listen"
      | "focus_expression"
      | "practice_sentence"
      | "scene_practice"
      | "done";
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
  } | null;
}

export interface ScenePracticeAttemptView {
  id: string;
  runId: string;
  sceneId: string;
  sessionId: string | null;
  practiceSetId: string;
  mode: ScenePracticeMode;
  exerciseId: string;
  sentenceId: string | null;
  userAnswer: string;
  assessmentLevel: ScenePracticeAssessmentLevel;
  isCorrect: boolean;
  attemptIndex: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ScenePracticeSnapshotResponse {
  run: ScenePracticeRunView | null;
  latestAttempt: ScenePracticeAttemptView | null;
  summary: {
    completedModeCount: number;
    totalAttemptCount: number;
    correctAttemptCount: number;
    latestAssessmentLevel: ScenePracticeAssessmentLevel | null;
  };
}

type SentenceCompletionKeyInput = {
  sentenceId?: string | null;
  exerciseId: string;
};

export interface RepeatPracticeContinueView {
  sceneId: string;
  practiceSetId: string;
  sourceType: "original" | "variant";
  sourceVariantId: string | null;
  lastActiveAt: string;
}

const toRunView = (row: UserScenePracticeRunRow): ScenePracticeRunView => ({
  id: row.id,
  sceneId: row.scene_id,
  sessionId: row.session_id,
  practiceSetId: row.practice_set_id,
  sourceType: row.source_type,
  sourceVariantId: row.source_variant_id,
  status: row.status,
  currentMode: row.current_mode,
  completedModes: (row.completed_modes ?? []) as ScenePracticeMode[],
  startedAt: row.started_at,
  completedAt: row.completed_at,
  lastActiveAt: row.last_active_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toAttemptView = (row: UserScenePracticeAttemptRow): ScenePracticeAttemptView => ({
  id: row.id,
  runId: row.run_id,
  sceneId: row.scene_id,
  sessionId: row.session_id,
  practiceSetId: row.practice_set_id,
  mode: row.mode,
  exerciseId: row.exercise_id,
  sentenceId: row.sentence_id,
  userAnswer: row.user_answer,
  assessmentLevel: row.assessment_level,
  isCorrect: row.is_correct,
  attemptIndex: row.attempt_index,
  metadata:
    row.metadata_json && typeof row.metadata_json === "object" && !Array.isArray(row.metadata_json)
      ? (row.metadata_json as Record<string, unknown>)
      : null,
  createdAt: row.created_at,
});

async function resolveVisibleSceneBySlug(userId: string, sceneSlug: string) {
  const scene = await getSceneRecordBySlug({ slug: sceneSlug, userId });
  if (!scene) {
    throw new NotFoundError("Scene not found.");
  }
  return scene.row;
}

async function getLatestActiveRunBySet(userId: string, sceneId: string, practiceSetId: string) {
  const client = await createUserScopedPracticeClient();
  const { data, error } = await client
    .from("user_scene_practice_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .eq("practice_set_id", practiceSetId)
    .eq("status", "in_progress")
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<UserScenePracticeRunRow>();

  if (error) {
    throwPracticeQueryError("read user_scene_practice_runs", error);
  }
  return data ?? null;
}

async function getLatestRunBySet(userId: string, sceneId: string, practiceSetId?: string) {
  const client = await createUserScopedPracticeClient();
  let query = client
    .from("user_scene_practice_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (practiceSetId) {
    query = query.eq("practice_set_id", practiceSetId);
  }

  const { data, error } = await query.maybeSingle<UserScenePracticeRunRow>();
  if (error) {
    throwPracticeQueryError("read latest user_scene_practice_runs", error);
  }
  return data ?? null;
}

async function hasCompletedSentenceAttempt(
  userId: string,
  sceneId: string,
  input: SentenceCompletionKeyInput,
) {
  const client = await createUserScopedPracticeClient();
  let query = client
    .from("user_scene_practice_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .eq("assessment_level", "complete")
    .limit(1);

  if (input.sentenceId) {
    query = query.eq("sentence_id", input.sentenceId);
  } else {
    query = query.is("sentence_id", null).eq("exercise_id", input.exerciseId);
  }

  const { data, error } = await query.maybeSingle<{ id: string }>();
  if (error) {
    throwPracticeQueryError("read completed sentence attempt", error);
  }
  return Boolean(data?.id);
}

export async function getLatestRepeatPracticeRun(
  userId: string,
): Promise<RepeatPracticeContinueView | null> {
  const client = await createUserScopedPracticeClient();
  const { data, error } = await client
    .from("user_scene_practice_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<UserScenePracticeRunRow>();

  if (error) {
    throwPracticeQueryError("read repeat practice continue run", error);
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

async function upsertPracticeRun(
  patch: Partial<UserScenePracticeRunRow> & {
    user_id: string;
    scene_id: string;
    practice_set_id: string;
    source_type: "original" | "variant";
    current_mode: ScenePracticeMode;
  },
) {
  const client = await createUserScopedPracticeClient();
  const timestamp = nowIso();
  const next = {
    completed_modes: [],
    started_at: timestamp,
    last_active_at: timestamp,
    status: "in_progress" as const,
    ...patch,
  };

  const { data, error } = await client
    .from("user_scene_practice_runs")
    .upsert(next as never, { onConflict: "id" })
    .select("*")
    .single<UserScenePracticeRunRow>();

  if (error || !data) {
    throwPracticeQueryError("upsert user_scene_practice_runs", {
      message: error?.message ?? "unknown error",
      code: error?.code,
    });
  }
  return data as UserScenePracticeRunRow;
}

async function getNextAttemptIndex(runId: string, exerciseId: string) {
  const client = await createUserScopedPracticeClient();
  const { data, error } = await client
    .from("user_scene_practice_attempts")
    .select("attempt_index")
    .eq("run_id", runId)
    .eq("exercise_id", exerciseId)
    .order("attempt_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ attempt_index: number }>();

  if (error) {
    throwPracticeQueryError("read latest user_scene_practice_attempts", error);
  }
  return (data?.attempt_index ?? 0) + 1;
}

async function insertPracticeAttempt(
  row: Omit<UserScenePracticeAttemptRow, "id" | "created_at" | "attempt_index"> & {
    attempt_index: number;
  },
) {
  const client = await createUserScopedPracticeClient();
  const { data, error } = await client
    .from("user_scene_practice_attempts")
    .insert(row as never)
    .select("*")
    .single<UserScenePracticeAttemptRow>();

  if (error || !data) {
    throwPracticeQueryError("insert user_scene_practice_attempts", {
      message: error?.message ?? "unknown error",
      code: error?.code,
    });
  }
  return data as UserScenePracticeAttemptRow;
}

async function getAttemptSummaryByRun(runId: string) {
  const client = await createUserScopedPracticeClient();
  const { data, error } = await client
    .from("user_scene_practice_attempts")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .returns<UserScenePracticeAttemptRow[]>();

  if (error) {
    throwPracticeQueryError("read user_scene_practice_attempts summary", error);
  }

  const attempts = (data ?? []) as UserScenePracticeAttemptRow[];
  const latestAttempt = attempts[0] ?? null;
  return {
    latestAttempt,
    totalAttemptCount: attempts.length,
    correctAttemptCount: attempts.filter((attempt) => attempt.is_correct).length,
  };
}

export async function getScenePracticeSnapshot(
  userId: string,
  sceneSlug: string,
  input?: {
    practiceSetId?: string;
  },
): Promise<ScenePracticeSnapshotResponse> {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const run = await getLatestRunBySet(userId, scene.id, input?.practiceSetId);
  if (!run) {
    return {
      run: null,
      latestAttempt: null,
      summary: {
        completedModeCount: 0,
        totalAttemptCount: 0,
        correctAttemptCount: 0,
        latestAssessmentLevel: null,
      },
    };
  }

  const attemptSummary = await getAttemptSummaryByRun(run.id);
  return {
    run: toRunView(run),
    latestAttempt: attemptSummary.latestAttempt ? toAttemptView(attemptSummary.latestAttempt) : null,
    summary: {
      completedModeCount: (run.completed_modes ?? []).length,
      totalAttemptCount: attemptSummary.totalAttemptCount,
      correctAttemptCount: attemptSummary.correctAttemptCount,
      latestAssessmentLevel: attemptSummary.latestAttempt?.assessment_level ?? null,
    },
  };
}

export async function startScenePracticeRun(
  userId: string,
  sceneSlug: string,
  input: {
    practiceSetId: string;
    mode: ScenePracticeMode;
    sourceType: "original" | "variant";
    sourceVariantId?: string | null;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  await assertScenePracticeSetBelongsToScene({
    userId,
    sceneId: scene.id,
    practiceSetId: input.practiceSetId,
  });
  const learningState = await startSceneLearning(userId, sceneSlug);
  const nextLearningState =
    (learningState.session?.practicedSentenceCount ?? 0) >= 1
      ? learningState
      : await recordSceneTrainingEvent(userId, sceneSlug, {
          event: "practice_sentence",
        });
  const existingRun = await getLatestActiveRunBySet(userId, scene.id, input.practiceSetId);

  const row = await upsertPracticeRun({
    id: existingRun?.id,
    user_id: userId,
    scene_id: scene.id,
    session_id: existingRun?.session_id ?? learningState.session?.id ?? null,
    practice_set_id: input.practiceSetId,
    source_type: input.sourceType,
    source_variant_id: input.sourceVariantId ?? existingRun?.source_variant_id ?? null,
    status: existingRun?.status ?? "in_progress",
    current_mode: input.mode,
    completed_modes: existingRun?.completed_modes ?? [],
    started_at: existingRun?.started_at ?? nowIso(),
    last_active_at: nowIso(),
    completed_at: existingRun?.completed_at ?? null,
  });

  return {
    run: toRunView(row),
    learningState: nextLearningState as SceneLearningSnapshot,
  };
}

export async function recordScenePracticeAttempt(
  userId: string,
  sceneSlug: string,
  input: {
    practiceSetId: string;
    mode: ScenePracticeMode;
    sourceType: "original" | "variant";
    sourceVariantId?: string | null;
    exerciseId: string;
    sentenceId?: string | null;
    userAnswer: string;
    assessmentLevel: ScenePracticeAssessmentLevel;
    isCorrect: boolean;
    metadata?: Record<string, unknown>;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const alreadyCompletedSentence = await hasCompletedSentenceAttempt(userId, scene.id, {
    sentenceId: input.sentenceId,
    exerciseId: input.exerciseId,
  });
  const startResult = await startScenePracticeRun(userId, sceneSlug, {
    practiceSetId: input.practiceSetId,
    mode: input.mode,
    sourceType: input.sourceType,
    sourceVariantId: input.sourceVariantId,
  });
  const run = startResult.run;
  const attemptIndex = await getNextAttemptIndex(run.id, input.exerciseId);
  const attemptRow = await insertPracticeAttempt({
    run_id: run.id,
    user_id: userId,
    scene_id: run.sceneId,
    session_id: run.sessionId,
    practice_set_id: input.practiceSetId,
    mode: input.mode,
    exercise_id: input.exerciseId,
    sentence_id: input.sentenceId ?? null,
    user_answer: input.userAnswer,
    assessment_level: input.assessmentLevel,
    is_correct: input.isCorrect,
    attempt_index: attemptIndex,
    metadata_json: input.metadata ?? {},
  });

  const updatedRun = await upsertPracticeRun({
    id: run.id,
    user_id: userId,
    scene_id: run.sceneId,
    session_id: run.sessionId,
    practice_set_id: input.practiceSetId,
    source_type: input.sourceType,
    source_variant_id: input.sourceVariantId ?? run.sourceVariantId ?? null,
    current_mode: input.mode,
    completed_modes: run.completedModes,
    status: run.status,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    last_active_at: nowIso(),
  });

  const learningState =
    input.assessmentLevel === "complete" && !alreadyCompletedSentence
      ? await recordSceneTrainingEvent(userId, sceneSlug, {
          event: "sentence_completed",
        })
      : startResult.learningState;

  return {
    run: toRunView(updatedRun),
    attempt: toAttemptView(attemptRow),
    learningState: learningState as SceneLearningSnapshot,
  };
}

export async function markScenePracticeModeComplete(
  userId: string,
  sceneSlug: string,
  input: {
    practiceSetId: string;
    mode: ScenePracticeMode;
    nextMode?: ScenePracticeMode;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  await assertScenePracticeSetBelongsToScene({
    userId,
    sceneId: scene.id,
    practiceSetId: input.practiceSetId,
  });
  const run = await getLatestActiveRunBySet(userId, scene.id, input.practiceSetId);
  if (!run) {
    throw new Error("No active practice run found.");
  }

  const completedModes = Array.from(
    new Set([...(run.completed_modes ?? []), input.mode]),
  ) as ScenePracticeMode[];

  const updated = await upsertPracticeRun({
    id: run.id,
    user_id: userId,
    scene_id: scene.id,
    session_id: run.session_id,
    practice_set_id: run.practice_set_id,
    source_type: run.source_type,
    source_variant_id: run.source_variant_id,
    current_mode: input.nextMode ?? input.mode,
    completed_modes: completedModes,
    status: run.status,
    started_at: run.started_at,
    completed_at: run.completed_at,
    last_active_at: nowIso(),
  });

  return {
    run: toRunView(updated),
  };
}

export async function completeScenePracticeRun(
  userId: string,
  sceneSlug: string,
  input: {
    practiceSetId: string;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  await assertScenePracticeSetBelongsToScene({
    userId,
    sceneId: scene.id,
    practiceSetId: input.practiceSetId,
  });
  const run = await getLatestActiveRunBySet(userId, scene.id, input.practiceSetId);
  if (!run) {
    throw new Error("No active practice run found.");
  }

  const updated = await upsertPracticeRun({
    id: run.id,
    user_id: userId,
    scene_id: run.scene_id,
    session_id: run.session_id,
    practice_set_id: run.practice_set_id,
    source_type: run.source_type,
    source_variant_id: run.source_variant_id,
    current_mode: run.current_mode,
    completed_modes: run.completed_modes,
    status: "completed",
    started_at: run.started_at,
    completed_at: nowIso(),
    last_active_at: nowIso(),
  });
  await markScenePracticeSetCompleted({
    userId,
    sceneId: scene.id,
    practiceSetId: input.practiceSetId,
  });

  return {
    run: toRunView(updated),
  };
}
