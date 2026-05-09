import { NextResponse } from "next/server";
import { assertProfileCanGenerate, requireVerifiedCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { markHighCostUsage, reserveHighCostUsage } from "@/lib/server/high-cost-usage";
import { logApiError } from "@/lib/server/logger";
import { enforceHighCostRateLimit } from "@/lib/server/rate-limit";
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
    const { user, profile } = await requireVerifiedCurrentProfile();
    assertProfileCanGenerate(profile);
    await enforceHighCostRateLimit({
      request,
      userId: user.id,
      scope: "api-scenes-generate",
      userLimit: SCENE_GENERATE_RATE_LIMIT,
      ipLimit: SCENE_GENERATE_RATE_LIMIT * 2,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    const payload = await parseGenerateSceneRequest(request);
    const reservation = await reserveHighCostUsage({
      userId: user.id,
      capability: "scene_generate",
    });
    let result;
    try {
      result = await generatePersonalizedSceneForUser(
        user.id,
        normalizeGenerateScenePayload(payload),
      );
      await markHighCostUsage(reservation, "success");
    } catch (error) {
      await markHighCostUsage(reservation, "failed");
      throw error;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logApiError("api/scenes/generate", error, {
      request,
    });
    return toApiErrorResponse(error, "Failed to generate scene.", { request });
  }
}
