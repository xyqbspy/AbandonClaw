import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  getLatestScenePracticeSet,
  isScenePracticeSet,
  saveScenePracticeSet,
} from "@/lib/server/learning/practice-set-service";
import { parseJsonBody } from "@/lib/server/validation";
import { ValidationError } from "@/lib/server/errors";

interface SaveScenePracticeSetPayload extends Record<string, unknown> {
  practiceSet?: unknown;
  replaceExisting?: unknown;
}

type ScenePracticeSetDependencies = {
  requireCurrentProfile: typeof requireCurrentProfile;
  getLatestScenePracticeSet: typeof getLatestScenePracticeSet;
  saveScenePracticeSet: typeof saveScenePracticeSet;
};

const scenePracticeSetDependencies: ScenePracticeSetDependencies = {
  requireCurrentProfile,
  getLatestScenePracticeSet,
  saveScenePracticeSet,
};

export async function handleScenePracticeSetGet(
  context: { params: Promise<{ slug: string }> },
  dependencies: ScenePracticeSetDependencies = scenePracticeSetDependencies,
) {
  try {
    const { user } = await dependencies.requireCurrentProfile();
    const { slug } = await context.params;
    const result = await dependencies.getLatestScenePracticeSet(user.id, slug);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load scene practice set.");
  }
}

export async function handleScenePracticeSetPost(
  context: { params: Promise<{ slug: string }> },
  request: Request,
  dependencies: ScenePracticeSetDependencies = scenePracticeSetDependencies,
) {
  try {
    const { user } = await dependencies.requireCurrentProfile();
    const { slug } = await context.params;
    const payload = await parseJsonBody<SaveScenePracticeSetPayload>(request);
    if (!isScenePracticeSet(payload.practiceSet)) {
      throw new ValidationError("Practice set payload is invalid.");
    }
    const result = await dependencies.saveScenePracticeSet(user.id, slug, {
      practiceSet: payload.practiceSet,
      replaceExisting: payload.replaceExisting === true,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to save scene practice set.");
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleScenePracticeSetGet(context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleScenePracticeSetPost(context, request);
}
