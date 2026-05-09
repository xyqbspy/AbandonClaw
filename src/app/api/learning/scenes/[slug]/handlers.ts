import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { pauseSceneLearning, startSceneLearning } from "@/lib/server/learning/service";
import {
  buildDeterministicIdempotencyKey,
  getRequestIdempotencyKey,
  runIdempotentMutation,
} from "@/lib/server/idempotency";

interface SceneLearningHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  startSceneLearning: typeof startSceneLearning;
  pauseSceneLearning: typeof pauseSceneLearning;
}

const defaultDependencies: SceneLearningHandlerDependencies = {
  requireCurrentProfile,
  startSceneLearning,
  pauseSceneLearning,
};

export async function handleSceneLearningStartPost(
  context: { params: Promise<{ slug: string }> },
  dependencies: SceneLearningHandlerDependencies = defaultDependencies,
  request?: Request,
) {
  try {
    if (request) {
      assertAllowedOrigin(request);
    }
    const { user, profile } = await dependencies.requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const result = await runIdempotentMutation({
      scope: "learning-start",
      key: request
        ? getRequestIdempotencyKey(
            request,
            buildDeterministicIdempotencyKey("learning-start", user.id, slug),
          )
        : buildDeterministicIdempotencyKey("learning-start", user.id, slug),
      ttlMs: 8_000,
      execute: () => dependencies.startSceneLearning(user.id, slug),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to start scene learning.", { request });
  }
}

export async function handleSceneLearningPausePost(
  context: { params: Promise<{ slug: string }> },
  dependencies: SceneLearningHandlerDependencies = defaultDependencies,
  request?: Request,
) {
  try {
    if (request) {
      assertAllowedOrigin(request);
    }
    const { user, profile } = await dependencies.requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const result = await runIdempotentMutation({
      scope: "learning-pause",
      key: request
        ? getRequestIdempotencyKey(
            request,
            buildDeterministicIdempotencyKey("learning-pause", user.id, slug),
          )
        : buildDeterministicIdempotencyKey("learning-pause", user.id, slug),
      ttlMs: 8_000,
      execute: () => dependencies.pauseSceneLearning(user.id, slug),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to pause scene learning.", { request });
  }
}
