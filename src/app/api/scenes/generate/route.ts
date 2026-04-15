import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { logApiError } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  parseJsonBody,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";
import { generatePersonalizedSceneForUser } from "@/lib/server/scene/generation";

const SCENE_GENERATE_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface GenerateScenePayload extends Record<string, unknown> {
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
    assertAllowedOrigin(request);
    const { user } = await requireCurrentProfile();
    enforceRateLimit({
      key: user.id,
      limit: SCENE_GENERATE_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      scope: "api-scenes-generate",
    });
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
    logApiError("api/scenes/generate", error, {
      request,
    });
    return toApiErrorResponse(error, "Failed to generate scene.", { request });
  }
}
