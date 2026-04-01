import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { getContinueLearningScene, listLearningProgress } from "@/lib/server/learning/service";
import { parseOptionalStatusFilter } from "@/lib/server/validation";

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
};

interface ContinueLearningHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  getContinueLearningScene: typeof getContinueLearningScene;
}

const defaultContinueLearningDependencies: ContinueLearningHandlerDependencies = {
  requireCurrentProfile,
  getContinueLearningScene,
};

export async function handleContinueLearningGet(
  dependencies: ContinueLearningHandlerDependencies = defaultContinueLearningDependencies,
) {
  try {
    const { user } = await dependencies.requireCurrentProfile();
    const continueLearning = await dependencies.getContinueLearningScene(user.id);
    return NextResponse.json({ continueLearning }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load continue learning.");
  }
}

interface LearningProgressHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  listLearningProgress: typeof listLearningProgress;
}

const defaultLearningProgressDependencies: LearningProgressHandlerDependencies = {
  requireCurrentProfile,
  listLearningProgress,
};

export async function handleLearningProgressGet(
  request: Request,
  dependencies: LearningProgressHandlerDependencies = defaultLearningProgressDependencies,
) {
  try {
    const { user } = await dependencies.requireCurrentProfile();
    const { searchParams } = new URL(request.url);
    const status = parseOptionalStatusFilter(searchParams.get("status"));
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 20);

    const result = await dependencies.listLearningProgress({
      userId: user.id,
      status,
      page,
      limit,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load learning progress.");
  }
}
