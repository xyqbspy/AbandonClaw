import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { logApiError } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { ensureProfileOrRejectAnonymous } from "@/lib/server/anonymous/route-guard";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  normalizeImportScenePayload,
  parseImportSceneRequest,
} from "@/lib/server/request-schemas";
import { parseImportedSceneWithCache } from "@/lib/server/scene/import";
import { createImportedScene } from "@/lib/server/scene/service";
import { requireCurrentProfile } from "@/lib/server/auth";

const SCENE_IMPORT_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface SceneImportHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  parseImportedSceneWithCache: typeof parseImportedSceneWithCache;
  createImportedScene: typeof createImportedScene;
  logApiError: typeof logApiError;
}

const defaultDependencies: SceneImportHandlerDependencies = {
  requireCurrentProfile,
  parseImportedSceneWithCache,
  createImportedScene,
  logApiError,
};

export async function handleSceneImportPost(
  request: Request,
  dependencies: SceneImportHandlerDependencies = defaultDependencies,
) {
  try {
    assertAllowedOrigin(request);
    const { user } = await ensureProfileOrRejectAnonymous(
      "scene_import",
      () => dependencies.requireCurrentProfile(),
    );
    await enforceRateLimit({
      key: user.id,
      limit: SCENE_IMPORT_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      scope: "api-scenes-import",
    });

    const payload = await parseImportSceneRequest(request);
    const normalizedPayload = normalizeImportScenePayload(payload);

    const parsed = await dependencies.parseImportedSceneWithCache({
      sourceText: normalizedPayload.sourceText,
      sourceLanguage: normalizedPayload.sourceLanguage,
      userId: user.id,
    });

    const lesson = await dependencies.createImportedScene({
      userId: user.id,
      sourceText: normalizedPayload.sourceText,
      title: normalizedPayload.title,
      theme: normalizedPayload.theme,
      parsedScene: parsed.parsedScene,
      model: process.env.GLM_MODEL ?? "glm-4.6",
    });

    return NextResponse.json(
      {
        scene: lesson,
        cache: {
          key: parsed.cacheKey,
          source: parsed.source,
          status: parsed.cacheStatus,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    dependencies.logApiError("api/scenes/import", error, { request });
    return toApiErrorResponse(error, "Failed to import scene.", { request });
  }
}
