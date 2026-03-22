import { ParsedScene } from "@/lib/types/scene-parser";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSceneRecordBySlug } from "@/lib/server/scene/service";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { ChunkRow, UserChunkRow, UserPhraseRow } from "@/lib/server/db/types";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";

export type RecommendationReasonCode =
  | "useful_chunk"
  | "not_saved_yet"
  | "fits_current_scene"
  | "seen_not_saved"
  | "good_for_review";

interface ScenePhraseCandidate {
  text: string;
  normalizedText: string;
  translation: string | null;
  sourceSentenceIndex: number | null;
  sourceSentenceText: string | null;
  sourceChunkText: string;
}

interface RecommendationUserContext {
  userPhraseByNormalized: Map<string, Pick<UserPhraseRow, "review_status" | "status">>;
  userChunkByNormalized: Map<
    string,
    Pick<UserChunkRow, "encounter_count" | "practice_count" | "mastery_score" | "status">
  >;
}

export interface RecommendedPhraseItem {
  text: string;
  normalizedText: string;
  translation: string | null;
  sourceSentenceIndex: number | null;
  sourceSentenceText: string | null;
  sourceChunkText: string;
  reasonCode: RecommendationReasonCode;
  reasonCodes: RecommendationReasonCode[];
  alreadySaved: boolean;
  alreadyMastered: boolean;
  score: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const stopwordSet = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "and",
  "or",
  "for",
  "on",
  "in",
  "at",
  "it",
  "is",
  "are",
]);

const looksLikeUsefulChunk = (text: string) => {
  const normalized = normalizePhraseText(text);
  if (!normalized) return false;
  const words = normalized.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 8) return false;
  if (normalized.length < 4 || normalized.length > 64) return false;
  if (words.length === 1 && stopwordSet.has(words[0])) return false;
  return true;
};

const extractScenePhraseCandidates = (scene: ParsedScene): ScenePhraseCandidate[] => {
  const normalizedScene = normalizeParsedSceneDialogue(scene);
  const uniqueByNormalized = new Map<string, ScenePhraseCandidate>();
  let sentenceIndex = 0;

  for (const section of normalizedScene.sections ?? []) {
    for (const block of section.blocks ?? []) {
      for (const sentence of block.sentences ?? []) {
        for (const chunk of sentence.chunks ?? []) {
          const text = chunk?.text?.trim();
          if (!text) continue;
          const normalizedText = normalizePhraseText(text);
          if (!normalizedText) continue;
          if (!looksLikeUsefulChunk(text)) continue;
          if (uniqueByNormalized.has(normalizedText)) continue;

          uniqueByNormalized.set(normalizedText, {
            text,
            normalizedText,
            translation: chunk.translation?.trim() || null,
            sourceSentenceIndex: sentenceIndex,
            sourceSentenceText: sentence.text?.trim() || null,
            sourceChunkText: text,
          });
        }
        sentenceIndex += 1;
      }
    }
  }

  return Array.from(uniqueByNormalized.values());
};

export const scoreScenePhraseCandidate = (
  userContext: RecommendationUserContext,
  candidate: ScenePhraseCandidate,
) => {
  let score = 50;
  const reasonCodes: RecommendationReasonCode[] = [];
  const words = candidate.normalizedText.split(" ").filter(Boolean);
  const userPhrase = userContext.userPhraseByNormalized.get(candidate.normalizedText);
  const userChunk = userContext.userChunkByNormalized.get(candidate.normalizedText);

  const alreadySaved = Boolean(userPhrase && userPhrase.review_status !== "archived");
  const alreadyMastered = userPhrase?.review_status === "mastered";

  if (alreadyMastered) score -= 100;
  else if (alreadySaved) score -= 80;

  if (words.length >= 2 && words.length <= 5) score += 12;
  else if (words.length <= 8) score += 4;
  else score -= 10;

  if (candidate.translation) score += 2;
  if (candidate.text.includes("'") || candidate.text.includes("-")) score += 2;

  if (userChunk) {
    const encounter = userChunk.encounter_count ?? 0;
    const practice = userChunk.practice_count ?? 0;
    const mastery = Number(userChunk.mastery_score ?? 0);
    if (userChunk.status === "familiar" || practice >= 8 || mastery >= 80) {
      score -= 30;
    } else if (encounter > 0 && practice < 4) {
      score += 10;
      reasonCodes.push("seen_not_saved");
    } else if (encounter === 0) {
      score += 6;
    }
    if (practice > 0 && practice <= 2) {
      reasonCodes.push("good_for_review");
    }
  } else {
    score += 8;
  }

  reasonCodes.push("useful_chunk", "fits_current_scene");
  if (!alreadySaved) reasonCodes.push("not_saved_yet");

  return {
    score,
    reasonCodes: Array.from(new Set(reasonCodes)),
    alreadySaved,
    alreadyMastered,
  };
};

const loadUserPhraseContext = async (userId: string, normalizedTexts: string[]) => {
  if (normalizedTexts.length === 0) return new Map<string, Pick<UserPhraseRow, "review_status" | "status">>();
  const admin = createSupabaseAdminClient();

  const { data: phraseRows, error: phraseError } = await admin
    .from("phrases")
    .select("id,normalized_text")
    .in("normalized_text", normalizedTexts);
  if (phraseError) {
    throw new Error(`Failed to read phrases for recommendations: ${phraseError.message}`);
  }

  const normalizedByPhraseId = new Map<string, string>();
  for (const row of (phraseRows ?? []) as Array<{ id: string; normalized_text: string }>) {
    normalizedByPhraseId.set(row.id, row.normalized_text);
  }
  const phraseIds = Array.from(normalizedByPhraseId.keys());
  if (phraseIds.length === 0) return new Map<string, Pick<UserPhraseRow, "review_status" | "status">>();

  const { data: userPhraseRows, error: userPhraseError } = await admin
    .from("user_phrases")
    .select("phrase_id,status,review_status")
    .eq("user_id", userId)
    .in("phrase_id", phraseIds);
  if (userPhraseError) {
    throw new Error(`Failed to read user_phrases for recommendations: ${userPhraseError.message}`);
  }

  const result = new Map<string, Pick<UserPhraseRow, "review_status" | "status">>();
  for (const row of
    (userPhraseRows ?? []) as Array<{
      phrase_id: string;
      status: UserPhraseRow["status"];
      review_status: UserPhraseRow["review_status"];
    }>) {
    const normalized = normalizedByPhraseId.get(row.phrase_id);
    if (!normalized) continue;
    result.set(normalized, {
      status: row.status,
      review_status: row.review_status,
    });
  }
  return result;
};

const loadUserChunkContext = async (userId: string, normalizedTexts: string[]) => {
  if (normalizedTexts.length === 0) {
    return new Map<
      string,
      Pick<UserChunkRow, "encounter_count" | "practice_count" | "mastery_score" | "status">
    >();
  }
  const admin = createSupabaseAdminClient();
  const { data: chunkRows, error: chunkError } = await admin
    .from("chunks")
    .select("id,normalized_text")
    .in("normalized_text", normalizedTexts);
  if (chunkError) {
    throw new Error(`Failed to read chunks for recommendations: ${chunkError.message}`);
  }

  const normalizedByChunkId = new Map<string, string>();
  for (const row of (chunkRows ?? []) as Array<Pick<ChunkRow, "id" | "normalized_text">>) {
    normalizedByChunkId.set(row.id, row.normalized_text);
  }
  const chunkIds = Array.from(normalizedByChunkId.keys());
  if (chunkIds.length === 0) {
    return new Map<
      string,
      Pick<UserChunkRow, "encounter_count" | "practice_count" | "mastery_score" | "status">
    >();
  }

  const { data: userChunkRows, error: userChunkError } = await admin
    .from("user_chunks")
    .select("chunk_id,encounter_count,practice_count,mastery_score,status")
    .eq("user_id", userId)
    .in("chunk_id", chunkIds);
  if (userChunkError) {
    throw new Error(`Failed to read user_chunks for recommendations: ${userChunkError.message}`);
  }

  const result = new Map<
    string,
    Pick<UserChunkRow, "encounter_count" | "practice_count" | "mastery_score" | "status">
  >();
  for (const row of
    (userChunkRows ?? []) as Array<{
      chunk_id: string;
      encounter_count: number;
      practice_count: number;
      mastery_score: number;
      status: UserChunkRow["status"];
    }>) {
    const normalized = normalizedByChunkId.get(row.chunk_id);
    if (!normalized) continue;
    result.set(normalized, {
      encounter_count: row.encounter_count,
      practice_count: row.practice_count,
      mastery_score: row.mastery_score,
      status: row.status,
    });
  }
  return result;
};

export async function getRecommendedPhrasesForScene(
  userId: string,
  sceneSlug: string,
  params?: { limit?: number },
) {
  const scene = await getSceneRecordBySlug({ slug: sceneSlug, userId });
  if (!scene) return [];

  const candidates = extractScenePhraseCandidates(scene.row.scene_json as ParsedScene);
  if (candidates.length === 0) return [];

  const normalizedTexts = candidates.map((candidate) => candidate.normalizedText);
  const [userPhraseByNormalized, userChunkByNormalized] = await Promise.all([
    loadUserPhraseContext(userId, normalizedTexts),
    loadUserChunkContext(userId, normalizedTexts),
  ]);
  const context: RecommendationUserContext = {
    userPhraseByNormalized,
    userChunkByNormalized,
  };

  const scored = candidates
    .map((candidate) => {
      const scoredCandidate = scoreScenePhraseCandidate(context, candidate);
      return {
        ...candidate,
        ...scoredCandidate,
      };
    })
    .filter((item) => !item.alreadySaved && !item.alreadyMastered)
    .filter((item) => item.score > 25)
    .sort((a, b) => b.score - a.score);

  const limit = clamp(params?.limit ?? 3, 1, 5);
  return scored.slice(0, limit).map((item): RecommendedPhraseItem => ({
    text: item.text,
    normalizedText: item.normalizedText,
    translation: item.translation,
    sourceSentenceIndex: item.sourceSentenceIndex,
    sourceSentenceText: item.sourceSentenceText,
    sourceChunkText: item.sourceChunkText,
    reasonCode: item.reasonCodes[0] ?? "useful_chunk",
    reasonCodes: item.reasonCodes,
    alreadySaved: item.alreadySaved,
    alreadyMastered: item.alreadyMastered,
    score: item.score,
  }));
}
