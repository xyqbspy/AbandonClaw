import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { savePhraseForUser } from "@/lib/server/phrases/service";
import { trackChunksForUser } from "@/lib/server/chunks/service";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  normalizeSavePhraseBatchPayload,
  parseSavePhraseBatchRequest,
} from "@/lib/server/request-schemas";
import {
  buildDeterministicIdempotencyKey,
  getRequestIdempotencyKey,
  runIdempotentMutation,
} from "@/lib/server/idempotency";

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    const { user } = await requireCurrentProfile();
    const payload = await parseSavePhraseBatchRequest(request);
    const normalizedItems = normalizeSavePhraseBatchPayload(payload);
    const idempotencyKey = getRequestIdempotencyKey(
      request,
      buildDeterministicIdempotencyKey("phrases-save-all", user.id, normalizedItems),
    );
    const results = await runIdempotentMutation({
      scope: "phrases-save-all",
      key: idempotencyKey,
      execute: async () => {
        const nextResults: Array<{
          created: boolean;
          phrase: { id: string; normalized_text: string; display_text: string };
          userPhrase: { id: string };
          expressionClusterId: string | null;
        }> = [];
        for (const normalized of normalizedItems) {
          const result = await savePhraseForUser(user.id, normalized);
          const favoriteChunkText = normalized.sourceChunkText ?? normalized.text;
          if (favoriteChunkText) {
            try {
              await trackChunksForUser(user.id, {
                sceneSlug: normalized.sourceSceneSlug,
                sentenceIndex: normalized.sourceSentenceIndex,
                sentenceText: normalized.sourceSentenceText,
                chunks: [favoriteChunkText],
                interactionType: "favorite",
              });
            } catch (trackError) {
              console.warn("[user-chunks] batch favorite tracking failed", trackError);
            }
          }
          nextResults.push({
            created: result.created,
            phrase: {
              id: result.phrase.id,
              normalized_text: result.phrase.normalized_text,
              display_text: result.phrase.display_text,
            },
            userPhrase: { id: result.userPhrase.id },
            expressionClusterId: result.expressionClusterId,
          });
        }
        return nextResults;
      },
    });
    return NextResponse.json({ items: results }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to save phrases in batch.", { request });
  }
}
