import {
  buildStableCacheKey,
  getAiCacheByKey,
  hashPayload,
  setAiCache,
} from "@/lib/server/ai-cache/service";
import { ValidationError } from "@/lib/server/errors";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildSceneGenerateUserPrompt,
  SCENE_GENERATE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/scene-generate-prompt";
import { parseJsonWithFallback } from "@/lib/server/scene-json";
import { parseImportedSceneWithCache } from "@/lib/server/scene/import";
import { createImportedScene } from "@/lib/server/scene/service";
import { getUserChunkCandidatesForSceneMutation } from "@/lib/server/chunks/service";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { ParsedScene } from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";

const SCENE_GENERATE_PROMPT_VERSION = "scene-generate-v2-turn-first";
const DEFAULT_SENTENCE_COUNT = 10;
const MAX_RELATED_VARIANTS = 2;

interface RelatedChunkVariant {
  text: string;
  differenceLabel: string;
  knownChunkText: string | null;
}

interface GeneratedSceneDraftSentence {
  text: string;
  translation: string;
  tts?: string;
}

interface GeneratedSceneDraftTurn {
  speaker: string;
  translation?: string;
  tts?: string;
  sentences: GeneratedSceneDraftSentence[];
}

interface GeneratedSceneDraft {
  version: "v1";
  title: string;
  theme?: string;
  turns: GeneratedSceneDraftTurn[];
}

export interface GeneratePersonalizedSceneInput {
  promptText: string;
  tone?: string;
  difficulty?: "easy" | "medium";
  sentenceCount?: number;
  reuseKnownChunks?: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toOptionalTrimmed = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
};

const hasChinese = (value: string) => /[\u4e00-\u9fff]/.test(value);

const normalizeGeneratedSceneTitle = (title: string | undefined, promptText: string) => {
  const baseTitle = toOptionalTrimmed(title, 90) ?? "Daily Conversation";
  if (hasChinese(baseTitle)) return baseTitle;

  const promptFirstLine = promptText.split(/\r?\n/)[0]?.trim() ?? "";
  const zhHint = hasChinese(promptFirstLine)
    ? promptFirstLine.replace(/[。！？?]+$/g, "").slice(0, 16)
    : "场景练习";
  return `${baseTitle}（${zhHint || "场景练习"}）`;
};

const normalizeSentenceCount = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_SENTENCE_COUNT;
  }
  return clamp(Math.round(value), 6, 14);
};

const normalizeTone = (value: unknown) => {
  const tone = toOptionalTrimmed(value, 40);
  if (!tone) return undefined;
  if (tone === "natural" || tone === "polite" || tone === "casual" || tone === "simple") {
    return tone;
  }
  return "natural";
};

const normalizeDifficulty = (value: unknown) => {
  if (value === "easy" || value === "medium") return value;
  return "medium";
};

const toShortDifferenceLabel = (value: unknown) => {
  if (typeof value !== "string") return "similar nuance";
  const trimmed = value.trim();
  if (!trimmed) return "similar nuance";
  return trimmed.slice(0, 36);
};

const isContrastDerivedExpression = (sourceNote: string | null | undefined) => {
  const normalized = (sourceNote ?? "").trim().toLowerCase();
  return normalized === "manual-contrast-ai" || normalized === "focus-contrast-ai";
};

const sceneTextContainsExpression = (sceneText: string, expressionText: string) => {
  const normalizedScene = normalizePhraseText(sceneText);
  const normalizedExpression = normalizePhraseText(expressionText);
  if (!normalizedScene || !normalizedExpression) return false;
  return normalizedScene.includes(normalizedExpression);
};

const isDraftSentence = (value: unknown): value is GeneratedSceneDraftSentence => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.text === "string" &&
    row.text.trim().length > 0 &&
    typeof row.translation === "string" &&
    row.translation.trim().length > 0
  );
};

const isDraftTurn = (value: unknown): value is GeneratedSceneDraftTurn => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (typeof row.speaker !== "string" || !row.speaker.trim()) return false;
  if (!Array.isArray(row.sentences)) return false;
  if (row.sentences.length === 0 || row.sentences.length > 3) return false;
  return row.sentences.every(isDraftSentence);
};

const isGeneratedSceneDraft = (value: unknown): value is GeneratedSceneDraft => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (row.version !== "v1") return false;
  if (typeof row.title !== "string" || !row.title.trim()) return false;
  if (!Array.isArray(row.turns) || row.turns.length === 0) return false;
  if (!row.turns.every(isDraftTurn)) return false;
  const sentenceCount = row.turns.reduce(
    (sum, turn) => sum + turn.sentences.length,
    0,
  );
  return sentenceCount >= 6 && sentenceCount <= 14;
};

const toDraftSourceText = (draft: GeneratedSceneDraft) =>
  draft.turns
    .flatMap((turn) =>
      turn.sentences.map((sentence) => `${turn.speaker.trim().toUpperCase()}: ${sentence.text.trim()}`),
    )
    .join("\n");

export const mergeDraftDialogueIntoParsedScene = (
  parsedScene: ParsedScene,
  draft: GeneratedSceneDraft | null,
) => {
  const normalized = normalizeParsedSceneDialogue(parsedScene);
  if (!draft) return normalized;

  const parsedSentences = normalized.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => block.sentences);

  let sentenceCursor = 0;
  const nextBlocks = draft.turns.map((turn, turnIndex) => {
    const sentences = turn.sentences.map((draftSentence, sentenceIndex) => {
      const parsedSentence = parsedSentences[sentenceCursor];
      sentenceCursor += 1;
      return {
        id: parsedSentence?.id || `sentence-${turnIndex + 1}-${sentenceIndex + 1}`,
        text: draftSentence.text.trim(),
        translation: draftSentence.translation.trim(),
        tts: (draftSentence.tts?.trim() || draftSentence.text).trim(),
        chunks: parsedSentence?.chunks ?? [],
      };
    });

    return {
      id: `block-${turnIndex + 1}`,
      type: "dialogue" as const,
      speaker: turn.speaker.trim().toUpperCase(),
      translation:
        turn.translation?.trim() ||
        sentences
          .map((sentence) => sentence.translation.trim())
          .filter(Boolean)
          .join(" "),
      tts:
        turn.tts?.trim() ||
        sentences
          .map((sentence) => sentence.tts?.trim() || sentence.text)
          .filter(Boolean)
          .join(" "),
      sentences,
    };
  });

  return normalizeParsedSceneDialogue({
    ...normalized,
    type: "dialogue",
    title: draft.title.trim() || normalized.title,
    sections: [
      {
        id: normalized.sections[0]?.id || "section-1",
        title: normalized.sections[0]?.title,
        summary: normalized.sections[0]?.summary,
        blocks: nextBlocks,
      },
    ],
  });
};

const getPromptFromCache = (cacheOutput: unknown) => {
  if (!cacheOutput || typeof cacheOutput !== "object") return null;
  const row = cacheOutput as Record<string, unknown>;
  if (typeof row.generatedSourceText !== "string" || !row.generatedSourceText.trim()) {
    return null;
  }
  return {
    generatedSourceText: row.generatedSourceText.trim(),
    generatedTitle:
      typeof row.generatedTitle === "string" && row.generatedTitle.trim()
        ? row.generatedTitle.trim()
        : undefined,
    generatedTheme:
      typeof row.generatedTheme === "string" && row.generatedTheme.trim()
        ? row.generatedTheme.trim()
        : undefined,
    generatedDialogueDraft: isGeneratedSceneDraft(row.generatedDialogueDraft)
      ? row.generatedDialogueDraft
      : null,
    knownChunksUsed: Array.isArray(row.knownChunksUsed)
      ? row.knownChunksUsed.filter((item): item is string => typeof item === "string")
      : [],
  };
};

export async function getUserChunkCandidatesForSceneGeneration(
  userId: string,
  input: {
    promptText: string;
    limit?: number;
  },
) {
  return getUserChunkCandidatesForSceneMutation(userId, {
    themeHint: input.promptText,
    limit: input.limit ?? 16,
  });
}

async function getRelatedChunkVariantsForSceneGeneration(
  userId: string,
  knownChunks: string[],
): Promise<RelatedChunkVariant[]> {
  const knownNormalized = Array.from(
    new Set(knownChunks.map((text) => normalizePhraseText(text)).filter(Boolean)),
  );
  if (knownNormalized.length === 0) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_phrases")
    .select(
      "id, source_chunk_text, source_note, learning_item_type, ai_semantic_focus, phrase:phrases(display_text, normalized_text)",
    )
    .eq("user_id", userId)
    .eq("status", "saved")
    .order("last_seen_at", { ascending: false })
    .limit(320);
  if (error) {
    console.warn("[scene.generate] related variants lookup failed", {
      userId,
      message: error.message,
    });
    return [];
  }

  type PhraseShape = { display_text: string | null; normalized_text: string | null };
  type FamilyRow = {
    id: string;
    source_chunk_text: string | null;
    source_note: string | null;
    learning_item_type: "expression" | "sentence" | null;
    ai_semantic_focus: string | null;
    phrase: PhraseShape | PhraseShape[] | null;
  };
  const rows = ((data ?? []) as FamilyRow[]).filter(
    (row) => row.learning_item_type !== "sentence" && !isContrastDerivedExpression(row.source_note),
  );
  if (rows.length === 0) return [];

  const toPhrase = (value: FamilyRow["phrase"]): PhraseShape | null =>
    Array.isArray(value) ? (value[0] ?? null) : value;

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const knownSourceRows = rows.filter((row) => {
    const phrase = toPhrase(row.phrase);
    const normalized = normalizePhraseText(
      phrase?.normalized_text ?? phrase?.display_text ?? row.source_chunk_text ?? "",
    );
    return Boolean(normalized) && knownNormalized.includes(normalized);
  });
  if (knownSourceRows.length === 0) return [];

  const { data: relationRows, error: relationError } = await admin
    .from("user_phrase_relations")
    .select("source_user_phrase_id,target_user_phrase_id")
    .eq("user_id", userId)
    .eq("relation_type", "similar")
    .in("source_user_phrase_id", knownSourceRows.map((row) => row.id))
    .limit(320);
  if (relationError) {
    console.warn("[scene.generate] related similar relations lookup failed", {
      userId,
      message: relationError.message,
    });
    return [];
  }

  const knownSet = new Set(knownNormalized);
  const knownChunksByTargetId = new Map<string, string>();
  for (const relation of (relationRows ?? []) as Array<{
    source_user_phrase_id: string;
    target_user_phrase_id: string;
  }>) {
    const sourceRow = rowById.get(relation.source_user_phrase_id);
    const targetRow = rowById.get(relation.target_user_phrase_id);
    if (!sourceRow || !targetRow) continue;
    const sourcePhrase = toPhrase(sourceRow.phrase);
    const knownText = (sourcePhrase?.display_text ?? sourceRow.source_chunk_text ?? "").trim();
    if (!knownText || knownChunksByTargetId.has(targetRow.id)) continue;
    knownChunksByTargetId.set(targetRow.id, knownText);
  }
  if (knownChunksByTargetId.size === 0) return [];

  const variants: RelatedChunkVariant[] = [];
  const used = new Set<string>();
  for (const row of rows) {
    if (variants.length >= MAX_RELATED_VARIANTS) break;
    const knownChunkText = knownChunksByTargetId.get(row.id) ?? null;
    if (!knownChunkText) continue;

    const phrase = toPhrase(row.phrase);
    const text = (phrase?.display_text ?? row.source_chunk_text ?? "").trim();
    if (!text) continue;
    const normalized = normalizePhraseText(text);
    if (!normalized || knownSet.has(normalized) || used.has(normalized)) continue;

    variants.push({
      text,
      differenceLabel: toShortDifferenceLabel(row.ai_semantic_focus),
      knownChunkText,
    });
    used.add(normalized);
  }

  return variants;
}

export async function generatePersonalizedSceneForUser(
  userId: string,
  rawInput: GeneratePersonalizedSceneInput,
) {
  const runId = `sg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const promptText = toOptionalTrimmed(rawInput.promptText, 800);
  if (!promptText) {
    throw new ValidationError("promptText is required.");
  }

  const sentenceCount = normalizeSentenceCount(rawInput.sentenceCount);
  const tone = normalizeTone(rawInput.tone);
  const difficulty = normalizeDifficulty(rawInput.difficulty);
  const reuseKnownChunks = rawInput.reuseKnownChunks !== false;
  const model = process.env.GLM_MODEL ?? "glm-4.6";
  console.log("[scene.generate] start", {
    runId,
    userId,
    model,
    tone: tone ?? null,
    difficulty,
    sentenceCount,
    reuseKnownChunks,
  });

  const knownChunkCandidates = reuseKnownChunks
    ? await getUserChunkCandidatesForSceneGeneration(userId, {
        promptText,
        limit: 16,
      })
    : [];
  const knownChunks = knownChunkCandidates.map((item) => item.text).slice(0, 12);
  const relatedChunkVariants = reuseKnownChunks
    ? await getRelatedChunkVariantsForSceneGeneration(userId, knownChunks)
    : [];
  const knownChunksHash = knownChunks.length > 0 ? hashPayload(knownChunks) : null;
  const relatedChunkVariantsHash =
    relatedChunkVariants.length > 0 ? hashPayload(relatedChunkVariants) : null;

  const cacheKey = buildStableCacheKey("scene-generate", {
    cache_type: "scene_generate",
    userId,
    model,
    promptVersion: SCENE_GENERATE_PROMPT_VERSION,
    promptTextHash: hashPayload(promptText),
    tone: tone ?? null,
    difficulty,
    sentenceCount,
    reuseKnownChunks,
    knownChunksHash,
    relatedChunkVariantsHash,
  });

  console.log("[scene.generate] cache lookup", { runId, cacheKey });
  const cached = await getAiCacheByKey(cacheKey);
  let generatedSourceText: string;
  let generatedTitle: string | undefined;
  let generatedTheme: string | undefined;
  let generatedDialogueDraft: GeneratedSceneDraft | null = null;

  if (cached) {
    console.log("[scene.generate] cache hit", { runId, cacheKey });
    const cachedValue = getPromptFromCache(cached.output_json);
    if (cachedValue) {
      generatedSourceText = cachedValue.generatedSourceText;
      generatedTitle = cachedValue.generatedTitle;
      generatedTheme = cachedValue.generatedTheme;
      generatedDialogueDraft = cachedValue.generatedDialogueDraft;
    } else {
      generatedSourceText = "";
    }
  } else {
    console.log("[scene.generate] cache miss", { runId, cacheKey });
    generatedSourceText = "";
  }

  if (!generatedSourceText) {
    console.log("[scene.generate] calling glm", { runId, model, cacheKey });
    const glmStartMs = Date.now();
    const rawModelText = await callGlmChatCompletion({
      model,
      systemPrompt: SCENE_GENERATE_SYSTEM_PROMPT,
      userPrompt: buildSceneGenerateUserPrompt({
        promptText,
        tone,
        difficulty,
        sentenceCount,
        preferredKnownChunks: knownChunks,
        relatedChunkVariants,
        reuseKnownChunks,
      }),
      temperature: 0.35,
    });
    console.log("[scene.generate] glm returned", {
      runId,
      elapsedMs: Date.now() - glmStartMs,
      contentLength: rawModelText.length,
      contentPreview: rawModelText.slice(0, 200),
    });

    console.log("[scene.generate] parsing content", { runId });
    const parsed = parseJsonWithFallback(rawModelText);
    if (!isGeneratedSceneDraft(parsed)) {
      console.error("[scene.generate] parsed invalid", {
        runId,
        parsedType: typeof parsed,
        parsedPreview: JSON.stringify(parsed).slice(0, 400),
      });
      throw new Error("Generated scene draft JSON is invalid.");
    }
    generatedDialogueDraft = parsed;
    console.log("[scene.generate] parsed ok", {
      runId,
      title: parsed.title,
      turnCount: parsed.turns.length,
      sentenceCount: parsed.turns.reduce((sum, turn) => sum + turn.sentences.length, 0),
    });

    generatedSourceText = toDraftSourceText(parsed);
    generatedTitle = normalizeGeneratedSceneTitle(parsed.title, promptText);
    generatedTheme = toOptionalTrimmed(parsed.theme, 80);

    await setAiCache({
      cacheKey,
      cacheType: "scene_generate",
      status: "success",
      sourceRef: `user:${userId}`,
      inputHash: hashPayload({
        promptText,
        tone: tone ?? null,
        difficulty,
        sentenceCount,
        reuseKnownChunks,
        knownChunksHash,
        relatedChunkVariantsHash,
      }),
      inputJson: {
        promptText,
        tone: tone ?? null,
        difficulty,
        sentenceCount,
        reuseKnownChunks,
        relatedChunkVariants,
      },
      outputJson: {
        generatedSourceText,
        generatedTitle: generatedTitle ?? null,
        generatedTheme: generatedTheme ?? null,
        generatedDialogueDraft,
        knownChunksUsed: knownChunks,
        relatedChunkVariantsUsed: relatedChunkVariants,
      },
      metaJson: {
        promptVersion: SCENE_GENERATE_PROMPT_VERSION,
      },
      model,
      promptVersion: SCENE_GENERATE_PROMPT_VERSION,
      createdBy: userId,
    });
    console.log("[scene.generate] cache write ok", { runId, cacheKey });
  }

  console.log("[scene.generate] parse scene before", { runId, model });
  const parsed = await parseImportedSceneWithCache({
    sourceText: generatedSourceText,
    sourceLanguage: "en",
    userId,
    model,
  });
  console.log("[scene.generate] parse scene after", {
    runId,
    parseCacheKey: parsed.cacheKey,
    parseSource: parsed.source,
    parseCacheStatus: parsed.cacheStatus,
  });

  console.log("[scene.generate] inserting scene", { runId });
  const scenePayload = mergeDraftDialogueIntoParsedScene(
    parsed.parsedScene,
    generatedDialogueDraft,
  );
  const finalGeneratedTitle = normalizeGeneratedSceneTitle(generatedTitle, promptText);
  const scene = await createImportedScene({
    userId,
    sourceText: generatedSourceText,
    title: finalGeneratedTitle,
    theme: generatedTheme,
    parsedScene: scenePayload,
    model,
    promptVersion: SCENE_GENERATE_PROMPT_VERSION,
    cacheKey,
  });
  console.log("[scene.generate] insert ok", {
    runId,
    sceneId: scene.id,
    sceneSlug: scene.slug,
    title: scene.title,
  });
  const sceneTextForMatch = scenePayload.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => block.sentences)
    .map((sentence) => sentence.text)
    .join(" ");
  const relatedChunkVariantsMatched = relatedChunkVariants.filter((item) =>
    sceneTextContainsExpression(sceneTextForMatch, item.text),
  );

  return {
    scene,
    cache: {
      key: cacheKey,
      source: cached ? "ai_cache" : "glm",
      status: cached ? "hit" : "written",
    },
    personalization: {
      knownChunkCandidateCount: knownChunkCandidates.length,
      knownChunksUsed: knownChunks.slice(0, 6),
      relatedChunkVariantsUsed: relatedChunkVariants,
      relatedChunkVariantsMatched,
      reuseKnownChunks,
    },
  };
}
