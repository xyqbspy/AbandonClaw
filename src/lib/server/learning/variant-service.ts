import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotFoundError } from "@/lib/server/errors";
import { getSceneRecordBySlug } from "@/lib/server/scene/service";
import { UserSceneVariantRunRow } from "@/lib/server/db/types";

import { startSceneLearning } from "./service";

const nowIso = () => new Date().toISOString();

async function createUserScopedVariantClient() {
  return createSupabaseServerClient();
}

const toSceneVariantSchemaErrorMessage = (context: string, originalMessage: string) =>
  `Scene variant schema is not up to date (${context}): ${originalMessage}. Run supabase/sql/20260325_phase18_scene_variant_runs_mvp.sql after phase17 learning migrations.`;

const throwVariantQueryError = (
  context: string,
  error: { message: string; code?: string | null },
) => {
  if (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.message.includes("user_scene_variant_runs")
  ) {
    throw new Error(toSceneVariantSchemaErrorMessage(context, error.message));
  }
  throw new Error(`Failed to ${context}: ${error.message}`);
};

export interface SceneVariantRunView {
  id: string;
  sceneId: string;
  sessionId: string | null;
  variantSetId: string;
  activeVariantId: string | null;
  viewedVariantIds: string[];
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

const toRunView = (row: UserSceneVariantRunRow): SceneVariantRunView => ({
  id: row.id,
  sceneId: row.scene_id,
  sessionId: row.session_id,
  variantSetId: row.variant_set_id,
  activeVariantId: row.active_variant_id,
  viewedVariantIds: row.viewed_variant_ids ?? [],
  status: row.status,
  startedAt: row.started_at,
  completedAt: row.completed_at,
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

async function getLatestActiveRunBySet(userId: string, sceneId: string, variantSetId: string) {
  const client = await createUserScopedVariantClient();
  const { data, error } = await client
    .from("user_scene_variant_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .eq("variant_set_id", variantSetId)
    .eq("status", "in_progress")
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<UserSceneVariantRunRow>();

  if (error) {
    throwVariantQueryError("read user_scene_variant_runs", error);
  }
  return data ?? null;
}

async function getLatestRunBySet(userId: string, sceneId: string, variantSetId: string) {
  const client = await createUserScopedVariantClient();
  const { data, error } = await client
    .from("user_scene_variant_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .eq("variant_set_id", variantSetId)
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<UserSceneVariantRunRow>();

  if (error) {
    throwVariantQueryError("read user_scene_variant_runs", error);
  }
  return data ?? null;
}

async function upsertVariantRun(
  patch: Partial<UserSceneVariantRunRow> & {
    user_id: string;
    scene_id: string;
    variant_set_id: string;
  },
) {
  const client = await createUserScopedVariantClient();
  const timestamp = nowIso();
  const next = {
    viewed_variant_ids: [],
    started_at: timestamp,
    last_active_at: timestamp,
    status: "in_progress" as const,
    ...patch,
  };

  const { data, error } = await client
    .from("user_scene_variant_runs")
    .upsert(next as never, { onConflict: "id" })
    .select("*")
    .single<UserSceneVariantRunRow>();

  if (error || !data) {
    throwVariantQueryError("upsert user_scene_variant_runs", {
      message: error?.message ?? "unknown error",
      code: error?.code,
    });
  }
  return data as UserSceneVariantRunRow;
}

export async function startSceneVariantRun(
  userId: string,
  sceneSlug: string,
  input: {
    variantSetId: string;
    activeVariantId?: string | null;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const learningState = await startSceneLearning(userId, sceneSlug);
  const existingRun = await getLatestActiveRunBySet(userId, scene.id, input.variantSetId);

  const row = await upsertVariantRun({
    id: existingRun?.id,
    user_id: userId,
    scene_id: scene.id,
    session_id: existingRun?.session_id ?? learningState.session?.id ?? null,
    variant_set_id: input.variantSetId,
    active_variant_id: input.activeVariantId ?? existingRun?.active_variant_id ?? null,
    viewed_variant_ids: existingRun?.viewed_variant_ids ?? [],
    status: existingRun?.status ?? "in_progress",
    started_at: existingRun?.started_at ?? nowIso(),
    completed_at: existingRun?.completed_at ?? null,
    last_active_at: nowIso(),
  });

  return {
    run: toRunView(row),
  };
}

export async function recordSceneVariantView(
  userId: string,
  sceneSlug: string,
  input: {
    variantSetId: string;
    variantId: string;
  },
) {
  const startResult = await startSceneVariantRun(userId, sceneSlug, {
    variantSetId: input.variantSetId,
    activeVariantId: input.variantId,
  });
  const run = startResult.run;
  const viewedVariantIds = Array.from(new Set([...run.viewedVariantIds, input.variantId]));

  const updated = await upsertVariantRun({
    id: run.id,
    user_id: userId,
    scene_id: run.sceneId,
    session_id: run.sessionId,
    variant_set_id: run.variantSetId,
    active_variant_id: input.variantId,
    viewed_variant_ids: viewedVariantIds,
    status: run.status,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    last_active_at: nowIso(),
  });

  return {
    run: toRunView(updated),
  };
}

export async function completeSceneVariantRun(
  userId: string,
  sceneSlug: string,
  input: {
    variantSetId: string;
  },
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const run = await getLatestActiveRunBySet(userId, scene.id, input.variantSetId);
  if (!run) {
    throw new Error("No active variant run found.");
  }

  const updated = await upsertVariantRun({
    id: run.id,
    user_id: userId,
    scene_id: run.scene_id,
    session_id: run.session_id,
    variant_set_id: run.variant_set_id,
    active_variant_id: run.active_variant_id,
    viewed_variant_ids: run.viewed_variant_ids,
    status: "completed",
    started_at: run.started_at,
    completed_at: nowIso(),
    last_active_at: nowIso(),
  });

  return {
    run: toRunView(updated),
  };
}

export async function getSceneVariantRunSnapshot(
  userId: string,
  sceneSlug: string,
  input: {
    variantSetId?: string | null;
  } = {},
) {
  const scene = await resolveVisibleSceneBySlug(userId, sceneSlug);
  const run = input.variantSetId
    ? await getLatestRunBySet(userId, scene.id, input.variantSetId)
    : null;

  return {
    run: run ? toRunView(run) : null,
  };
}
