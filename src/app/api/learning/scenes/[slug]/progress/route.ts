import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { updateSceneProgress } from "@/lib/server/learning/service";
import {
  buildDeterministicIdempotencyKey,
  getRequestIdempotencyKey,
  runIdempotentMutation,
} from "@/lib/server/idempotency";
import {
  normalizeLearningProgressPayload,
  parseLearningProgressRequest,
} from "@/lib/server/request-schemas";

interface LearningProgressHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  updateSceneProgress: typeof updateSceneProgress;
}

const defaultDependencies: LearningProgressHandlerDependencies = {
  requireCurrentProfile,
  updateSceneProgress,
};

export async function handleLearningSceneProgressPost(
  request: Request,
  context: { params: Promise<{ slug: string }> },
  dependencies: LearningProgressHandlerDependencies = defaultDependencies,
) {
  try {
    assertAllowedOrigin(request);
    const { user } = await dependencies.requireCurrentProfile();
    const { slug } = await context.params;
    const payload = await parseLearningProgressRequest(request);
    const normalizedPayload = normalizeLearningProgressPayload(payload);
    const result = await runIdempotentMutation({
      scope: "learning-progress",
      key: getRequestIdempotencyKey(
        request,
        buildDeterministicIdempotencyKey("learning-progress", user.id, slug, normalizedPayload),
      ),
      ttlMs: 8_000,
      execute: () => dependencies.updateSceneProgress(user.id, slug, normalizedPayload),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to update scene progress.", { request });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleLearningSceneProgressPost(request, context);
}

