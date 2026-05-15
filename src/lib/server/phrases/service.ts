import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureExpressionClusterForPhrase } from "@/lib/server/expression-clusters/service";
import {
  resolveDeleteExpressionClusterResult,
  resolveSavedPhraseReviewState,
} from "@/lib/server/phrases/logic";
import {
  completeUserPhraseAiEnrichment,
  ensureSharedPhraseEntity,
  failUserPhraseAiEnrichment,
  getUserPhraseForAiEnrichment,
  markUserPhraseAiEnrichmentPending,
  updateSharedPhraseLearningInfo,
} from "@/lib/server/phrases/admin-repo";
import {
  PhraseRow,
  UserPhraseAiEnrichmentStatus,
  UserExpressionClusterRow,
  UserPhraseRelationRow,
  UserPhraseRelationType,
  UserDailyLearningStatsRow,
  UserPhraseRow,
  UserPhraseReviewStatus,
  UserSceneProgressRow,
} from "@/lib/server/db/types";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { ValidationError } from "@/lib/server/errors";
import { getSceneRecordBySlug } from "@/lib/server/scene/service";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import { extractJsonCandidate } from "@/lib/server/scene-json";
import {
  SIMILAR_EXPRESSION_ENRICH_SYSTEM_PROMPT,
  buildSimilarExpressionEnrichUserPrompt,
} from "@/lib/server/prompts/similar-expression-enrich-prompt";

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);

async function createUserScopedPhraseClient() {
  return createSupabaseServerClient();
}

export interface SavePhraseInput {
  text?: string;
  learningItemType?: "expression" | "sentence";
  sentenceText?: string;
  translation?: string;
  usageNote?: string;
  difficulty?: string;
  tags?: string[];
  sourceSceneSlug?: string;
  sourceType?: "scene" | "manual";
  sourceNote?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
  expressionClusterId?: string;
  relationSourceUserPhraseId?: string;
  relationType?: UserPhraseRelationType;
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
  sourceType: "scene" | "manual";
  sourceNote: string | null;
  sourceSentenceIndex: number | null;
  sourceSentenceText: string | null;
  sourceChunkText: string | null;
  expressionClusterId: string | null;
  expressionClusterRole: "main" | "variant" | null;
  expressionClusterMainUserPhraseId: string | null;
  aiEnrichmentStatus: UserPhraseAiEnrichmentStatus | null;
  semanticFocus: string | null;
  typicalScenario: string | null;
  exampleSentences: Array<{ en: string; zh: string }>;
  aiEnrichmentError: string | null;
  learningItemType: "expression" | "sentence";
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

export interface UserSavedPhraseRelationItem {
  sourceUserPhraseId: string;
  relationType: UserPhraseRelationType;
  item: UserSavedPhraseItem;
}

export interface DeleteUserPhraseResult {
  deletedUserPhraseId: string;
  deletedClusterId: string | null;
  clusterDeleted: boolean;
  nextMainUserPhraseId: string | null;
  nextFocusUserPhraseId: string | null;
}

interface ExpressionClusterContext {
  clusterId: string;
  role: "main" | "variant";
  mainUserPhraseId: string | null;
}

const parseOptionalTrimmed = (value: unknown, maxLength = 500) => {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const hasChinese = (value: string | null | undefined) =>
  Boolean(value && /[\u4e00-\u9fff]/.test(value));

const toChineseUsageNoteFallback = (expression: string, translation: string | null) => {
  const zh = parseOptionalTrimmed(translation, 200);
  if (zh) {
    return `常用于表达“${zh}”这个意思，语气自然，适合日常口语场景。`;
  }
  return `常用于日常表达，语气自然。可以先用一句简单句练习：${expression}.`;
};

const toChineseSemanticFocusFallback = (
  semanticFocus: string | null,
  differenceLabel: string | null,
) => {
  const raw = parseOptionalTrimmed(semanticFocus, 40);
  if (raw && hasChinese(raw)) return raw;
  const diff = parseOptionalTrimmed(differenceLabel, 40);
  if (diff && hasChinese(diff)) return diff;
  return "相关说法";
};

const toChineseTypicalScenarioFallback = (typicalScenario: string | null) => {
  const raw = parseOptionalTrimmed(typicalScenario, 80);
  if (raw && hasChinese(raw)) return raw;
  return "日常沟通场景";
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

const parseExampleSentences = (value: unknown) => {
  if (!Array.isArray(value)) return [] as Array<{ en: string; zh: string }>;
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      en: parseOptionalTrimmed(item.en, 500) ?? "",
      zh: parseOptionalTrimmed(item.zh, 200) ?? "",
    }))
    .filter((item) => item.en && item.zh)
    .slice(0, 2);
};

const parseWithDiagnostics = (rawText: string) => {
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    const jsonCandidate = extractJsonCandidate(rawText);
    if (!jsonCandidate) {
      throw new Error("Model output is not valid JSON.");
    }
    return JSON.parse(jsonCandidate) as unknown;
  }
};

const isContrastSourceNote = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "manual-contrast-ai" || normalized === "focus-contrast-ai";
};

const isSimilarSourceNote = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return (
    normalized === "manual-similar-ai" ||
    normalized === "focus-similar-ai" ||
    normalized === "similar-ai-mvp"
  );
};

const getOppositeRelationType = (relationType: UserPhraseRelationType): UserPhraseRelationType =>
  relationType === "similar" ? "contrast" : "similar";

const isUuidLike = (value: string | null | undefined) =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const inferLearningItemType = (row: Pick<
  UserPhraseRow,
  "learning_item_type" | "source_sentence_text" | "source_chunk_text"
>): "expression" | "sentence" => {
  if (row.learning_item_type === "sentence") return "sentence";
  const hasSentenceText = Boolean(row.source_sentence_text?.trim());
  const chunkText = row.source_chunk_text?.trim() ?? "";
  const looksLikeSentenceSynthetic = /^sentence-[0-9a-f]{8}$/i.test(chunkText);
  if (hasSentenceText && looksLikeSentenceSynthetic) return "sentence";
  return "expression";
};

async function loadExpressionClusterContextMap(
  userId: string,
  userPhraseIds: string[],
) {
  const uniqueIds = Array.from(new Set(userPhraseIds.map((item) => item.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, ExpressionClusterContext>();

  const client = await createUserScopedPhraseClient();
  const { data, error } = await client
    .from("user_expression_cluster_members")
    .select("user_phrase_id,role, cluster:user_expression_clusters!inner(id,user_id,main_user_phrase_id)")
    .in("user_phrase_id", uniqueIds);

  if (error) {
    throw new Error(`Failed to load expression cluster memberships: ${error.message}`);
  }

  const map = new Map<string, ExpressionClusterContext>();
  for (const row of (data ?? []) as Array<{
    user_phrase_id: string;
    role: "main" | "variant";
    cluster:
      | {
          id: string;
          user_id: string;
          main_user_phrase_id: string | null;
        }
      | Array<{
          id: string;
          user_id: string;
          main_user_phrase_id: string | null;
        }>
      | null;
  }>) {
    const cluster = Array.isArray(row.cluster) ? (row.cluster[0] ?? null) : row.cluster;
    if (!cluster || cluster.user_id !== userId) continue;
    map.set(row.user_phrase_id, {
      clusterId: cluster.id,
      role: row.role,
      mainUserPhraseId: cluster.main_user_phrase_id,
    });
  }

  return map;
}

async function findExpressionClusterById(userId: string, clusterId: string) {
  const client = await createUserScopedPhraseClient();
  const { data, error } = await client
    .from("user_expression_clusters")
    .select("*")
    .eq("id", clusterId)
    .eq("user_id", userId)
    .maybeSingle<UserExpressionClusterRow>();

  if (error) {
    throw new Error(`Failed to read expression cluster: ${error.message}`);
  }
  return data ?? null;
}

async function findExpressionClusterForPhrase(userId: string, userPhraseId: string) {
  const contextMap = await loadExpressionClusterContextMap(userId, [userPhraseId]);
  const context = contextMap.get(userPhraseId);
  if (!context) return null;
  return findExpressionClusterById(userId, context.clusterId);
}

async function createExpressionCluster(params: {
  userId: string;
  mainUserPhraseId: string;
  title?: string | null;
}) {
  const client = await createUserScopedPhraseClient();
  const payload = {
    user_id: params.userId,
    main_user_phrase_id: params.mainUserPhraseId,
    title: parseOptionalTrimmed(params.title, 120),
  };
  const { data, error } = await client
    .from("user_expression_clusters")
    .insert(payload as never)
    .select("*")
    .single<UserExpressionClusterRow>();

  if (error || !data) {
    throw new Error(`Failed to create expression cluster: ${error?.message ?? "unknown error"}`);
  }
  return data;
}

async function assignPhraseToExpressionCluster(params: {
  userId: string;
  clusterId: string;
  userPhraseId: string;
  role: "main" | "variant";
}) {
  const client = await createUserScopedPhraseClient();
  const { error: membershipError } = await client
    .from("user_expression_cluster_members")
    .upsert(
      {
        cluster_id: params.clusterId,
        user_phrase_id: params.userPhraseId,
        role: params.role,
      } as never,
      { onConflict: "user_phrase_id" },
    );

  if (membershipError) {
    throw new Error(`Failed to save expression cluster member: ${membershipError.message}`);
  }

  if (params.role === "main") {
    const { error: clusterError } = await client
      .from("user_expression_clusters")
      .update({ main_user_phrase_id: params.userPhraseId } as never)
      .eq("id", params.clusterId)
      .eq("user_id", params.userId);
    if (clusterError) {
      throw new Error(`Failed to promote expression cluster main item: ${clusterError.message}`);
    }
  }
}

async function mergeExpressionClusters(params: {
  userId: string;
  targetClusterId: string;
  sourceClusterId: string;
  mainUserPhraseId: string;
}) {
  if (params.targetClusterId === params.sourceClusterId) return;

  const client = await createUserScopedPhraseClient();
  const { data: sourceMembers, error: sourceMembersError } = await client
    .from("user_expression_cluster_members")
    .select("user_phrase_id")
    .eq("cluster_id", params.sourceClusterId);
  if (sourceMembersError) {
    throw new Error(`Failed to read source expression cluster members: ${sourceMembersError.message}`);
  }

  const membershipPayload = ((sourceMembers ?? []) as Array<{ user_phrase_id: string }>).map((row) => ({
    cluster_id: params.targetClusterId,
    user_phrase_id: row.user_phrase_id,
    role: row.user_phrase_id === params.mainUserPhraseId ? ("main" as const) : ("variant" as const),
  }));
  if (membershipPayload.length > 0) {
    const { error: upsertError } = await client
      .from("user_expression_cluster_members")
      .upsert(membershipPayload as never, { onConflict: "user_phrase_id" });
    if (upsertError) {
      throw new Error(`Failed to merge expression cluster members: ${upsertError.message}`);
    }
  }

  const { error: updateTargetError } = await client
    .from("user_expression_clusters")
    .update({ main_user_phrase_id: params.mainUserPhraseId } as never)
    .eq("id", params.targetClusterId)
    .eq("user_id", params.userId);
  if (updateTargetError) {
    throw new Error(`Failed to update merged expression cluster main item: ${updateTargetError.message}`);
  }

  const { error: deleteSourceError } = await client
    .from("user_expression_clusters")
    .delete()
    .eq("id", params.sourceClusterId)
    .eq("user_id", params.userId);
  if (deleteSourceError) {
    throw new Error(`Failed to delete merged source expression cluster: ${deleteSourceError.message}`);
  }
}

async function resolveOrCreateExpressionCluster(params: {
  userId: string;
  userPhraseId: string;
  requestedClusterId?: string | null;
  relationSourceUserPhraseId?: string | null;
  phraseText?: string | null;
}) {
  const requestedClusterId = isUuidLike(params.requestedClusterId ?? null)
    ? (params.requestedClusterId as string)
    : null;
  if (requestedClusterId) {
    const existingRequested = await findExpressionClusterById(params.userId, requestedClusterId);
    if (existingRequested) return existingRequested;
  }

  if (params.relationSourceUserPhraseId) {
    const sourceCluster = await findExpressionClusterForPhrase(params.userId, params.relationSourceUserPhraseId);
    if (sourceCluster) return sourceCluster;

    return createExpressionCluster({
      userId: params.userId,
      mainUserPhraseId: params.relationSourceUserPhraseId,
      title: params.phraseText ?? null,
    });
  }

  return createExpressionCluster({
    userId: params.userId,
    mainUserPhraseId: params.userPhraseId,
    title: params.phraseText ?? null,
  });
}

async function syncExpressionClusterMembership(params: {
  userId: string;
  userPhraseId: string;
  requestedClusterId?: string | null;
  relationSourceUserPhraseId?: string | null;
  relationType?: UserPhraseRelationType;
  phraseText?: string | null;
}) {
  if (params.relationType === "contrast") return null;

  const cluster = await resolveOrCreateExpressionCluster({
    userId: params.userId,
    userPhraseId: params.userPhraseId,
    requestedClusterId: params.requestedClusterId,
    relationSourceUserPhraseId: params.relationSourceUserPhraseId,
    phraseText: params.phraseText,
  });

  const sourcePhraseId = params.relationSourceUserPhraseId?.trim() ?? "";
  const currentContextMap = await loadExpressionClusterContextMap(params.userId, [
    params.userPhraseId,
    sourcePhraseId,
  ]);
  const targetExistingClusterId = currentContextMap.get(params.userPhraseId)?.clusterId ?? null;
  const sourceExistingClusterId = currentContextMap.get(sourcePhraseId)?.clusterId ?? null;

  if (targetExistingClusterId && targetExistingClusterId !== cluster.id) {
    await mergeExpressionClusters({
      userId: params.userId,
      targetClusterId: cluster.id,
      sourceClusterId: targetExistingClusterId,
      mainUserPhraseId: cluster.main_user_phrase_id ?? params.userPhraseId,
    });
  }
  if (
    sourceExistingClusterId &&
    sourceExistingClusterId !== cluster.id &&
    sourceExistingClusterId !== targetExistingClusterId
  ) {
    await mergeExpressionClusters({
      userId: params.userId,
      targetClusterId: cluster.id,
      sourceClusterId: sourceExistingClusterId,
      mainUserPhraseId: sourcePhraseId || cluster.main_user_phrase_id || params.userPhraseId,
    });
  }

  if (sourcePhraseId) {
    await assignPhraseToExpressionCluster({
      userId: params.userId,
      clusterId: cluster.id,
      userPhraseId: sourcePhraseId,
      role: cluster.main_user_phrase_id === sourcePhraseId ? "main" : "variant",
    });
  }

  const role = cluster.main_user_phrase_id === params.userPhraseId ? "main" : "variant";
  await assignPhraseToExpressionCluster({
    userId: params.userId,
    clusterId: cluster.id,
    userPhraseId: params.userPhraseId,
    role,
  });
  return cluster.id;
}

async function writeClusterMembershipState(params: {
  clusterId: string;
  mainUserPhraseId: string;
  userPhraseIds: string[];
}) {
  const client = await createUserScopedPhraseClient();
  const membershipPayload = params.userPhraseIds.map((userPhraseId) => ({
    cluster_id: params.clusterId,
    user_phrase_id: userPhraseId,
    role: userPhraseId === params.mainUserPhraseId ? "main" : "variant",
  }));

  const { error: membershipError } = await client
    .from("user_expression_cluster_members")
    .upsert(membershipPayload as never, { onConflict: "user_phrase_id" });
  if (membershipError) {
    throw new Error(`Failed to update cluster memberships before delete: ${membershipError.message}`);
  }
}

async function getOwnedUserPhraseForDelete(userId: string, userPhraseId: string) {
  const client = await createUserScopedPhraseClient();
  const { data, error } = await client
    .from("user_phrases")
    .select("id,learning_item_type")
    .eq("id", userPhraseId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string; learning_item_type: "expression" | "sentence" | null }>();

  if (error) {
    throw new Error(`Failed to read user phrase before delete: ${error.message}`);
  }
  if (!data) {
    throw new ValidationError("Expression not found.");
  }
  return data;
}

const toStableSentenceSyntheticText = (sentence: string) => {
  let hash = 0;
  for (let index = 0; index < sentence.length; index += 1) {
    hash = (hash * 31 + sentence.charCodeAt(index)) >>> 0;
  }
  return `sentence-${hash.toString(16).padStart(8, "0")}`;
};

const mapSavedPhraseRow = (
  row: UserPhraseRow & { phrase: PhraseRow | null },
  clusterContext?: ExpressionClusterContext | null,
): UserSavedPhraseItem => {
  const learningItemType = inferLearningItemType(row);
  return {
  learningItemType,
  userPhraseId: row.id,
  phraseId: row.phrase_id,
  text:
    learningItemType === "sentence"
      ? row.source_sentence_text ??
        row.phrase?.display_text ??
        row.source_chunk_text ??
        ""
      : row.phrase?.display_text ?? row.source_chunk_text ?? "",
  normalizedText:
    learningItemType === "sentence"
      ? normalizePhraseText(
          row.source_sentence_text ??
            row.phrase?.display_text ??
            row.source_chunk_text ??
            "",
        )
      : row.phrase?.normalized_text ?? "",
  translation: row.phrase?.translation ?? null,
  usageNote: row.phrase?.usage_note ?? null,
  difficulty: row.phrase?.difficulty ?? null,
  tags: Array.isArray(row.phrase?.tags) ? (row.phrase?.tags as string[]) : [],
  sourceSceneSlug: row.source_scene_slug,
  sourceType:
    row.source_type === "manual"
      ? "manual"
      : row.source_scene_slug
        ? "scene"
        : "manual",
  sourceNote: row.source_note ?? null,
  sourceSentenceIndex: row.source_sentence_index,
  sourceSentenceText: row.source_sentence_text,
  sourceChunkText: row.source_chunk_text,
  expressionClusterId: clusterContext?.clusterId ?? null,
  expressionClusterRole: clusterContext?.role ?? null,
  expressionClusterMainUserPhraseId: clusterContext?.mainUserPhraseId ?? null,
  aiEnrichmentStatus: row.ai_enrichment_status ?? null,
  semanticFocus: row.ai_semantic_focus ?? null,
  typicalScenario: row.ai_typical_scenario ?? null,
  exampleSentences: parseExampleSentences(row.ai_example_sentences),
  aiEnrichmentError: row.ai_enrichment_error ?? null,
  savedAt: row.saved_at,
  lastSeenAt: row.last_seen_at,
  reviewStatus: row.review_status,
  reviewCount: row.review_count,
  correctCount: row.correct_count,
  incorrectCount: row.incorrect_count,
  lastReviewedAt: row.last_reviewed_at,
  nextReviewAt: row.next_review_at,
  masteredAt: row.mastered_at,
  };
};

async function upsertUserPhraseRelation(params: {
  userId: string;
  sourceUserPhraseId: string;
  targetUserPhraseId: string;
  relationType: UserPhraseRelationType;
}) {
  if (params.sourceUserPhraseId === params.targetUserPhraseId) return;
  const client = await createUserScopedPhraseClient();

  const { data: ownedRows, error: ownershipError } = await client
    .from("user_phrases")
    .select("id")
    .eq("user_id", params.userId)
    .in("id", [params.sourceUserPhraseId, params.targetUserPhraseId]);

  if (ownershipError) {
    throw new Error(`Failed to verify phrase relation ownership: ${ownershipError.message}`);
  }

  const ownedIds = new Set(((ownedRows ?? []) as Array<{ id: string }>).map((row) => row.id));
  if (!ownedIds.has(params.sourceUserPhraseId) || !ownedIds.has(params.targetUserPhraseId)) {
    throw new ValidationError("Related expressions must belong to the current user.");
  }

  const payload = [
    {
      user_id: params.userId,
      source_user_phrase_id: params.sourceUserPhraseId,
      target_user_phrase_id: params.targetUserPhraseId,
      relation_type: params.relationType,
    },
    {
      user_id: params.userId,
      source_user_phrase_id: params.targetUserPhraseId,
      target_user_phrase_id: params.sourceUserPhraseId,
      relation_type: params.relationType,
    },
  ];

  const oppositeRelationType = getOppositeRelationType(params.relationType);
  const { error: deleteOppositeError } = await client
    .from("user_phrase_relations")
    .delete()
    .eq("user_id", params.userId)
    .eq("relation_type", oppositeRelationType)
    .or(
      `and(source_user_phrase_id.eq.${params.sourceUserPhraseId},target_user_phrase_id.eq.${params.targetUserPhraseId}),and(source_user_phrase_id.eq.${params.targetUserPhraseId},target_user_phrase_id.eq.${params.sourceUserPhraseId})`,
    );

  if (deleteOppositeError) {
    throw new Error(`Failed to normalize opposite phrase relation: ${deleteOppositeError.message}`);
  }

  const { error } = await client
    .from("user_phrase_relations")
    .upsert(payload as never, {
      onConflict: "user_id,source_user_phrase_id,target_user_phrase_id,relation_type",
    });

  if (error) {
    throw new Error(`Failed to save phrase relation: ${error.message}`);
  }
}

async function addDailyPhraseSaved(userId: string) {
  const client = await createUserScopedPhraseClient();
  const today = todayDate();
  const { data: existing, error: readError } = await client
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

  const { error: upsertError } = await client
    .from("user_daily_learning_stats")
    .upsert(next as never, { onConflict: "user_id,date" });
  if (upsertError) {
    throw new Error(`Failed to update user_daily_learning_stats: ${upsertError.message}`);
  }
}

async function incrementSceneSavedPhraseCount(userId: string, sceneId: string) {
  const client = await createUserScopedPhraseClient();
  const { data: existing, error: readError } = await client
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

  const { error: upsertError } = await client
    .from("user_scene_progress")
    .upsert(next as never, { onConflict: "user_id,scene_id" });

  if (upsertError) {
    throw new Error(`Failed to update scene progress saved_phrase_count: ${upsertError.message}`);
  }
}

export async function savePhraseForUser(userId: string, input: SavePhraseInput) {
  const learningItemType = input.learningItemType === "sentence" ? "sentence" : "expression";
  const expressionText = typeof input.text === "string" ? input.text.trim() : "";
  const sentenceText = parseOptionalTrimmed(input.sentenceText, 3000);

  if (learningItemType === "expression") {
    if (!expressionText) {
      throw new ValidationError("text is required.");
    }
    if (expressionText.length < 2) {
      throw new ValidationError("text is too short.");
    }
    if (expressionText.length > 200) {
      throw new ValidationError("text must be <= 200 characters.");
    }
  } else {
    if (!sentenceText) {
      throw new ValidationError("sentenceText is required when learningItemType=sentence.");
    }
  }

  const phraseDisplayText =
    learningItemType === "sentence"
      ? expressionText || toStableSentenceSyntheticText(sentenceText ?? "")
      : expressionText;
  const normalizedText = normalizePhraseText(phraseDisplayText);
  const phrase = await ensureSharedPhraseEntity({
    normalizedText,
    displayText: phraseDisplayText,
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

  const client = await createUserScopedPhraseClient();
  const { data: existing, error: existingError } = await client
    .from("user_phrases")
    .select("*")
    .eq("user_id", userId)
    .eq("phrase_id", phrase.id)
    .maybeSingle<UserPhraseRow>();

  if (existingError) {
    throw new Error(`Failed to read user phrase: ${existingError.message}`);
  }

  const now = nowIso();
  const relationType = input.relationType;
  const shouldTreatAsContrastOnly =
    learningItemType === "expression" &&
    (relationType === "contrast" || isContrastSourceNote(input.sourceNote));
  const requestedClusterId = shouldTreatAsContrastOnly
    ? null
    : parseOptionalTrimmed(input.expressionClusterId, 120);
  const reviewState = resolveSavedPhraseReviewState({
    learningItemType,
    existingReviewStatus: existing?.review_status ?? null,
    existingNextReviewAt: existing?.next_review_at ?? null,
    now,
  });
  const nextPayload = {
    user_id: userId,
    phrase_id: phrase.id,
    status: "saved" as const,
    // MVP review loop: new saved phrases should be immediately due once,
    // so users can see "today due" and complete their first review quickly.
    review_status: reviewState.reviewStatus,
    review_count: existing?.review_count ?? 0,
    correct_count: existing?.correct_count ?? 0,
    incorrect_count: existing?.incorrect_count ?? 0,
    last_reviewed_at: existing?.last_reviewed_at ?? null,
    next_review_at: reviewState.nextReviewAt,
    mastered_at: existing?.mastered_at ?? null,
    source_scene_id: sourceSceneId ?? existing?.source_scene_id ?? null,
    source_scene_slug: sourceSceneSlug ?? existing?.source_scene_slug ?? null,
    source_type:
      input.sourceType ??
      existing?.source_type ??
      (sourceSceneSlug ? ("scene" as const) : ("manual" as const)),
    source_note:
      parseOptionalTrimmed(input.sourceNote, 300) ??
      existing?.source_note ??
      null,
    source_sentence_index:
      typeof input.sourceSentenceIndex === "number" &&
      Number.isFinite(input.sourceSentenceIndex)
        ? Math.max(0, Math.floor(input.sourceSentenceIndex))
        : existing?.source_sentence_index ?? null,
    source_sentence_text:
      (learningItemType === "sentence"
        ? sentenceText
        : parseOptionalTrimmed(input.sourceSentenceText, 3000)) ??
      existing?.source_sentence_text ??
      null,
    source_chunk_text:
      (learningItemType === "sentence"
        ? parseOptionalTrimmed(input.sourceChunkText, 500) ?? parseOptionalTrimmed(input.text, 500)
        : parseOptionalTrimmed(input.sourceChunkText, 500) ?? parseOptionalTrimmed(input.text, 500)) ??
      existing?.source_chunk_text ??
      phraseDisplayText,
    learning_item_type:
      learningItemType ??
      existing?.learning_item_type ??
      "expression",
    saved_at: existing?.saved_at ?? now,
    last_seen_at: now,
  };

  const { data: savedRow, error: upsertError } = await client
    .from("user_phrases")
    .upsert(nextPayload as never, { onConflict: "user_id,phrase_id" })
    .select("*")
    .single<UserPhraseRow>();

  let finalSavedRow = savedRow;
  if (upsertError) {
    const shouldFallbackWithoutFamilyColumn =
      upsertError.code === "42703" ||
      upsertError.message.toLowerCase().includes("source_type") ||
      upsertError.message.toLowerCase().includes("source_note") ||
      upsertError.message.toLowerCase().includes("learning_item_type");

    if (shouldFallbackWithoutFamilyColumn) {
      const fallbackPayload = { ...nextPayload };
      delete (fallbackPayload as Record<string, unknown>).source_type;
      delete (fallbackPayload as Record<string, unknown>).source_note;
      delete (fallbackPayload as Record<string, unknown>).learning_item_type;
      const { data: fallbackRow, error: fallbackError } = await client
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

  if (
    learningItemType === "expression" &&
    input.relationSourceUserPhraseId &&
    relationType
  ) {
    await upsertUserPhraseRelation({
      userId,
      sourceUserPhraseId: input.relationSourceUserPhraseId,
      targetUserPhraseId: finalSavedRow.id,
      relationType,
    });
  }

  if (
    learningItemType === "expression" &&
    !shouldTreatAsContrastOnly &&
    (requestedClusterId || relationType === "similar" || isSimilarSourceNote(input.sourceNote))
  ) {
    await syncExpressionClusterMembership({
      userId,
      userPhraseId: finalSavedRow.id,
      requestedClusterId,
      relationSourceUserPhraseId: input.relationSourceUserPhraseId ?? null,
      relationType,
      phraseText: phraseDisplayText,
    });
  }

  if (learningItemType === "expression") {
    await ensureExpressionClusterForPhrase({
      userId,
      userPhraseId: finalSavedRow.id,
      title: phraseDisplayText,
    });
  }

  const clusterContextMap = await loadExpressionClusterContextMap(userId, [finalSavedRow.id]);
  const expressionClusterId = clusterContextMap.get(finalSavedRow.id)?.clusterId ?? null;

  return {
    phrase,
    userPhrase: finalSavedRow,
    expressionClusterId,
    created,
  };
}

export async function deleteUserPhraseForUser(
  userId: string,
  userPhraseId: string,
): Promise<DeleteUserPhraseResult> {
  const ownedPhrase = await getOwnedUserPhraseForDelete(userId, userPhraseId);
  const client = await createUserScopedPhraseClient();

  let deletedClusterId: string | null = null;
  let clusterDeleted = false;
  let nextMainUserPhraseId: string | null = null;

  if (ownedPhrase.learning_item_type !== "sentence") {
    const clusterContextMap = await loadExpressionClusterContextMap(userId, [userPhraseId]);
    const clusterContext = clusterContextMap.get(userPhraseId);

    if (clusterContext?.clusterId) {
      deletedClusterId = clusterContext.clusterId;
      const cluster = await findExpressionClusterById(userId, clusterContext.clusterId);
      const { data: memberRows, error: memberError } = await client
        .from("user_expression_cluster_members")
        .select("user_phrase_id")
        .eq("cluster_id", clusterContext.clusterId)
        .order("created_at", { ascending: true });

      if (memberError) {
        throw new Error(`Failed to read cluster members before delete: ${memberError.message}`);
      }

      const remainingMemberIds = ((memberRows ?? []) as Array<{ user_phrase_id: string }>)
        .map((row) => row.user_phrase_id)
        .filter((memberId) => memberId !== userPhraseId);

      const deleteClusterResult = resolveDeleteExpressionClusterResult({
        remainingMemberIds,
        currentMainUserPhraseId: cluster?.main_user_phrase_id,
      });

      if (deleteClusterResult.clusterDeleted) {
        if (cluster) {
          const { error: deleteClusterError } = await client
            .from("user_expression_clusters")
            .delete()
            .eq("id", cluster.id)
            .eq("user_id", userId);
          if (deleteClusterError) {
            throw new Error(`Failed to delete empty cluster: ${deleteClusterError.message}`);
          }
        }
        clusterDeleted = true;
      } else if (cluster) {
        nextMainUserPhraseId = deleteClusterResult.nextMainUserPhraseId;
        if (!nextMainUserPhraseId) {
          throw new Error("Failed to resolve next cluster main before delete.");
        }

        await writeClusterMembershipState({
          clusterId: cluster.id,
          mainUserPhraseId: nextMainUserPhraseId,
          userPhraseIds: remainingMemberIds,
        });

        const { error: updateClusterError } = await client
          .from("user_expression_clusters")
          .update({ main_user_phrase_id: nextMainUserPhraseId } as never)
          .eq("id", cluster.id)
          .eq("user_id", userId);
        if (updateClusterError) {
          throw new Error(`Failed to update cluster main before delete: ${updateClusterError.message}`);
        }
      }
    }
  }

  const { error: deletePhraseError } = await client
    .from("user_phrases")
    .delete()
    .eq("id", userPhraseId)
    .eq("user_id", userId);
  if (deletePhraseError) {
    throw new Error(`Failed to delete user phrase: ${deletePhraseError.message}`);
  }

  return {
    deletedUserPhraseId: userPhraseId,
    deletedClusterId,
    clusterDeleted,
    nextMainUserPhraseId,
    nextFocusUserPhraseId: nextMainUserPhraseId,
  };
}

export async function enrichAiExpressionLearningInfo(params: {
  userId: string;
  userPhraseId: string;
  baseExpression?: string;
  differenceLabel?: string;
}) {
  const userPhrase = await getUserPhraseForAiEnrichment(params);
  if (!userPhrase) {
    throw new ValidationError("Expression not found.");
  }
  if (inferLearningItemType(userPhrase) !== "expression") {
    throw new ValidationError("Only expression items can be enriched.");
  }

  const expression = (userPhrase.phrase?.display_text ?? userPhrase.source_chunk_text ?? "").trim();
  if (!expression) {
    throw new ValidationError("Expression text is missing.");
  }

  await markUserPhraseAiEnrichmentPending({
    userId: params.userId,
    userPhraseId: params.userPhraseId,
    lastSeenAt: nowIso(),
  });

  try {
    const rawModelText = await callGlmChatCompletion({
      systemPrompt: SIMILAR_EXPRESSION_ENRICH_SYSTEM_PROMPT,
      userPrompt: buildSimilarExpressionEnrichUserPrompt({
        expression,
        baseExpression: parseOptionalTrimmed(params.baseExpression, 200) ?? undefined,
        differenceLabel: parseOptionalTrimmed(params.differenceLabel, 40) ?? undefined,
      }),
      temperature: 0.2,
    });
    const parsed = parseWithDiagnostics(rawModelText) as Record<string, unknown>;

    const translation = parseOptionalTrimmed(parsed.translation, 200);
    const usageNote = parseOptionalTrimmed(parsed.usageNote, 300);
    const examples = parseExampleSentences(parsed.examples);
    const semanticFocus = parseOptionalTrimmed(parsed.semanticFocus, 40);
    const typicalScenario = parseOptionalTrimmed(parsed.typicalScenario, 80);
    const existingTranslation = parseOptionalTrimmed(userPhrase.phrase?.translation, 200);
    const existingUsageNote = parseOptionalTrimmed(userPhrase.phrase?.usage_note, 300);
    const existingSentenceText = parseOptionalTrimmed(userPhrase.source_sentence_text, 500);
    const existingExamples = parseExampleSentences(userPhrase.ai_example_sentences);
    const existingSemanticFocus = parseOptionalTrimmed(userPhrase.ai_semantic_focus, 40);
    const existingTypicalScenario = parseOptionalTrimmed(userPhrase.ai_typical_scenario, 80);
    const zhTranslation =
      existingTranslation ??
      translation ??
      null;
    const zhUsageNote = hasChinese(usageNote)
      ? usageNote
      : existingUsageNote ?? toChineseUsageNoteFallback(expression, zhTranslation);
    const zhSemanticFocus = toChineseSemanticFocusFallback(
      existingSemanticFocus ?? semanticFocus,
      parseOptionalTrimmed(params.differenceLabel, 40),
    );
    const zhTypicalScenario = toChineseTypicalScenarioFallback(
      existingTypicalScenario ?? typicalScenario,
    );

    await updateSharedPhraseLearningInfo({
      phraseId: userPhrase.phrase_id,
      translation: zhTranslation,
      usageNote: zhUsageNote,
    });

    await completeUserPhraseAiEnrichment({
      userId: params.userId,
      userPhraseId: params.userPhraseId,
      sourceSentenceText: existingSentenceText ?? examples[0]?.en ?? null,
      exampleSentences: existingExamples.length > 0 ? existingExamples : examples,
      semanticFocus: existingSemanticFocus ?? zhSemanticFocus ?? null,
      typicalScenario: existingTypicalScenario ?? zhTypicalScenario ?? null,
      lastSeenAt: nowIso(),
    });

    return {
      userPhraseId: params.userPhraseId,
      status: "done" as const,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown enrichment error";
    await failUserPhraseAiEnrichment({
      userId: params.userId,
      userPhraseId: params.userPhraseId,
      message,
      lastSeenAt: nowIso(),
    });
    throw error;
  }
}

export async function listUserSavedPhrases(params: {
  userId: string;
  query?: string;
  status?: "saved" | "archived";
  reviewStatus?: UserPhraseReviewStatus | "all";
  learningItemType?: "expression" | "sentence" | "all";
  expressionClusterId?: string;
  page?: number;
  limit?: number;
}) {
  const client = await createUserScopedPhraseClient();
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const textQuery = params.query?.trim().toLowerCase() ?? "";
  let clusterMemberIds: string[] | null = null;

  if (params.expressionClusterId) {
    const { data: membershipRows, error: membershipError } = await client
      .from("user_expression_cluster_members")
      .select("user_phrase_id, cluster:user_expression_clusters!inner(id,user_id)")
      .eq("cluster_id", params.expressionClusterId);
    if (membershipError) {
      throw new Error(`Failed to read expression cluster filter: ${membershipError.message}`);
    }
    clusterMemberIds = ((membershipRows ?? []) as Array<{
      user_phrase_id: string;
      cluster:
        | {
            id: string;
            user_id: string;
          }
        | Array<{
            id: string;
            user_id: string;
          }>
        | null;
    }>)
      .filter((row) => {
        const cluster = Array.isArray(row.cluster) ? (row.cluster[0] ?? null) : row.cluster;
        return cluster?.user_id === params.userId;
      })
      .map((row) => row.user_phrase_id);

    if (clusterMemberIds.length === 0) {
      return {
        rows: [] as UserSavedPhraseItem[],
        total: 0,
        page,
        limit,
      };
    }
  }

  let query = client
    .from("user_phrases")
    .select("*, phrase:phrases(*)", { count: "exact" })
    .eq("user_id", params.userId)
    .order("saved_at", { ascending: false });

  if (!textQuery) {
    query = query.range(from, to);
  }

  query = query.eq("status", params.status ?? "saved");
  if (clusterMemberIds) {
    query = query.in("id", clusterMemberIds);
  }
  if (params.reviewStatus && params.reviewStatus !== "all") {
    query = query.eq("review_status", params.reviewStatus);
  }
  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list user phrases: ${error.message}`);
  }

  const rows = (data ?? []) as Array<UserPhraseRow & { phrase: PhraseRow | null }>;
  const clusterContextMap = await loadExpressionClusterContextMap(
    params.userId,
    rows.map((row) => row.id),
  );
  const mappedRows = rows.map((row) => mapSavedPhraseRow(row, clusterContextMap.get(row.id)));
  const textFilteredRows = textQuery
    ? mappedRows.filter((row) =>
        [
          row.text,
          row.translation,
          row.sourceSentenceText,
          row.sourceChunkText,
          row.usageNote,
        ].some((value) => value?.toLowerCase().includes(textQuery)),
      )
    : mappedRows;
  const filteredRows =
    params.learningItemType && params.learningItemType !== "all"
      ? textFilteredRows.filter((row) => row.learningItemType === params.learningItemType)
      : textFilteredRows;
  return {
    rows: textQuery ? filteredRows.slice(from, to + 1) : filteredRows,
    total: textQuery
      ? filteredRows.length
      : params.learningItemType && params.learningItemType !== "all"
        ? filteredRows.length
        : (count ?? 0),
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

  const client = await createUserScopedPhraseClient();
  const { data: phraseRows, error: phraseError } = await client
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

  const { data: userRows, error: userError } = await client
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

export async function listUserPhraseRelations(params: {
  userId: string;
  userPhraseId: string;
}) {
  return listUserPhraseRelationsBatch({
    userId: params.userId,
    userPhraseIds: [params.userPhraseId],
  });
}

export async function listUserPhraseRelationsBatch(params: {
  userId: string;
  userPhraseIds: string[];
}) {
  const client = await createUserScopedPhraseClient();
  const userPhraseIds = Array.from(new Set(params.userPhraseIds.map((item) => item.trim()).filter(Boolean))).slice(0, 100);
  if (userPhraseIds.length === 0) return [] as UserSavedPhraseRelationItem[];

  const { data: relationRows, error: relationError } = await client
    .from("user_phrase_relations")
    .select("*")
    .eq("user_id", params.userId)
    .in("source_user_phrase_id", userPhraseIds);

  if (relationError) {
    throw new Error(`Failed to read phrase relations: ${relationError.message}`);
  }

  const rows = (relationRows ?? []) as UserPhraseRelationRow[];
  const targetIds = Array.from(new Set(rows.map((row) => row.target_user_phrase_id))).slice(0, 100);
  if (targetIds.length === 0) return [] as UserSavedPhraseRelationItem[];

  const { data: targetRows, error: targetError } = await client
    .from("user_phrases")
    .select("*, phrase:phrases(*)")
    .eq("user_id", params.userId)
    .in("id", targetIds);

  if (targetError) {
    throw new Error(`Failed to read related phrases: ${targetError.message}`);
  }

  const clusterContextMap = await loadExpressionClusterContextMap(params.userId, targetIds);
  const targetById = new Map(
    ((targetRows ?? []) as Array<UserPhraseRow & { phrase: PhraseRow | null }>).map((row) => [
      row.id,
      mapSavedPhraseRow(row, clusterContextMap.get(row.id)),
    ]),
  );

  return rows
    .map((row) => {
      const item = targetById.get(row.target_user_phrase_id);
      if (!item) return null;
      return {
        sourceUserPhraseId: row.source_user_phrase_id,
        relationType: row.relation_type,
        item,
      } satisfies UserSavedPhraseRelationItem;
    })
    .filter((row): row is UserSavedPhraseRelationItem => Boolean(row));
}

export async function getUserPhraseSummary(userId: string) {
  const client = await createUserScopedPhraseClient();

  const [{ count: totalSavedPhrases, error: totalError }, { data: dailyStats, error: dailyError }] =
    await Promise.all([
      client
        .from("user_phrases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "saved"),
      client
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

