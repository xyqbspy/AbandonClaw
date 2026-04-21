import { PracticeSet } from "@/lib/types/learning-flow";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserScenePracticeSetRow } from "@/lib/server/db/types";
import { ValidationError } from "@/lib/server/errors";
import { getSceneRecordBySlug } from "@/lib/server/scene/service";

const toScenePracticeSetSchemaErrorMessage = (context: string, originalMessage: string) =>
  `Scene practice set schema is not up to date (${context}): ${originalMessage}. Run supabase/sql/20260421_phase21_scene_practice_sets.sql after phase17 scene practice migrations.`;

const throwPracticeSetQueryError = (
  context: string,
  error: { message: string; code?: string | null },
): never => {
  if (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.message.includes("user_scene_practice_sets")
  ) {
    throw new Error(toScenePracticeSetSchemaErrorMessage(context, error.message));
  }
  throw new Error(`Failed to ${context}: ${error.message}`);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isScenePracticeSet = (value: unknown): value is PracticeSet => {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.sourceSceneId === "string" &&
    typeof value.sourceSceneTitle === "string" &&
    (value.sourceType === "original" || value.sourceType === "variant") &&
    (value.status === "generated" || value.status === "completed") &&
    Array.isArray(value.exercises)
  );
};

const toPracticeSet = (row: UserScenePracticeSetRow): PracticeSet => {
  if (!isScenePracticeSet(row.practice_set_json)) {
    throw new Error("Invalid scene practice set payload.");
  }
  return row.practice_set_json;
};

const createPracticeSetClient = () => createSupabaseServerClient();

export async function getLatestScenePracticeSet(userId: string, sceneSlug: string) {
  const scene = await getSceneRecordBySlug({ slug: sceneSlug, userId });
  if (!scene) {
    return { practiceSet: null };
  }

  const client = await createPracticeSetClient();
  const { data, error } = await client
    .from("user_scene_practice_sets")
    .select("*")
    .eq("user_id", userId)
    .eq("scene_id", scene.row.id)
    .eq("status", "generated")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<UserScenePracticeSetRow>();

  if (error) {
    throwPracticeSetQueryError("read latest user_scene_practice_sets", error);
  }

  return {
    practiceSet: data ? toPracticeSet(data) : null,
  };
}

const applyNullableSourceVariantFilter = <
  T extends {
    is: (column: string, value: null) => T;
    eq: (column: string, value: string) => T;
  },
>(
  query: T,
  sourceVariantId: string | null,
) => (sourceVariantId ? query.eq("source_variant_id", sourceVariantId) : query.is("source_variant_id", null));

async function abandonGeneratedPracticeSets(params: {
  userId: string;
  sceneId: string;
  sourceType: "original" | "variant";
  sourceVariantId: string | null;
  excludePracticeSetId?: string;
}) {
  const client = await createPracticeSetClient();
  let query = client
    .from("user_scene_practice_sets")
    .update({ status: "abandoned" })
    .eq("user_id", params.userId)
    .eq("scene_id", params.sceneId)
    .eq("source_type", params.sourceType)
    .eq("status", "generated");

  query = applyNullableSourceVariantFilter(query, params.sourceVariantId);
  if (params.excludePracticeSetId) {
    query = query.neq("id", params.excludePracticeSetId);
  }

  const { error } = await query;
  if (error) {
    throwPracticeSetQueryError("abandon old user_scene_practice_sets", error);
  }
}

export async function saveScenePracticeSet(
  userId: string,
  sceneSlug: string,
  input: {
    practiceSet: PracticeSet;
    replaceExisting?: boolean;
  },
) {
  const scene = await getSceneRecordBySlug({ slug: sceneSlug, userId });
  if (!scene) {
    throw new ValidationError("Scene not found for practice set.");
  }
  if (!isScenePracticeSet(input.practiceSet)) {
    throw new ValidationError("Practice set payload is invalid.");
  }
  if (input.practiceSet.sourceSceneId !== scene.row.id) {
    throw new ValidationError("Practice set does not belong to this scene.");
  }

  const sourceVariantId = input.practiceSet.sourceVariantId ?? null;
  if (input.replaceExisting) {
    await abandonGeneratedPracticeSets({
      userId,
      sceneId: scene.row.id,
      sourceType: input.practiceSet.sourceType,
      sourceVariantId,
      excludePracticeSetId: input.practiceSet.id,
    });
  }

  const client = await createPracticeSetClient();
  const { data, error } = await client
    .from("user_scene_practice_sets")
    .upsert({
      id: input.practiceSet.id,
      user_id: userId,
      scene_id: scene.row.id,
      source_type: input.practiceSet.sourceType,
      source_variant_id: sourceVariantId,
      status: input.practiceSet.status,
      generation_source: input.practiceSet.generationSource ?? "system",
      practice_set_json: input.practiceSet,
      completed_at: input.practiceSet.completedAt ?? null,
    } as never, { onConflict: "id" })
    .select("*")
    .single<UserScenePracticeSetRow>();

  if (error || !data) {
    throwPracticeSetQueryError("upsert user_scene_practice_sets", {
      message: error?.message ?? "unknown error",
      code: error?.code,
    });
  }

  return {
    practiceSet: toPracticeSet(data),
  };
}

export async function assertScenePracticeSetBelongsToScene(params: {
  userId: string;
  sceneId: string;
  practiceSetId: string;
}) {
  const client = await createPracticeSetClient();
  const { data, error } = await client
    .from("user_scene_practice_sets")
    .select("id")
    .eq("user_id", params.userId)
    .eq("scene_id", params.sceneId)
    .eq("id", params.practiceSetId)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throwPracticeSetQueryError("validate user_scene_practice_sets ownership", error);
  }
  if (!data?.id) {
    throw new ValidationError("Practice set does not belong to this scene.");
  }
}

export async function markScenePracticeSetCompleted(params: {
  userId: string;
  sceneId: string;
  practiceSetId: string;
}) {
  const client = await createPracticeSetClient();
  const completedAt = new Date().toISOString();
  const { data, error } = await client
    .from("user_scene_practice_sets")
    .update({
      status: "completed",
      completed_at: completedAt,
    })
    .eq("user_id", params.userId)
    .eq("scene_id", params.sceneId)
    .eq("id", params.practiceSetId)
    .select("*")
    .single<UserScenePracticeSetRow>();

  if (error || !data) {
    throwPracticeSetQueryError("complete user_scene_practice_sets", {
      message: error?.message ?? "unknown error",
      code: error?.code,
    });
  }

  return {
    practiceSet: toPracticeSet(data),
  };
}
