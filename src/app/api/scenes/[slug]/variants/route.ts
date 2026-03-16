import { NextResponse } from "next/server";
import { ensureProfile, requireCurrentUser } from "@/lib/server/auth";
import { getSceneById } from "@/lib/server/services/scene-service";
import {
  generateSceneVariants,
  getSceneVariantsBySceneId,
} from "@/lib/server/services/variant-service";
import { isValidParsedScene } from "@/lib/server/scene-json";
import { ParsedScene } from "@/lib/types/scene-parser";

interface GenerateVariantsPayload {
  variantCount?: unknown;
  retainChunkRatio?: unknown;
  theme?: unknown;
}

const toSceneVariantsResponse = (variants: ParsedScene[]) => ({
  version: "v1" as const,
  variants,
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireCurrentUser();
    await ensureProfile(user);
    const { slug: sceneId } = await context.params;

    const scene = await getSceneById({ sceneId, userId: user.id });
    if (!scene) {
      return NextResponse.json({ error: "Scene not found." }, { status: 404 });
    }

    const rows = await getSceneVariantsBySceneId(sceneId);
    const latestCacheKey = rows[0]?.cache_key ?? null;
    const latestRows = latestCacheKey
      ? rows.filter((row) => row.cache_key === latestCacheKey)
      : rows;
    const variants = latestRows
      .map((row) => row.variant_json as ParsedScene)
      .filter(isValidParsedScene);

    return NextResponse.json(
      {
        sceneId,
        ...toSceneVariantsResponse(variants),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load scene variants.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireCurrentUser();
    await ensureProfile(user);
    const { slug: sceneId } = await context.params;
    const scene = await getSceneById({ sceneId, userId: user.id });
    if (!scene) {
      return NextResponse.json({ error: "Scene not found." }, { status: 404 });
    }

    const payload = (await request.json()) as GenerateVariantsPayload;
    const sourceScene = scene.row.scene_json as ParsedScene;
    const result = await generateSceneVariants({
      sceneId,
      scene: {
        ...sourceScene,
        id: scene.row.id,
        slug: scene.row.slug,
      },
      variantCount: typeof payload.variantCount === "number" ? payload.variantCount : undefined,
      retainChunkRatio:
        typeof payload.retainChunkRatio === "number" ? payload.retainChunkRatio : undefined,
      theme: typeof payload.theme === "string" ? payload.theme : undefined,
      createdBy: user.id,
      model: process.env.GLM_MODEL ?? "glm-4.6",
    });

    return NextResponse.json(
      {
        sceneId,
        cache: {
          key: result.cacheKey,
          source: result.source,
        },
        ...toSceneVariantsResponse(result.response.variants),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate variants.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
