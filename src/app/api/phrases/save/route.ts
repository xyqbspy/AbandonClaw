import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { savePhraseForUser } from "@/lib/server/phrases/service";
import { trackChunksForUser } from "@/lib/server/chunks/service";
import {
  parseOptionalNonNegativeInt,
  parseOptionalTrimmedString,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";

interface SavePhrasePayload {
  text?: unknown;
  translation?: unknown;
  usageNote?: unknown;
  difficulty?: unknown;
  tags?: unknown;
  sourceSceneSlug?: unknown;
  sourceSentenceIndex?: unknown;
  sourceSentenceText?: unknown;
  sourceChunkText?: unknown;
  expressionFamilyId?: unknown;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = (await request.json()) as SavePhrasePayload;

    const result = await savePhraseForUser(user.id, {
      text: parseRequiredTrimmedString(payload.text, "text", 200),
      translation: parseOptionalTrimmedString(payload.translation, "translation", 500),
      usageNote: parseOptionalTrimmedString(payload.usageNote, "usageNote", 1000),
      difficulty: parseOptionalTrimmedString(payload.difficulty, "difficulty", 64),
      tags: Array.isArray(payload.tags)
        ? payload.tags.filter((item): item is string => typeof item === "string")
        : [],
      sourceSceneSlug: parseOptionalTrimmedString(
        payload.sourceSceneSlug,
        "sourceSceneSlug",
        200,
      ),
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
    });

    const favoriteChunkText =
      parseOptionalTrimmedString(payload.sourceChunkText, "sourceChunkText", 500) ??
      parseOptionalTrimmedString(payload.text, "text", 200);
    if (favoriteChunkText) {
      try {
        await trackChunksForUser(user.id, {
          sceneSlug: parseOptionalTrimmedString(
            payload.sourceSceneSlug,
            "sourceSceneSlug",
            200,
          ),
          sentenceIndex: parseOptionalNonNegativeInt(
            payload.sourceSentenceIndex,
            "sourceSentenceIndex",
          ),
          sentenceText: parseOptionalTrimmedString(
            payload.sourceSentenceText,
            "sourceSentenceText",
            3000,
          ),
          chunks: [favoriteChunkText],
          interactionType: "favorite",
        });
      } catch (trackError) {
        console.warn("[user-chunks] favorite tracking failed", trackError);
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to save phrase.");
  }
}
