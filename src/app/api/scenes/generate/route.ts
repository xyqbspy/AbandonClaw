import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  parseJsonBody,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";
import { generatePersonalizedSceneForUser } from "@/lib/server/scene/generation";

interface GenerateScenePayload {
  promptText?: unknown;
  tone?: unknown;
  difficulty?: unknown;
  sentenceCount?: unknown;
  reuseKnownChunks?: unknown;
}

const parseOptionalBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  return fallback;
};

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = await parseJsonBody<GenerateScenePayload>(request);

    const result = await generatePersonalizedSceneForUser(user.id, {
      promptText: parseRequiredTrimmedString(payload.promptText, "promptText", 800),
      tone: typeof payload.tone === "string" ? payload.tone : undefined,
      difficulty: payload.difficulty === "easy" || payload.difficulty === "medium"
        ? payload.difficulty
        : undefined,
      sentenceCount:
        typeof payload.sentenceCount === "number" ? payload.sentenceCount : undefined,
      reuseKnownChunks: parseOptionalBoolean(payload.reuseKnownChunks, true),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to generate scene.");
  }
}
