import { NextResponse } from "next/server";
import { ensureProfile, requireCurrentUser } from "@/lib/server/auth";
import { SceneSourceLanguage } from "@/lib/types/scene-parser";
import { parseImportedSceneWithCache } from "@/lib/server/services/import-parse-service";
import { createImportedScene } from "@/lib/server/services/scene-service";

interface ImportScenePayload {
  sourceText?: unknown;
  title?: unknown;
  theme?: unknown;
  sourceLanguage?: unknown;
}

const isSourceLanguage = (value: unknown): value is SceneSourceLanguage =>
  value === "en" || value === "zh" || value === "mixed";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await ensureProfile(user);

    const payload = (await request.json()) as ImportScenePayload;
    const sourceText =
      typeof payload.sourceText === "string" ? payload.sourceText.trim() : "";

    if (!sourceText) {
      return NextResponse.json({ error: "sourceText is required." }, { status: 400 });
    }

    const sourceLanguage = isSourceLanguage(payload.sourceLanguage)
      ? payload.sourceLanguage
      : "en";

    const parsed = await parseImportedSceneWithCache({
      sourceText,
      sourceLanguage,
      userId: user.id,
    });

    const lesson = await createImportedScene({
      userId: user.id,
      sourceText,
      title: typeof payload.title === "string" ? payload.title : undefined,
      theme: typeof payload.theme === "string" ? payload.theme : undefined,
      parsedScene: parsed.parsedScene,
      model: process.env.GLM_MODEL ?? "glm-4.6",
    });

    return NextResponse.json(
      {
        scene: lesson,
        cache: {
          key: parsed.cacheKey,
          source: parsed.source,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import scene.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
