import { NextResponse } from "next/server";
import { assertProfileCanGenerate, requireVerifiedCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { markHighCostUsage, reserveHighCostUsage } from "@/lib/server/high-cost-usage";
import { logApiError } from "@/lib/server/logger";
import { enforceHighCostRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { generateTtsAudio, TtsRequestPayload } from "@/lib/server/tts/service";
import { parseJsonBody } from "@/lib/server/validation";

const TTS_RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    const { user, profile } = await requireVerifiedCurrentProfile();
    assertProfileCanGenerate(profile);
    await enforceHighCostRateLimit({
      request,
      userId: user.id,
      scope: "api-tts",
      userLimit: TTS_RATE_LIMIT,
      ipLimit: TTS_RATE_LIMIT * 2,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    const payload = await parseJsonBody<TtsRequestPayload>(request);
    const reservation = await reserveHighCostUsage({
      userId: user.id,
      capability: "tts_generate",
    });
    let result;
    try {
      result = await generateTtsAudio(payload);
      await markHighCostUsage(reservation, "success");
    } catch (error) {
      await markHighCostUsage(reservation, "failed");
      throw error;
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logApiError("api/tts", error, {
      request,
    });
    return toApiErrorResponse(error, "Failed to generate tts audio.", { request });
  }
}
