import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { savePhraseForUser } from "@/lib/server/phrases/service";
import { trackChunksForUser } from "@/lib/server/chunks/service";
import {
  parseOptionalNonNegativeInt,
  parseOptionalTrimmedString,
} from "@/lib/server/validation";

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
  expressionClusterId?: unknown;
  relationSourceUserPhraseId?: unknown;
  relationType?: unknown;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = (await request.json()) as SavePhrasePayload;
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

    const result = await savePhraseForUser(user.id, {
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
      expressionClusterId: parseOptionalTrimmedString(
        payload.expressionClusterId,
        "expressionClusterId",
        120,
      ),
      relationSourceUserPhraseId: parseOptionalTrimmedString(
        payload.relationSourceUserPhraseId,
        "relationSourceUserPhraseId",
        120,
      ),
      relationType:
        parseOptionalTrimmedString(payload.relationType, "relationType", 20) === "contrast"
          ? "contrast"
          : parseOptionalTrimmedString(payload.relationType, "relationType", 20) === "similar"
            ? "similar"
            : undefined,
    });

    const favoriteChunkText =
      parseOptionalTrimmedString(payload.sourceChunkText, "sourceChunkText", 500) ??
      expressionText;
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
