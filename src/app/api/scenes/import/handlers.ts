import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { isAppError, ValidationError } from "@/lib/server/errors";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";
import { SceneSourceLanguage } from "@/lib/types/scene-parser";
import { parseImportedSceneWithCache } from "@/lib/server/scene/import";
import { createImportedScene } from "@/lib/server/scene/service";
import { requireCurrentProfile } from "@/lib/server/auth";

interface ImportScenePayload extends Record<string, unknown> {
  sourceText?: unknown;
  title?: unknown;
  theme?: unknown;
  sourceLanguage?: unknown;
}

const isSourceLanguage = (value: unknown): value is SceneSourceLanguage =>
  value === "en" || value === "zh" || value === "mixed";

interface SceneImportHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  parseImportedSceneWithCache: typeof parseImportedSceneWithCache;
  createImportedScene: typeof createImportedScene;
  logError: typeof console.error;
}

const defaultDependencies: SceneImportHandlerDependencies = {
  requireCurrentProfile,
  parseImportedSceneWithCache,
  createImportedScene,
  logError: console.error,
};

export async function handleSceneImportPost(
  request: Request,
  dependencies: SceneImportHandlerDependencies = defaultDependencies,
) {
  try {
    const { user } = await dependencies.requireCurrentProfile();

    const payload = await parseJsonBody<ImportScenePayload>(request);
    const sourceText = parseRequiredTrimmedString(payload.sourceText, "sourceText", 8000);
    if (sourceText.length < 10) {
      throw new ValidationError("sourceText is too short.");
    }

    const sourceLanguage = isSourceLanguage(payload.sourceLanguage)
      ? payload.sourceLanguage
      : "en";

    const parsed = await dependencies.parseImportedSceneWithCache({
      sourceText,
      sourceLanguage,
      userId: user.id,
    });

    const lesson = await dependencies.createImportedScene({
      userId: user.id,
      sourceText,
      title: parseOptionalTrimmedString(payload.title, "title", 120),
      theme: parseOptionalTrimmedString(payload.theme, "theme", 80),
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
    if (error instanceof Error) {
      dependencies.logError("[api/scenes/import] failed", {
        message: error.message,
        ...(isAppError(error) ? { code: error.code, details: error.details ?? null } : {}),
      });
    }
    return toApiErrorResponse(error, "Failed to import scene.");
  }
}
