import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
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

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody<Partial<ParseSceneRequest>>(request);

    if (!isValidPayload(payload)) {
      throw new ValidationError(
        "Invalid payload. rawText is required. sourceLanguage must be one of: en, zh, mixed.",
      );
    }

    const result = await parseImportedSceneWithCache({
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
    return toApiErrorResponse(error, "Scene parse failed.");
  }
}
