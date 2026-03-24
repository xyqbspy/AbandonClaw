import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { NotFoundError } from "@/lib/server/errors";
import { getSceneRecordBySlug } from "@/lib/server/scene/service";
import {
  generateSceneVariants,
  getSceneVariantsBySceneId,
} from "@/lib/server/scene/variants";
import { isValidParsedScene } from "@/lib/server/scene-json";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
  parseRetainChunkRatio,
  parseVariantCount,
} from "@/lib/server/validation";
import { ParsedScene } from "@/lib/types/scene-parser";
import {
  extractChunkTextsFromParsedScene,
  trackChunksForUser,
} from "@/lib/server/chunks/service";

interface GenerateVariantsPayload extends Record<string, unknown> {
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
    const { user } = await requireCurrentProfile();
    const { slug: sceneSlug } = await context.params;

    const scene = await getSceneRecordBySlug({ slug: sceneSlug, userId: user.id });
    if (!scene) {
      throw new NotFoundError("Scene not found.");
    }

    const sceneId = scene.row.id;
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
        sceneSlug,
        ...toSceneVariantsResponse(variants),
      },
      { status: 200 },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load scene variants.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { slug: sceneSlug } = await context.params;
    const scene = await getSceneRecordBySlug({ slug: sceneSlug, userId: user.id });
    if (!scene) {
      throw new NotFoundError("Scene not found.");
    }

    const payload = await parseJsonBody<GenerateVariantsPayload>(request);
    const sceneId = scene.row.id;
    const sourceScene = scene.row.scene_json as ParsedScene;
    const result = await generateSceneVariants({
      sceneId,
      scene: {
        ...sourceScene,
        id: scene.row.id,
        slug: scene.row.slug,
      },
      variantCount: parseVariantCount(payload.variantCount, 3),
      retainChunkRatio: parseRetainChunkRatio(payload.retainChunkRatio, 0.6),
      theme: parseOptionalTrimmedString(payload.theme, "theme", 80),
      createdBy: user.id,
      model: process.env.GLM_MODEL ?? "glm-4.6",
    });

    const sourceChunks = extractChunkTextsFromParsedScene(sourceScene);
    if (sourceChunks.length > 0) {
      try {
        await trackChunksForUser(user.id, {
          sceneId,
          sceneSlug: scene.row.slug,
          chunks: sourceChunks,
          interactionType: "encounter",
        });
      } catch (trackError) {
        console.warn("[user-chunks] variant tracking failed", trackError);
      }
    }

    return NextResponse.json(
      {
        sceneSlug,
        cache: {
          key: result.cacheKey,
          source: result.source,
          status: result.cacheStatus,
        },
        ...toSceneVariantsResponse(result.response.variants),
      },
      { status: 200 },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Failed to generate variants.");
  }
}
