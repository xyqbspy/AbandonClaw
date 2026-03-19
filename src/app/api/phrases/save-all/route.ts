import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { SavePhraseInput, savePhraseForUser } from "@/lib/server/phrases/service";
import { trackChunksForUser } from "@/lib/server/chunks/service";
import {
  parseOptionalNonNegativeInt,
  parseOptionalTrimmedString,
} from "@/lib/server/validation";
import { normalizePhraseText } from "@/lib/shared/phrases";

interface SavePhrasePayload {
  text?: unknown;
  learningItemType?: unknown;
  sentenceText?: unknown;
  translation?: unknown;
  usageNote?: unknown;
  difficulty?: unknown;
  tags?: unknown;
  sourceSceneSlug?: unknown;
  sourceType?: unknown;
  sourceNote?: unknown;
  sourceSentenceIndex?: unknown;
  sourceSentenceText?: unknown;
  sourceChunkText?: unknown;
  expressionFamilyId?: unknown;
}

interface SaveAllPayload {
  items?: unknown;
}

const normalizeSavePayload = (payload: SavePhrasePayload): SavePhraseInput => {
  const sourceSceneSlug = parseOptionalTrimmedString(
    payload.sourceSceneSlug,
    "sourceSceneSlug",
    200,
  );
  const learningItemTypeRaw = parseOptionalTrimmedString(
    payload.learningItemType,
    "learningItemType",
    20,
  );
  const learningItemType =
    learningItemTypeRaw === "sentence"
      ? "sentence"
      : learningItemTypeRaw === "expression"
        ? "expression"
        : "expression";
  const sentenceText = parseOptionalTrimmedString(payload.sentenceText, "sentenceText", 3000);
  const expressionText = parseOptionalTrimmedString(payload.text, "text", 200);
  const sourceTypeRaw = parseOptionalTrimmedString(payload.sourceType, "sourceType", 20);
  return {
    text: expressionText ?? undefined,
    learningItemType,
    sentenceText: sentenceText ?? undefined,
    translation: parseOptionalTrimmedString(payload.translation, "translation", 500),
    usageNote: parseOptionalTrimmedString(payload.usageNote, "usageNote", 1000),
    difficulty: parseOptionalTrimmedString(payload.difficulty, "difficulty", 64),
    tags: Array.isArray(payload.tags)
      ? payload.tags.filter((item): item is string => typeof item === "string")
      : [],
    sourceSceneSlug,
    sourceType:
      sourceTypeRaw === "manual"
        ? "manual"
        : sourceTypeRaw === "scene"
          ? "scene"
          : sourceSceneSlug
            ? "scene"
            : "manual",
    sourceNote: parseOptionalTrimmedString(payload.sourceNote, "sourceNote", 300),
    sourceSentenceIndex: parseOptionalNonNegativeInt(
      payload.sourceSentenceIndex,
      "sourceSentenceIndex",
    ),
    sourceSentenceText: parseOptionalTrimmedString(
      payload.sourceSentenceText,
      "sourceSentenceText",
      3000,
    ),
    sourceChunkText: parseOptionalTrimmedString(
      payload.sourceChunkText,
      "sourceChunkText",
      500,
    ),
    expressionFamilyId: parseOptionalTrimmedString(
      payload.expressionFamilyId,
      "expressionFamilyId",
      120,
    ),
  };
};

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = (await request.json()) as SaveAllPayload;
    if (!Array.isArray(payload.items)) {
      return NextResponse.json({ error: "items must be an array." }, { status: 400 });
    }
    const safeTrim = (value: unknown, maxLength: number) =>
      typeof value === "string" ? value.trim().slice(0, maxLength) : "";
    const rawItems = payload.items.slice(0, 50);
    const dedupe = new Set<string>();
    const items = rawItems.filter((raw) => {
      const candidate = (raw ?? {}) as SavePhrasePayload;
      const learningItemTypeRaw = safeTrim(candidate.learningItemType, 20);
      const learningItemType =
        learningItemTypeRaw === "sentence"
          ? "sentence"
          : learningItemTypeRaw === "expression"
            ? "expression"
            : "expression";
      const text =
        learningItemType === "sentence"
          ? safeTrim(candidate.sentenceText, 3000)
          : safeTrim(candidate.text, 200);
      const key = `${learningItemType}:${normalizePhraseText(text)}`;
      if (!key || key.endsWith(":")) return true;
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    });
    if (items.length === 0) {
      return NextResponse.json({ error: "items is empty." }, { status: 400 });
    }
    const results: Array<{
      created: boolean;
      phrase: { id: string; normalized_text: string; display_text: string };
      userPhrase: { id: string };
    }> = [];
    for (const raw of items) {
      const normalized = normalizeSavePayload((raw ?? {}) as SavePhrasePayload);
      const result = await savePhraseForUser(user.id, normalized);
      const favoriteChunkText = normalized.sourceChunkText ?? normalized.text;
      if (favoriteChunkText) {
        try {
          await trackChunksForUser(user.id, {
            sceneSlug: normalized.sourceSceneSlug,
            sentenceIndex: normalized.sourceSentenceIndex,
            sentenceText: normalized.sourceSentenceText,
            chunks: [favoriteChunkText],
            interactionType: "favorite",
          });
        } catch (trackError) {
          console.warn("[user-chunks] batch favorite tracking failed", trackError);
        }
      }
      results.push({
        created: result.created,
        phrase: {
          id: result.phrase.id,
          normalized_text: result.phrase.normalized_text,
          display_text: result.phrase.display_text,
        },
        userPhrase: { id: result.userPhrase.id },
      });
    }
    return NextResponse.json({ items: results }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to save phrases in batch.");
  }
}
