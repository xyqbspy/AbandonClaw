import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ForbiddenError } from "@/lib/server/errors";
import { logApiError } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  parseJsonBody,
  parseRequiredObjectArray,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";
import { regenerateChunkTtsAudioBatch } from "@/lib/server/tts/service";

type RegenerateTtsPayload = {
  items?: Array<{
    text?: string;
    chunkKey?: string;
  }>;
};

const MAX_REGENERATE_ITEMS = 12;
const REGENERATE_RATE_LIMIT = 6;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface RegenerateTtsDependencies {
  requireAdmin: typeof requireAdmin;
  regenerateChunkTtsAudioBatch: typeof regenerateChunkTtsAudioBatch;
}

const defaultDependencies: RegenerateTtsDependencies = {
  requireAdmin,
  regenerateChunkTtsAudioBatch,
};

const parseRegenerateItems = (payload: RegenerateTtsPayload) => {
  const items = parseRequiredObjectArray(payload.items, "items", {
    minItems: 1,
    maxItems: MAX_REGENERATE_ITEMS,
  });

  return items.map((item) => ({
    text: parseRequiredTrimmedString(item.text, "items[].text", 3000),
    chunkKey:
      item.chunkKey == null
        ? undefined
        : parseRequiredTrimmedString(item.chunkKey, "items[].chunkKey", 160),
  }));
};

export async function handleTtsRegeneratePost(
  request: Request,
  dependencies: RegenerateTtsDependencies = defaultDependencies,
) {
  try {
    assertAllowedOrigin(request);
    const admin = await dependencies.requireAdmin();
    await enforceRateLimit({
      key: admin.id,
      limit: REGENERATE_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      scope: "api-tts-regenerate",
    });
    const payload = await parseJsonBody<RegenerateTtsPayload>(request);
    const result = await dependencies.regenerateChunkTtsAudioBatch(parseRegenerateItems(payload));

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logApiError("api/tts/regenerate", error, {
      request,
    });
    if (error instanceof ForbiddenError && error.message === "Forbidden") {
      return toApiErrorResponse(
        new ForbiddenError("Only admins can regenerate tts audio."),
        "Failed to regenerate tts audio.",
        { request },
      );
    }
    return toApiErrorResponse(error, "Failed to regenerate tts audio.", { request });
  }
}

export async function POST(request: Request) {
  return handleTtsRegeneratePost(request);
}
