import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { savePhraseForUser } from "@/lib/server/phrases/service";
import { trackChunksForUser } from "@/lib/server/chunks/service";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  normalizeSavePhrasePayload,
  parseSavePhraseRequest,
} from "@/lib/server/request-schemas";
import {
  buildDeterministicIdempotencyKey,
  getRequestIdempotencyKey,
  runIdempotentMutation,
} from "@/lib/server/idempotency";

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanWrite(profile);
    const payload = await parseSavePhraseRequest(request);
    const normalizedPayload = normalizeSavePhrasePayload(payload);
    const idempotencyKey = getRequestIdempotencyKey(
      request,
      buildDeterministicIdempotencyKey("phrases-save", user.id, normalizedPayload),
    );
    const result = await runIdempotentMutation({
      scope: "phrases-save",
      key: idempotencyKey,
      execute: () => savePhraseForUser(user.id, normalizedPayload),
    });

    const favoriteChunkText = normalizedPayload.sourceChunkText ?? normalizedPayload.text;
    if (favoriteChunkText) {
      try {
        await trackChunksForUser(user.id, {
          sceneSlug: normalizedPayload.sourceSceneSlug,
          sentenceIndex: normalizedPayload.sourceSentenceIndex,
          sentenceText: normalizedPayload.sourceSentenceText,
          chunks: [favoriteChunkText],
          interactionType: "favorite",
        });
      } catch (trackError) {
        console.warn("[user-chunks] favorite tracking failed", trackError);
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to save phrase.", { request });
  }
}
