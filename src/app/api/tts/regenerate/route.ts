import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { parseJsonBody } from "@/lib/server/validation";
import { regenerateChunkTtsAudioBatch } from "@/lib/server/tts/service";

type RegenerateTtsPayload = {
  items?: Array<{
    text?: string;
    chunkKey?: string;
  }>;
};

export async function POST(request: Request) {
  try {
    await requireCurrentProfile();
    const payload = await parseJsonBody<RegenerateTtsPayload>(request);
    const result = await regenerateChunkTtsAudioBatch(
      (payload.items ?? []).filter(
        (item): item is { text: string; chunkKey?: string } => typeof item?.text === "string",
      ),
    );

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/tts/regenerate] failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return toApiErrorResponse(error, "Failed to regenerate tts audio.");
  }
}
