import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ForbiddenError, NotFoundError } from "@/lib/server/errors";
import { deleteImportedScene, getSceneBySlug } from "@/lib/server/services/scene-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { slug } = await context.params;

    const scene = await getSceneBySlug({ slug, userId: user.id });
    if (!scene) {
      throw new NotFoundError("Scene not found.");
    }

    return NextResponse.json({ scene }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load scene.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { slug } = await context.params;
    const scene = await getSceneBySlug({ slug, userId: user.id });
    if (!scene) {
      throw new NotFoundError("Scene not found.");
    }
    if (scene.sourceType !== "imported") {
      throw new ForbiddenError("Only imported scenes can be deleted.");
    }

    await deleteImportedScene({ sceneId: scene.id, userId: user.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to delete scene.");
  }
}
