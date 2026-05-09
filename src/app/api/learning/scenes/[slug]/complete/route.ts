import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { completeSceneLearning } from "@/lib/server/learning/service";
import {
  buildDeterministicIdempotencyKey,
  getRequestIdempotencyKey,
  runIdempotentMutation,
} from "@/lib/server/idempotency";
import {
  normalizeLearningCompletePayload,
  parseLearningCompleteRequest,
} from "@/lib/server/request-schemas";
import {
  extractChunkTextsFromParsedScene,
  trackChunksForUser,
} from "@/lib/server/chunks/service";
import { ParsedScene } from "@/lib/types/scene-parser";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    assertAllowedOrigin(request);
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const payload = await parseLearningCompleteRequest(request);
    const normalizedPayload = normalizeLearningCompletePayload(payload);
    const result = await runIdempotentMutation({
      scope: "learning-complete",
      key: getRequestIdempotencyKey(
        request,
        buildDeterministicIdempotencyKey("learning-complete", user.id, slug, normalizedPayload),
      ),
      ttlMs: 8_000,
      execute: () => completeSceneLearning(user.id, slug, normalizedPayload),
    });

    const parsedScene = result.scene.scene_json as ParsedScene;
    const chunkTexts = extractChunkTextsFromParsedScene(parsedScene);
    if (chunkTexts.length > 0) {
      try {
        await trackChunksForUser(user.id, {
          sceneId: result.scene.id,
          sceneSlug: result.scene.slug,
          chunks: chunkTexts,
          interactionType: "encounter",
        });
      } catch (trackError) {
        console.warn("[user-chunks] complete-scene tracking failed", trackError);
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to complete scene learning.", { request });
  }
}

