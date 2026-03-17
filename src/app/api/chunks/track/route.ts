import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  ChunkInteractionType,
  trackChunksForUser,
} from "@/lib/server/chunks/service";
import {
  parseOptionalNonNegativeInt,
  parseOptionalTrimmedString,
} from "@/lib/server/validation";
import { ValidationError } from "@/lib/server/errors";

interface TrackChunksPayload {
  sceneSlug?: unknown;
  sentenceIndex?: unknown;
  sentenceText?: unknown;
  chunks?: unknown;
  interactionType?: unknown;
}

const parseInteractionType = (value: unknown): ChunkInteractionType => {
  if (value == null) return "encounter";
  if (value === "encounter" || value === "practice" || value === "favorite") {
    return value;
  }
  throw new ValidationError(
    "interactionType must be one of encounter/practice/favorite.",
  );
};

const parseChunks = (value: unknown) => {
  if (!Array.isArray(value)) {
    throw new ValidationError("chunks must be a string array.");
  }
  const chunks = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 200);
  if (chunks.length === 0) {
    throw new ValidationError("chunks must include at least one non-empty text.");
  }
  return chunks;
};

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = (await request.json()) as TrackChunksPayload;
    const result = await trackChunksForUser(user.id, {
      sceneSlug: parseOptionalTrimmedString(payload.sceneSlug, "sceneSlug", 200),
      sentenceIndex: parseOptionalNonNegativeInt(
        payload.sentenceIndex,
        "sentenceIndex",
      ),
      sentenceText: parseOptionalTrimmedString(
        payload.sentenceText,
        "sentenceText",
        3000,
      ),
      chunks: parseChunks(payload.chunks),
      interactionType: parseInteractionType(payload.interactionType),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to track chunks.");
  }
}
