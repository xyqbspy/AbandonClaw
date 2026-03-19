import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ChunkRow, UserChunkRow, UserChunkStatus } from "@/lib/server/db/types";
import { normalizeChunkText } from "@/lib/shared/chunks";
import { listUserSavedPhraseTextsByNormalized } from "@/lib/server/phrases/service";
import { ParsedScene } from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";

const nowIso = () => new Date().toISOString();

const STATUS_RANK: Record<UserChunkStatus, number> = {
  encountered: 1,
  practiced: 2,
  familiar: 3,
};

const chooseHigherStatus = (
  current: UserChunkStatus | null | undefined,
  next: UserChunkStatus,
): UserChunkStatus => {
  const currentRank = current ? STATUS_RANK[current] : 0;
  return currentRank >= STATUS_RANK[next] ? current ?? next : next;
};

const toChunkStatusByInteraction = (
  interactionType: ChunkInteractionType,
): UserChunkStatus =>
  interactionType === "encounter" ? "encountered" : "practiced";

const toMasteryDelta = (interactionType: ChunkInteractionType) => {
  if (interactionType === "practice") return 1;
  if (interactionType === "favorite") return 1.2;
  return 0.2;
};

const coerceFiniteInt = (value: number, fallback = 0) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

const chunkTextLooksRelatedToTheme = (chunkText: string, themeHint?: string) => {
  if (!themeHint) return false;
  const terms = themeHint
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 3)
    .slice(0, 8);
  if (terms.length === 0) return false;
  const normalized = normalizeChunkText(chunkText);
  return terms.some((term) => normalized.includes(term));
};

const calcRecencyScore = (iso?: string | null) => {
  if (!iso) return 0;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return 0;
  const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  if (days <= 3) return 6;
  if (days <= 14) return 3;
  if (days <= 30) return 1.5;
  return 0.5;
};

export type ChunkInteractionType = "encounter" | "practice" | "favorite";

export interface TrackChunksForUserInput {
  sceneSlug?: string;
  sceneId?: string;
  sentenceIndex?: number;
  sentenceText?: string;
  chunks: string[];
  interactionType?: ChunkInteractionType;
}

export interface UserChunkCandidate {
  text: string;
  normalizedText: string;
  score: number;
  practiceCount: number;
  encounterCount: number;
  lastPracticedAt: string | null;
  lastSeenAt: string;
  isFavoritedPhrase: boolean;
}

const sanitizeChunkTexts = (texts: string[]) => {
  const normalizedToDisplay = new Map<string, string>();
  for (const rawText of texts) {
    if (typeof rawText !== "string") continue;
    const display = rawText.trim();
    if (!display) continue;
    const normalized = normalizeChunkText(display);
    if (!normalized) continue;
    if (!normalizedToDisplay.has(normalized)) {
      normalizedToDisplay.set(normalized, display);
    }
  }
  return normalizedToDisplay;
};

const resolveDesiredStatus = (
  existing: UserChunkRow | undefined,
  interactionType: ChunkInteractionType,
  nextPracticeCount: number,
) => {
  const baseline = chooseHigherStatus(existing?.status, toChunkStatusByInteraction(interactionType));
  if (baseline === "familiar") return baseline;
  return nextPracticeCount >= 8 ? "familiar" : baseline;
};

const getSourceSceneInput = (input: TrackChunksForUserInput) => ({
  source_scene_id: input.sceneId ?? null,
  source_scene_slug: input.sceneSlug ?? null,
  source_sentence_index:
    typeof input.sentenceIndex === "number" && Number.isFinite(input.sentenceIndex)
      ? Math.max(0, Math.floor(input.sentenceIndex))
      : null,
  source_sentence_text:
    typeof input.sentenceText === "string" && input.sentenceText.trim()
      ? input.sentenceText.trim().slice(0, 3000)
      : null,
});

async function ensureChunkRows(normalizedToDisplay: Map<string, string>) {
  const normalizedTexts = Array.from(normalizedToDisplay.keys());
  if (normalizedTexts.length === 0) return new Map<string, ChunkRow>();

  const admin = createSupabaseAdminClient();
  const { data: existingRows, error: findError } = await admin
    .from("chunks")
    .select("*")
    .in("normalized_text", normalizedTexts);
  if (findError) {
    throw new Error(`Failed to read chunks: ${findError.message}`);
  }

  const rowMap = new Map<string, ChunkRow>();
  for (const row of (existingRows ?? []) as ChunkRow[]) {
    rowMap.set(row.normalized_text, row);
  }

  const missingRows = normalizedTexts
    .filter((normalizedText) => !rowMap.has(normalizedText))
    .map((normalizedText) => ({
      normalized_text: normalizedText,
      display_text: normalizedToDisplay.get(normalizedText) ?? normalizedText,
      chunk_type: "chunk",
    }));

  if (missingRows.length > 0) {
    const { error: insertError } = await admin
      .from("chunks")
      .upsert(missingRows as never, { onConflict: "normalized_text" });
    if (insertError) {
      throw new Error(`Failed to upsert chunks: ${insertError.message}`);
    }

    const { data: allRows, error: refetchError } = await admin
      .from("chunks")
      .select("*")
      .in("normalized_text", normalizedTexts);
    if (refetchError) {
      throw new Error(`Failed to refetch chunks: ${refetchError.message}`);
    }
    for (const row of (allRows ?? []) as ChunkRow[]) {
      rowMap.set(row.normalized_text, row);
    }
  }

  return rowMap;
}

export async function trackChunksForUser(userId: string, input: TrackChunksForUserInput) {
  const interactionType = input.interactionType ?? "encounter";
  const normalizedToDisplay = sanitizeChunkTexts(input.chunks);

  if (normalizedToDisplay.size === 0) {
    return {
      tracked: 0,
      interactionType,
      chunkIds: [] as string[],
    };
  }

  const chunkRowsByNormalized = await ensureChunkRows(normalizedToDisplay);
  const chunkRows = Array.from(chunkRowsByNormalized.values());
  if (chunkRows.length === 0) {
    return {
      tracked: 0,
      interactionType,
      chunkIds: [] as string[],
    };
  }

  const admin = createSupabaseAdminClient();
  const chunkIds = chunkRows.map((row) => row.id);
  const { data: existingRows, error: existingError } = await admin
    .from("user_chunks")
    .select("*")
    .eq("user_id", userId)
    .in("chunk_id", chunkIds);
  if (existingError) {
    throw new Error(`Failed to read user_chunks: ${existingError.message}`);
  }

  const existingByChunkId = new Map<string, UserChunkRow>();
  for (const row of (existingRows ?? []) as UserChunkRow[]) {
    existingByChunkId.set(row.chunk_id, row);
  }

  const now = nowIso();
  const sourceScene = getSourceSceneInput(input);
  const rowsToUpsert = chunkRows.map((chunkRow) => {
    const existing = existingByChunkId.get(chunkRow.id);
    const encounterCount = coerceFiniteInt(existing?.encounter_count ?? 0) + 1;
    const practiceDelta = interactionType === "encounter" ? 0 : 1;
    const practiceCount = coerceFiniteInt(existing?.practice_count ?? 0) + practiceDelta;
    const masteryScore = Number(existing?.mastery_score ?? 0) + toMasteryDelta(interactionType);
    const status = resolveDesiredStatus(existing, interactionType, practiceCount);

    return {
      user_id: userId,
      chunk_id: chunkRow.id,
      status,
      encounter_count: encounterCount,
      practice_count: practiceCount,
      mastery_score: Math.min(100, Number(masteryScore.toFixed(2))),
      first_seen_at: existing?.first_seen_at ?? now,
      last_seen_at: now,
      last_practiced_at:
        interactionType === "encounter"
          ? existing?.last_practiced_at ?? null
          : now,
      source_scene_id: sourceScene.source_scene_id ?? existing?.source_scene_id ?? null,
      source_scene_slug: sourceScene.source_scene_slug ?? existing?.source_scene_slug ?? null,
      source_sentence_index:
        sourceScene.source_sentence_index ?? existing?.source_sentence_index ?? null,
      source_sentence_text:
        sourceScene.source_sentence_text ?? existing?.source_sentence_text ?? null,
    };
  });

  const { error: upsertError } = await admin
    .from("user_chunks")
    .upsert(rowsToUpsert as never, { onConflict: "user_id,chunk_id" });
  if (upsertError) {
    throw new Error(`Failed to upsert user_chunks: ${upsertError.message}`);
  }

  return {
    tracked: rowsToUpsert.length,
    interactionType,
    chunkIds,
  };
}

export async function getUserChunkCandidatesForSceneMutation(
  userId: string,
  input?: {
    sceneSlug?: string;
    themeHint?: string;
    limit?: number;
  },
) {
  const limit = Math.min(40, Math.max(3, Math.floor(input?.limit ?? 16)));
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("user_chunks")
    .select("*, chunk:chunks(*)")
    .eq("user_id", userId)
    .order("practice_count", { ascending: false })
    .order("last_practiced_at", { ascending: false, nullsFirst: false })
    .limit(limit * 5);
  if (error) {
    throw new Error(`Failed to read user chunk candidates: ${error.message}`);
  }

  const rows = (data ?? []) as Array<UserChunkRow & { chunk: ChunkRow | null }>;
  if (rows.length === 0) return [] as UserChunkCandidate[];

  const normalizedTexts = rows
    .map((row) => row.chunk?.normalized_text ?? "")
    .filter(Boolean);
  const savedTexts = new Set(
    await listUserSavedPhraseTextsByNormalized(userId, normalizedTexts),
  );

  const candidates = rows
    .map((row): UserChunkCandidate | null => {
      const chunk = row.chunk;
      if (!chunk?.display_text || !chunk.normalized_text) return null;

      const isFavoritedPhrase = savedTexts.has(chunk.normalized_text);
      const statusBonus =
        row.status === "familiar" ? 5 : row.status === "practiced" ? 2 : 0;
      const favoriteBonus = isFavoritedPhrase ? 8 : 0;
      const practiceScore = Math.min(20, coerceFiniteInt(row.practice_count)) * 3;
      const encounterScore = Math.min(20, coerceFiniteInt(row.encounter_count));
      const recencyScore = Math.max(
        calcRecencyScore(row.last_practiced_at),
        calcRecencyScore(row.last_seen_at),
      );
      const themeBonus = chunkTextLooksRelatedToTheme(chunk.display_text, input?.themeHint)
        ? 2
        : 0;

      const score =
        practiceScore +
        encounterScore +
        statusBonus +
        favoriteBonus +
        recencyScore +
        themeBonus;

      return {
        text: chunk.display_text,
        normalizedText: chunk.normalized_text,
        score,
        practiceCount: coerceFiniteInt(row.practice_count),
        encounterCount: coerceFiniteInt(row.encounter_count),
        lastPracticedAt: row.last_practiced_at,
        lastSeenAt: row.last_seen_at,
        isFavoritedPhrase,
      };
    })
    .filter((item): item is UserChunkCandidate => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return candidates;
}

export async function listUserChunks(params: {
  userId: string;
  page?: number;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await admin
    .from("user_chunks")
    .select("*, chunk:chunks(*)", { count: "exact" })
    .eq("user_id", params.userId)
    .order("last_seen_at", { ascending: false })
    .range(from, to);
  if (error) {
    throw new Error(`Failed to list user_chunks: ${error.message}`);
  }

  const rows = (data ?? []) as Array<UserChunkRow & { chunk: ChunkRow | null }>;
  return {
    rows,
    total: count ?? 0,
    page,
    limit,
  };
}

export const extractChunkTextsFromParsedScene = (scene: ParsedScene) => {
  const normalized = normalizeParsedSceneDialogue(scene);
  const collected: string[] = [];
  for (const line of normalized.dialogue ?? []) {
    for (const chunk of line.chunks ?? []) {
      if (chunk?.text && chunk.text.trim()) {
        collected.push(chunk.text.trim());
      }
    }
  }
  return Array.from(new Set(collected));
};
