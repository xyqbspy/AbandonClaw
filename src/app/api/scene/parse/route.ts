import { NextResponse } from "next/server";
import { ParseSceneRequest } from "@/lib/types/scene-parser";
import { parseImportedSceneWithCache } from "@/lib/server/services/import-parse-service";

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
    const payload = (await request.json()) as Partial<ParseSceneRequest>;

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. rawText is required. sourceLanguage must be one of: en, zh, mixed.",
        },
        { status: 400 },
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Scene parse failed: ${message}`,
      },
      { status: 500 },
    );
  }
}
