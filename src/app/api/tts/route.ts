import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { logApiError } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { generateTtsAudio, TtsRequestPayload } from "@/lib/server/tts/service";
import { parseJsonBody } from "@/lib/server/validation";

const TTS_RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    const { user } = await requireCurrentProfile();
    await enforceRateLimit({
      key: user.id,
      limit: TTS_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      scope: "api-tts",
    });
    const payload = await parseJsonBody<TtsRequestPayload>(request);
    const result = await generateTtsAudio(payload);

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
