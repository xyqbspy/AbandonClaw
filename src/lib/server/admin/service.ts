import type { User } from "@supabase/supabase-js";
import { isValidParsedScene } from "@/lib/server/scene-json";
import { generateSceneVariants, getSceneVariantsBySceneId } from "@/lib/server/scene/variants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AiCacheRow, SceneRow, SceneVariantRow, UserAccessStatus } from "@/lib/server/db/types";
import { runSeedScenesSync } from "@/lib/server/scene/service";
import { listRecentAiCacheStats } from "@/lib/server/ai-cache/service";
import { NotFoundError, ValidationError } from "@/lib/server/errors";
import { enrichAiExpressionLearningInfo } from "@/lib/server/phrases/service";
import { deleteSceneTtsAudioBySlug } from "@/lib/server/tts/storage";
import { mapLessonToParsedScene, mapParsedSceneToLesson } from "@/lib/adapters/scene-parser-adapter";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";
import { ParsedScene } from "@/lib/types/scene-parser";
import { parseUserAccessStatus } from "@/lib/server/validation";

export interface AdminSceneListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  origin?: "seed" | "imported";
  isPublic?: boolean;
}

export interface AdminAiCacheFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  cacheType?: string;
  status?: "success" | "error";
}

export interface AdminPhraseListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  learningItemType?: "all" | "expression" | "sentence";
}

export interface AdminPhraseListItem {
  userPhraseId: string;
  phraseId: string;
  userId: string;
  text: string;
  translation: string | null;
  sourceSentenceText: string | null;
  sourceChunkText: string | null;
  sourceSceneSlug: string | null;
  learningItemType: "expression" | "sentence";
  reviewStatus: string;
  aiEnrichmentStatus: "pending" | "done" | "failed" | null;
  enrichmentState: "done" | "missing" | "pending" | "na";
  enrichmentLabel: string;
  createdAt: string;
  savedAt: string;
}

export interface AdminUserListFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  accessStatus?: UserAccessStatus;
}

export interface AdminUserListItem {
  userId: string;
  email: string | null;
  username: string | null;
  accessStatus: UserAccessStatus;
  createdAt: string;
}

interface AdminUserServiceDependencies {
  createSupabaseAdminClient: typeof createSupabaseAdminClient;
}

const adminUserServiceDependencies: AdminUserServiceDependencies = {
  createSupabaseAdminClient,
};

const DEFAULT_ADMIN_ACCESS_STATUS: UserAccessStatus = "active";
const AUTH_LIST_USERS_PAGE_SIZE = 100;
const AUTH_LIST_USERS_MAX_PAGES = 20;

export interface AdminSceneSentenceUpdate {
  sentenceId: string;
  text: string;
  translation: string;
  tts: string;
  chunks: string[];
}

const clampPage = (value: number | undefined) => {
  if (!value || Number.isNaN(value)) return 1;
  return Math.max(1, Math.floor(value));
};

const clampPageSize = (value: number | undefined) => {
  if (!value || Number.isNaN(value)) return 20;
  return Math.min(100, Math.max(1, Math.floor(value)));
};

const normalizeSearch = (value: string | undefined) => {
  const text = value?.trim();
  return text ? text : undefined;
};

const hasEnoughExampleSentences = (value: unknown) => Array.isArray(value) && value.length >= 2;

const getAdminPhraseEnrichmentState = (row: {
  learningItemType: "expression" | "sentence";
  aiEnrichmentStatus: "pending" | "done" | "failed" | null;
  translation: string | null;
  usageNote: string | null;
  semanticFocus: string | null;
  typicalScenario: string | null;
  exampleSentences: unknown;
}) => {
  if (row.learningItemType !== "expression") {
    return {
      state: "na" as const,
      label: "-",
    };
  }
  if (row.aiEnrichmentStatus === "pending") {
    return {
      state: "pending" as const,
      label: "补全中",
    };
  }

  const hasTranslation = Boolean(row.translation?.trim());
  const hasUsageNote = Boolean(row.usageNote?.trim());
  const hasSemanticFocus = Boolean(row.semanticFocus?.trim());
  const hasTypicalScenario = Boolean(row.typicalScenario?.trim());
  const hasExamples = hasEnoughExampleSentences(row.exampleSentences);
  const completed =
    row.aiEnrichmentStatus === "done" &&
    hasTranslation &&
    hasUsageNote &&
    hasSemanticFocus &&
    hasTypicalScenario &&
    hasExamples;

  return completed
    ? {
        state: "done" as const,
        label: "已补全",
      }
    : {
        state: "missing" as const,
        label: "缺失",
      };
};

const isMissingProgressStatusColumn = (error: { code?: string | null; message: string }) =>
  error.code === "42703" || error.message.includes("column user_scene_progress.status does not exist");

const inferAdminPhraseItemType = (row: {
  learning_item_type: string | null;
  source_sentence_text: string | null;
  source_chunk_text: string | null;
}) => {
  if (row.learning_item_type === "sentence") return "sentence" as const;
  if (row.learning_item_type === "expression") return "expression" as const;
  const chunkText = row.source_chunk_text?.trim() ?? "";
  const hasSentence = Boolean(row.source_sentence_text?.trim());
  if (hasSentence && /^sentence-[0-9a-f]{8}$/i.test(chunkText)) {
    return "sentence" as const;
  }
  return "expression" as const;
};

export async function listAdminScenes(filters: AdminSceneListFilters) {
  await runSeedScenesSync();
  const admin = createSupabaseAdminClient();
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const search = normalizeSearch(filters.search);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("scenes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.origin) {
    query = query.eq("origin", filters.origin);
  }
  if (typeof filters.isPublic === "boolean") {
    query = query.eq("is_public", filters.isPublic);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list admin scenes: ${error.message}`);
  }

  return {
    rows: (data ?? []) as SceneRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAdminSceneDetail(sceneId: string) {
  await runSeedScenesSync();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .maybeSingle<SceneRow>();

  if (error) {
    throw new Error(`Failed to load scene detail: ${error.message}`);
  }
  if (!data) return null;

  const variants = await getSceneVariantsBySceneId(sceneId);

  const {
    data: progressRowsWithStatus,
    error: progressErrorWithStatus,
  } = await admin
    .from("user_scene_progress")
    .select("status,progress_percent,last_viewed_at")
    .eq("scene_id", sceneId);

  let progressStatsRows: Array<{
    status: string;
    progress_percent: number | null;
    last_viewed_at: string | null;
  }> = [];

  if (progressErrorWithStatus) {
    if (!isMissingProgressStatusColumn(progressErrorWithStatus)) {
      throw new Error(`Failed to read scene progress rows: ${progressErrorWithStatus.message}`);
    }
    const { data: legacyProgressRows, error: legacyProgressError } = await admin
      .from("user_scene_progress")
      .select("progress_percent,last_viewed_at")
      .eq("scene_id", sceneId);
    if (legacyProgressError) {
      throw new Error(`Failed to read legacy scene progress rows: ${legacyProgressError.message}`);
    }
    progressStatsRows = ((legacyProgressRows ?? []) as Array<{
      progress_percent: number | null;
      last_viewed_at: string | null;
    }>).map((row) => ({
      status: Number(row.progress_percent ?? 0) >= 100 ? "completed" : "in_progress",
      progress_percent: row.progress_percent,
      last_viewed_at: row.last_viewed_at,
    }));
  } else {
    progressStatsRows = (progressRowsWithStatus ?? []) as Array<{
      status: string;
      progress_percent: number | null;
      last_viewed_at: string | null;
    }>;
  }

  const startedRows = progressStatsRows.filter(
    (row) => row.status !== "not_started" && (row.last_viewed_at !== null || Number(row.progress_percent ?? 0) > 0),
  );

  const progressStartedCount = startedRows.length;
  const progressCompletedCount = startedRows.filter(
    (row) => row.status === "completed",
  ).length;
  const progressLastViewedAt = startedRows
    .map((row) => row.last_viewed_at as string | null)
    .filter(Boolean)
    .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] ?? null;
  const avgProgressPercent =
    startedRows.length > 0
      ? startedRows.reduce(
          (sum, row) => sum + Number(row.progress_percent ?? 0),
          0,
        ) / startedRows.length
      : 0;

  const { count: variantCacheCount, error: variantCacheError } = await admin
    .from("ai_cache")
    .select("*", { count: "exact", head: true })
    .eq("cache_type", "scene_variants")
    .contains("input_json", { sceneId });

  if (variantCacheError) {
    throw new Error(`Failed to read scene-related cache rows: ${variantCacheError.message}`);
  }

  return {
    scene: data,
    variants,
    diagnostics: {
      variantsCount: variants.length,
      relatedVariantCacheCount: variantCacheCount ?? 0,
      sourceTextLength: data.source_text?.length ?? 0,
      progressStartedCount,
      progressCompletedCount,
      progressLastViewedAt,
      avgProgressPercent,
    },
  };
}

export async function deleteSceneById(sceneId: string) {
  const admin = createSupabaseAdminClient();
  const { data: scene, error: sceneError } = await admin
    .from("scenes")
    .select("id,slug")
    .eq("id", sceneId)
    .maybeSingle<Pick<SceneRow, "id" | "slug">>();

  if (sceneError) {
    throw new Error(`Failed to load scene before delete: ${sceneError.message}`);
  }
  if (!scene) {
    throw new NotFoundError("Scene not found.");
  }

  await deleteSceneTtsAudioBySlug(scene.slug);

  const { error } = await admin.from("scenes").delete().eq("id", sceneId);
  if (error) {
    throw new Error(`Failed to delete scene: ${error.message}`);
  }
}

export async function updateSceneSentencesById(params: {
  sceneId: string;
  sentences: AdminSceneSentenceUpdate[];
}) {
  const admin = createSupabaseAdminClient();
  const { data: scene, error: sceneError } = await admin
    .from("scenes")
    .select("*")
    .eq("id", params.sceneId)
    .maybeSingle<SceneRow>();

  if (sceneError) {
    throw new Error(`Failed to load scene before update: ${sceneError.message}`);
  }
  if (!scene) {
    throw new NotFoundError("Scene not found.");
  }

  const normalizedScene = normalizeParsedSceneDialogue(scene.scene_json as ParsedScene);
  const lesson = mapParsedSceneToLesson({
    version: "v1",
    scene: normalizedScene,
  });
  const updates = new Map(
    params.sentences.map((item) => [
      item.sentenceId,
      {
        ...item,
        text: item.text.trim(),
        translation: item.translation.trim(),
        tts: item.tts.trim(),
        chunks: Array.from(new Set(item.chunks.map((chunk) => chunk.trim()).filter(Boolean))),
      },
    ]),
  );

  let updatedCount = 0;
  const nextLesson = {
    ...lesson,
    sections: lesson.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => {
        let blockChanged = false;
        const nextSentences = block.sentences.map((sentence) => {
          const next = updates.get(sentence.id);
          if (!next) return sentence;
          blockChanged = true;
          updatedCount += 1;
          return {
            ...sentence,
            text: next.text,
            translation: next.translation,
            tts: next.tts || next.text,
            chunks: next.chunks,
            chunkDetails: undefined,
          };
        });

        if (!blockChanged) return block;

        return {
          ...block,
          translation: nextSentences
            .map((sentence) => sentence.translation.trim())
            .filter(Boolean)
            .join(" "),
          tts: nextSentences
            .map((sentence) => sentence.tts?.trim() || sentence.text)
            .filter(Boolean)
            .join(" "),
          sentences: nextSentences,
        };
      }),
    })),
  };

  if (updatedCount === 0) {
    throw new NotFoundError("No matching sentences found.");
  }

  const nextScene = normalizeParsedSceneDialogue(mapLessonToParsedScene(nextLesson));
  const { error: updateError } = await admin
    .from("scenes")
    .update({
      scene_json: nextScene,
      translation: nextScene.subtitle ?? scene.translation,
    } as never)
    .eq("id", scene.id);

  if (updateError) {
    throw new Error(`Failed to update scene sentences: ${updateError.message}`);
  }

  await deleteSceneTtsAudioBySlug(scene.slug);

  return {
    sceneId: scene.id,
    slug: scene.slug,
    updatedCount,
  };
}

export async function updateSceneVisibility(params: {
  sceneId: string;
  isPublic: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scenes")
    .update({ is_public: params.isPublic } as never)
    .eq("id", params.sceneId)
    .select("*")
    .maybeSingle<SceneRow>();

  if (error) {
    throw new Error(`Failed to update scene visibility: ${error.message}`);
  }
  if (!data) {
    throw new NotFoundError("Scene not found.");
  }
  return data;
}

export async function regenerateSceneVariants(params: {
  sceneId: string;
  variantCount?: number;
  retainChunkRatio?: number;
  force?: boolean;
  createdBy?: string | null;
}) {
  const detail = await getAdminSceneDetail(params.sceneId);
  if (!detail) {
    throw new Error("Scene not found.");
  }

  const sourceScene = detail.scene.scene_json;
  if (!isValidParsedScene(sourceScene)) {
    throw new Error("Scene JSON is invalid for variant generation.");
  }

  return generateSceneVariants({
    sceneId: params.sceneId,
    scene: {
      ...sourceScene,
      id: detail.scene.id,
      slug: detail.scene.slug,
    },
    variantCount: params.variantCount,
    retainChunkRatio: params.retainChunkRatio,
    model: process.env.GLM_MODEL ?? "glm-4.6",
    createdBy: params.createdBy ?? null,
    force: params.force,
  });
}

export async function listAdminVariants(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: "asc" | "desc";
}) {
  const admin = createSupabaseAdminClient();
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);
  const search = normalizeSearch(params.search);
  const sortAscending = params.sort === "asc";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await admin
    .from("scene_variants")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("variant_index", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list admin variants: ${error.message}`);
  }

  const rows = (data ?? []) as SceneVariantRow[];
  const sceneIds = Array.from(new Set(rows.map((row) => row.scene_id)));
  const scenesById = new Map<string, Pick<SceneRow, "id" | "title" | "slug">>();

  if (sceneIds.length > 0) {
    const { data: sceneRows, error: sceneError } = await admin
      .from("scenes")
      .select("id,title,slug")
      .in("id", sceneIds);

    if (sceneError) {
      throw new Error(`Failed to list scene metadata for variants: ${sceneError.message}`);
    }

    for (const row of (sceneRows ?? []) as Array<Pick<SceneRow, "id" | "title" | "slug">>) {
      scenesById.set(row.id, row);
    }
  }

  let filteredRows = rows;
  if (search) {
    filteredRows = rows.filter((row) => {
      const scene = scenesById.get(row.scene_id);
      return (
        row.scene_id.includes(search) ||
        row.cache_key?.includes(search) ||
        scene?.slug?.toLowerCase().includes(search.toLowerCase()) ||
        scene?.title?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }

  const orderedRows = filteredRows.sort((a, b) => {
    const lhs = new Date(a.created_at).getTime();
    const rhs = new Date(b.created_at).getTime();
    return sortAscending ? lhs - rhs : rhs - lhs;
  });

  return {
    rows: orderedRows.map((row) => ({
      ...row,
      scene: scenesById.get(row.scene_id) ?? null,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listAdminAiCache(filters: AdminAiCacheFilters) {
  const admin = createSupabaseAdminClient();
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const search = normalizeSearch(filters.search);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("ai_cache")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.cacheType) {
    query = query.eq("cache_type", filters.cacheType);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (search) {
    query = query.ilike("cache_key", `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list ai cache: ${error.message}`);
  }

  return {
    rows: (data ?? []) as AiCacheRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listAdminPhrases(filters: AdminPhraseListFilters) {
  const admin = createSupabaseAdminClient();
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const search = normalizeSearch(filters.search);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("user_phrases")
    .select(
      "*, phrase:phrases(id,display_text,translation,normalized_text,usage_note)",
      { count: "exact" },
    )
    .order("saved_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `source_chunk_text.ilike.%${search}%,source_sentence_text.ilike.%${search}%,phrase.display_text.ilike.%${search}%,phrase.translation.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list admin phrases: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    phrase_id: string;
    user_id: string;
    source_sentence_text: string | null;
    source_chunk_text: string | null;
    source_scene_slug: string | null;
      review_status: string;
      ai_enrichment_status: "pending" | "done" | "failed" | null;
      ai_example_sentences: unknown;
      ai_semantic_focus: string | null;
      ai_typical_scenario: string | null;
      created_at: string;
      saved_at: string;
      learning_item_type: string | null;
      phrase: {
        id: string;
        display_text: string | null;
        translation: string | null;
        normalized_text: string | null;
        usage_note: string | null;
      } | null;
  }>;

  const mapped = rows.map<AdminPhraseListItem>((row) => {
    const learningItemType = inferAdminPhraseItemType(row);
    const enrichmentMeta = getAdminPhraseEnrichmentState({
      learningItemType,
      aiEnrichmentStatus: row.ai_enrichment_status ?? null,
      translation: row.phrase?.translation ?? null,
      usageNote: row.phrase?.usage_note ?? null,
      semanticFocus: row.ai_semantic_focus ?? null,
      typicalScenario: row.ai_typical_scenario ?? null,
      exampleSentences: row.ai_example_sentences,
    });
    const text =
      learningItemType === "sentence"
        ? row.source_sentence_text ?? row.phrase?.display_text ?? row.source_chunk_text ?? ""
        : row.phrase?.display_text ?? row.source_chunk_text ?? row.source_sentence_text ?? "";

    return {
      userPhraseId: row.id,
      phraseId: row.phrase_id,
      userId: row.user_id,
      text,
      translation: row.phrase?.translation ?? null,
      sourceSentenceText: row.source_sentence_text,
      sourceChunkText: row.source_chunk_text,
      sourceSceneSlug: row.source_scene_slug,
      learningItemType,
      reviewStatus: row.review_status,
      aiEnrichmentStatus: row.ai_enrichment_status ?? null,
      enrichmentState: enrichmentMeta.state,
      enrichmentLabel: enrichmentMeta.label,
      createdAt: row.created_at,
      savedAt: row.saved_at,
    };
  });

  const learningItemType = filters.learningItemType ?? "all";
  const filtered =
    learningItemType === "all"
      ? mapped
      : mapped.filter((row) => row.learningItemType === learningItemType);

  return {
    rows: filtered,
    total: learningItemType === "all" ? count ?? 0 : filtered.length,
    page,
    pageSize,
  };
}

export async function deleteAdminUserPhraseById(userPhraseId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("user_phrases").delete().eq("id", userPhraseId);
  if (error) {
    throw new Error(`Failed to delete user phrase: ${error.message}`);
  }
}

export async function enrichAdminUserPhraseById(userPhraseId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_phrases")
    .select("id,user_id,learning_item_type,source_chunk_text,source_sentence_text")
    .eq("id", userPhraseId)
    .maybeSingle<{
      id: string;
      user_id: string;
      learning_item_type: "expression" | "sentence" | null;
      source_chunk_text: string | null;
      source_sentence_text: string | null;
    }>();
  if (error) {
    throw new Error(`Failed to load user phrase for enrichment: ${error.message}`);
  }
  if (!data) {
    throw new NotFoundError("User phrase not found.");
  }

  const itemType = inferAdminPhraseItemType({
    learning_item_type: data.learning_item_type,
    source_chunk_text: data.source_chunk_text,
    source_sentence_text: data.source_sentence_text,
  });
  if (itemType !== "expression") {
    return {
      userPhraseId: data.id,
      status: "skipped" as const,
      reason: "non_expression",
    };
  }

  const result = await enrichAiExpressionLearningInfo({
    userId: data.user_id,
    userPhraseId: data.id,
  });
  return {
    userPhraseId: result.userPhraseId,
    status: "done" as const,
  };
}

export async function enrichAdminUserPhrasesByIds(userPhraseIds: string[]) {
  const admin = createSupabaseAdminClient();
  const ids = Array.from(new Set(userPhraseIds.map((id) => id.trim()).filter(Boolean))).slice(0, 100);
  if (ids.length === 0) {
    return {
      total: 0,
      done: 0,
      skipped: 0,
      failed: 0,
      items: [] as Array<{
        userPhraseId: string;
        status: "done" | "skipped" | "failed";
        reason?: string;
      }>,
    };
  }

  const { data, error } = await admin
    .from("user_phrases")
    .select("id,user_id,learning_item_type,source_chunk_text,source_sentence_text")
    .in("id", ids)
    .returns<
      Array<{
        id: string;
        user_id: string;
        learning_item_type: "expression" | "sentence" | null;
        source_chunk_text: string | null;
        source_sentence_text: string | null;
      }>
    >();

  if (error) {
    throw new Error(`Failed to load user phrases for batch enrichment: ${error.message}`);
  }

  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  const items: Array<{
    userPhraseId: string;
    status: "done" | "skipped" | "failed";
    reason?: string;
  }> = [];

  for (const userPhraseId of ids) {
    const row = byId.get(userPhraseId);
    if (!row) {
      items.push({
        userPhraseId,
        status: "failed",
        reason: "not_found",
      });
      continue;
    }

    const itemType = inferAdminPhraseItemType({
      learning_item_type: row.learning_item_type,
      source_chunk_text: row.source_chunk_text,
      source_sentence_text: row.source_sentence_text,
    });
    if (itemType !== "expression") {
      items.push({
        userPhraseId,
        status: "skipped",
        reason: "non_expression",
      });
      continue;
    }

    try {
      await enrichAiExpressionLearningInfo({
        userId: row.user_id,
        userPhraseId: row.id,
      });
      items.push({
        userPhraseId,
        status: "done",
      });
    } catch (error) {
      items.push({
        userPhraseId,
        status: "failed",
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return {
    total: items.length,
    done: items.filter((item) => item.status === "done").length,
    skipped: items.filter((item) => item.status === "skipped").length,
    failed: items.filter((item) => item.status === "failed").length,
    items,
  };
}

export async function getAdminOverviewStats() {
  await runSeedScenesSync();
  const admin = createSupabaseAdminClient();

  const [sceneRes, importedRes, variantRes, cacheStats, latestLearningRes] = await Promise.all([
    admin.from("scenes").select("*", { count: "exact", head: true }),
    admin
      .from("scenes")
      .select("*", { count: "exact", head: true })
      .eq("origin", "imported"),
    admin.from("scene_variants").select("*", { count: "exact", head: true }),
    listRecentAiCacheStats(),
    admin
      .from("user_scene_progress")
      .select("last_viewed_at")
      .order("last_viewed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<{ last_viewed_at: string | null }>(),
  ]);

  if (sceneRes.error) throw new Error(`Failed to count scenes: ${sceneRes.error.message}`);
  if (importedRes.error) {
    throw new Error(`Failed to count imported scenes: ${importedRes.error.message}`);
  }
  if (variantRes.error) {
    throw new Error(`Failed to count scene variants: ${variantRes.error.message}`);
  }
  if (latestLearningRes.error) {
    throw new Error(`Failed to read latest learning activity: ${latestLearningRes.error.message}`);
  }

  const {
    data: progressUsersWithStatus,
    error: progressUsersWithStatusError,
  } = await admin
    .from("user_scene_progress")
    .select("user_id,status,progress_percent,last_viewed_at");

  let uniqueProgressUsers = 0;
  let scenesInProgressCount = 0;
  let scenesCompletedCount = 0;

  if (progressUsersWithStatusError) {
    if (!isMissingProgressStatusColumn(progressUsersWithStatusError)) {
      throw new Error(
        `Failed to count progress users: ${progressUsersWithStatusError.message}`,
      );
    }
    const { data: legacyProgressRows, error: legacyProgressError } = await admin
      .from("user_scene_progress")
      .select("user_id,progress_percent,last_viewed_at");
    if (legacyProgressError) {
      throw new Error(`Failed to count legacy progress users: ${legacyProgressError.message}`);
    }
    const rows = (legacyProgressRows ?? []) as Array<{
      user_id: string;
      progress_percent: number | null;
      last_viewed_at: string | null;
    }>;
    const startedRows = rows.filter(
      (row) => row.last_viewed_at !== null || Number(row.progress_percent ?? 0) > 0,
    );
    uniqueProgressUsers = new Set(startedRows.map((row) => row.user_id)).size;
    scenesCompletedCount = startedRows.filter((row) => Number(row.progress_percent ?? 0) >= 100).length;
    scenesInProgressCount = startedRows.length - scenesCompletedCount;
  } else {
    const rows = (progressUsersWithStatus ?? []) as Array<{
      user_id: string;
      status: string;
    }>;
    const startedRows = rows.filter((row) => row.status !== "not_started");
    uniqueProgressUsers = new Set(startedRows.map((row) => row.user_id)).size;
    scenesInProgressCount = startedRows.filter(
      (row) => row.status === "in_progress" || row.status === "paused",
    ).length;
    scenesCompletedCount = startedRows.filter((row) => row.status === "completed").length;
  }

  return {
    totalScenes: sceneRes.count ?? 0,
    importedScenes: importedRes.count ?? 0,
    totalVariants: variantRes.count ?? 0,
    totalCacheRows: cacheStats.total,
    latestCacheCreatedAt: cacheStats.latestCreatedAt,
    totalUsersWithProgress: uniqueProgressUsers,
    scenesInProgressCount,
    scenesCompletedCount,
    latestLearningActivityAt: latestLearningRes.data?.last_viewed_at ?? null,
  };
}

const getAdminUserSearchTerms = (user: {
  id: string;
  email: string | null;
  username: string | null;
}) => [user.id, user.email ?? "", user.username ?? ""].map((value) => value.toLowerCase());

async function listAllAuthUsers(
  dependencies: AdminUserServiceDependencies,
) {
  const admin = dependencies.createSupabaseAdminClient();
  const users: User[] = [];

  for (let page = 1; page <= AUTH_LIST_USERS_MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: AUTH_LIST_USERS_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const pageUsers = data.users ?? [];
    users.push(...pageUsers);

    if (pageUsers.length < AUTH_LIST_USERS_PAGE_SIZE) {
      break;
    }
  }

  return users;
}

export async function listAdminUsers(
  filters: AdminUserListFilters,
  dependencies: AdminUserServiceDependencies = adminUserServiceDependencies,
) {
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const search = normalizeSearch(filters.q)?.toLowerCase();
  const accessStatusFilter = filters.accessStatus
    ? parseUserAccessStatus(filters.accessStatus, "accessStatus")
    : undefined;
  const authUsers = await listAllAuthUsers(dependencies);
  const userIds = authUsers.map((user) => user.id);
  const admin = dependencies.createSupabaseAdminClient();

  const profilesById = new Map<
    string,
    {
      id: string;
      username: string | null;
      access_status?: UserAccessStatus;
    }
  >();

  if (userIds.length > 0) {
    const { data, error } = await admin
      .from("profiles")
      .select("id,username,access_status")
      .in("id", userIds);

    if (error) {
      throw new Error(`Failed to list user profiles: ${error.message}`);
    }

    for (const row of (data ?? []) as Array<{
      id: string;
      username: string | null;
      access_status?: UserAccessStatus;
    }>) {
      profilesById.set(row.id, row);
    }
  }

  const rows = authUsers
    .map<AdminUserListItem>((user) => {
      const profile = profilesById.get(user.id);
      return {
        userId: user.id,
        email: user.email ?? null,
        username: profile?.username ?? null,
        accessStatus: profile?.access_status ?? DEFAULT_ADMIN_ACCESS_STATUS,
        createdAt: user.created_at,
      };
    })
    .filter((row) => {
      if (accessStatusFilter && row.accessStatus !== accessStatusFilter) {
        return false;
      }
      if (!search) return true;
      return getAdminUserSearchTerms({
        id: row.userId,
        email: row.email,
        username: row.username,
      }).some((value) => value.includes(search));
    })
    .sort((lhs, rhs) => new Date(rhs.createdAt).getTime() - new Date(lhs.createdAt).getTime());

  const total = rows.length;
  const from = (page - 1) * pageSize;

  return {
    rows: rows.slice(from, from + pageSize),
    total,
    page,
    pageSize,
  };
}

export async function updateAdminUserAccessStatus(
  params: {
    userId: string;
    accessStatus: UserAccessStatus;
  },
  dependencies: AdminUserServiceDependencies = adminUserServiceDependencies,
) {
  const userId = params.userId.trim();
  if (!userId) {
    throw new ValidationError("userId is required.");
  }

  const accessStatus = parseUserAccessStatus(params.accessStatus);
  const admin = dependencies.createSupabaseAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .update({ access_status: accessStatus } as never)
    .eq("id", userId)
    .select("id,username,access_status")
    .maybeSingle<{
      id: string;
      username: string | null;
      access_status?: UserAccessStatus;
    }>();

  if (error) {
    throw new Error(`Failed to update access status: ${error.message}`);
  }

  if (!data) {
    throw new NotFoundError("User profile not found.");
  }

  return {
    userId: data.id,
    username: data.username,
    accessStatus: data.access_status ?? DEFAULT_ADMIN_ACCESS_STATUS,
  };
}
