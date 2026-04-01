import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { requireCurrentProfile } from "@/lib/server/auth";
import { isAppError, ValidationError } from "@/lib/server/errors";
import { parseJsonBody } from "@/lib/server/validation";
import { ParseSceneRequest } from "@/lib/types/scene-parser";
import { parseImportedSceneWithCache } from "@/lib/server/scene/import";

const isValidPayload = (
  payload: Partial<ParseSceneRequest>,
): payload is ParseSceneRequest => {
  const sourceLanguageValid =
    payload.sourceLanguage === undefined ||
    payload.sourceLanguage === "en" ||
    payload.sourceLanguage === "zh" ||
    payload.sourceLanguage === "mixed";

  return Boolean(payload.rawText?.trim()) && sourceLanguageValid;
};

interface SceneParseHandlerDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  parseImportedSceneWithCache: typeof parseImportedSceneWithCache;
  logError: typeof console.error;
}

const defaultDependencies: SceneParseHandlerDependencies = {
  requireCurrentProfile,
  parseImportedSceneWithCache,
  logError: console.error,
};

export async function handleSceneParsePost(
  request: Request,
  dependencies: SceneParseHandlerDependencies = defaultDependencies,
) {
  try {
    await dependencies.requireCurrentProfile();
    const payload = await parseJsonBody<Partial<ParseSceneRequest>>(request);

    if (!isValidPayload(payload)) {
      throw new ValidationError(
        "Invalid payload. rawText is required. sourceLanguage must be one of: en, zh, mixed.",
      );
    }

    const result = await dependencies.parseImportedSceneWithCache({
      sourceText: payload.rawText,
      sourceLanguage: payload.sourceLanguage,
      force: true,
    });

    return NextResponse.json(
      {
        version: "v1",
        scene: result.parsedScene,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      dependencies.logError("[api/scene/parse] failed", {
        message: error.message,
        ...(isAppError(error) ? { code: error.code, details: error.details ?? null } : {}),
      });
    }
    return toApiErrorResponse(error, "Scene parse failed.");
  }
}
