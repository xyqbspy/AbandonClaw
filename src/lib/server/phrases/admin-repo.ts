import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PhraseRow, UserPhraseRow } from "@/lib/server/db/types";

export interface EnsureSharedPhraseInput {
  normalizedText: string;
  displayText: string;
  translation: string | null;
  usageNote: string | null;
  difficulty: string | null;
  tags: string[];
}

export interface UserPhraseWithSharedPhraseRow extends UserPhraseRow {
  phrase: PhraseRow | null;
}

export async function ensureSharedPhraseEntity(input: EnsureSharedPhraseInput) {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: findError } = await admin
    .from("phrases")
    .select("*")
    .eq("normalized_text", input.normalizedText)
    .maybeSingle<PhraseRow>();

  if (findError) {
    throw new Error(`Failed to find phrase: ${findError.message}`);
  }
  if (existing) return existing;

  const insertPayload = {
    normalized_text: input.normalizedText,
    display_text: input.displayText,
    translation: input.translation,
    usage_note: input.usageNote,
    difficulty: input.difficulty,
    tags: input.tags,
  };

  const { data: inserted, error: insertError } = await admin
    .from("phrases")
    .insert(insertPayload as never)
    .select("*")
    .single<PhraseRow>();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raceWinner, error: raceReadError } = await admin
        .from("phrases")
        .select("*")
        .eq("normalized_text", input.normalizedText)
        .single<PhraseRow>();
      if (raceReadError || !raceWinner) {
        throw new Error(
          `Failed to resolve phrase upsert race: ${raceReadError?.message ?? "unknown error"}`,
        );
      }
      return raceWinner;
    }
    throw new Error(`Failed to create phrase: ${insertError.message}`);
  }

  return inserted;
}

export async function getUserPhraseForAiEnrichment(params: {
  userId: string;
  userPhraseId: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_phrases")
    .select("*, phrase:phrases(*)")
    .eq("id", params.userPhraseId)
    .eq("user_id", params.userId)
    .maybeSingle<UserPhraseWithSharedPhraseRow>();

  if (error) {
    throw new Error(`Failed to read user phrase for enrichment: ${error.message}`);
  }

  return data;
}

export async function markUserPhraseAiEnrichmentPending(params: {
  userId: string;
  userPhraseId: string;
  lastSeenAt: string;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_phrases")
    .update({
      ai_enrichment_status: "pending",
      ai_enrichment_error: null,
      last_seen_at: params.lastSeenAt,
    } as never)
    .eq("id", params.userPhraseId)
    .eq("user_id", params.userId);

  if (error) {
    throw new Error(`Failed to mark enrichment pending: ${error.message}`);
  }
}

export async function updateSharedPhraseLearningInfo(params: {
  phraseId: string;
  translation: string | null;
  usageNote: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("phrases")
    .update({
      translation: params.translation,
      usage_note: params.usageNote,
    } as never)
    .eq("id", params.phraseId);

  if (error) {
    throw new Error(`Failed to update phrase learning info: ${error.message}`);
  }
}

export async function completeUserPhraseAiEnrichment(params: {
  userId: string;
  userPhraseId: string;
  sourceSentenceText: string | null;
  exampleSentences: Array<{ en: string; zh: string }>;
  semanticFocus: string | null;
  typicalScenario: string | null;
  lastSeenAt: string;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_phrases")
    .update({
      source_sentence_text: params.sourceSentenceText,
      ai_example_sentences: params.exampleSentences,
      ai_semantic_focus: params.semanticFocus,
      ai_typical_scenario: params.typicalScenario,
      ai_enrichment_status: "done",
      ai_enrichment_error: null,
      last_seen_at: params.lastSeenAt,
    } as never)
    .eq("id", params.userPhraseId)
    .eq("user_id", params.userId);

  if (error) {
    throw new Error(`Failed to write enrichment result: ${error.message}`);
  }
}

export async function failUserPhraseAiEnrichment(params: {
  userId: string;
  userPhraseId: string;
  message: string;
  lastSeenAt: string;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_phrases")
    .update({
      ai_enrichment_status: "failed",
      ai_enrichment_error: params.message.slice(0, 300),
      last_seen_at: params.lastSeenAt,
    } as never)
    .eq("id", params.userPhraseId)
    .eq("user_id", params.userId);

  if (error) {
    throw new Error(
      `Enrichment failed and failed status could not be saved: ${error.message}`,
    );
  }
}
