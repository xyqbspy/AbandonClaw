import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { pauseSceneLearning, startSceneLearning } from "@/lib/server/learning/service";

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
    const { user } = await dependencies.requireCurrentProfile();
    const { slug } = await context.params;
    const result = await dependencies.startSceneLearning(user.id, slug);
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
    const { user } = await dependencies.requireCurrentProfile();
    const { slug } = await context.params;
    const result = await dependencies.pauseSceneLearning(user.id, slug);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to pause scene learning.", { request });
  }
}
