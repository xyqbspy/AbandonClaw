import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { generateTtsAudio, TtsRequestPayload } from "@/lib/server/tts/service";
import { parseJsonBody } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    await requireCurrentProfile();
    const payload = await parseJsonBody<TtsRequestPayload>(request);
    const result = await generateTtsAudio(payload);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/tts] failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return toApiErrorResponse(error, "Failed to generate tts audio.");
  }
}
