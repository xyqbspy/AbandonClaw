import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { logApiError } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  normalizeGenerateScenePayload,
  parseGenerateSceneRequest,
} from "@/lib/server/request-schemas";
import { generatePersonalizedSceneForUser } from "@/lib/server/scene/generation";

const SCENE_GENERATE_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    const { user } = await requireCurrentProfile();
    await enforceRateLimit({
      key: user.id,
      limit: SCENE_GENERATE_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      scope: "api-scenes-generate",
    });
    const payload = await parseGenerateSceneRequest(request);
    const result = await generatePersonalizedSceneForUser(
      user.id,
      normalizeGenerateScenePayload(payload),
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logApiError("api/scenes/generate", error, {
      request,
    });
    return toApiErrorResponse(error, "Failed to generate scene.", { request });
  }
}
