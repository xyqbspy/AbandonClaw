import { NextResponse } from "next/server";
import { ensureProfile, requireCurrentUser } from "@/lib/server/auth";
import { deleteImportedScene, getSceneBySlug } from "@/lib/server/services/scene-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireCurrentUser();
    await ensureProfile(user);
    const { slug } = await context.params;

    const scene = await getSceneBySlug({ slug, userId: user.id });
    if (!scene) {
      return NextResponse.json({ error: "Scene not found." }, { status: 404 });
    }

    return NextResponse.json({ scene }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load scene.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireCurrentUser();
    await ensureProfile(user);
    const { slug } = await context.params;
    const scene = await getSceneBySlug({ slug, userId: user.id });
    if (!scene) {
      return NextResponse.json({ error: "Scene not found." }, { status: 404 });
    }
    if (scene.sourceType !== "imported") {
      return NextResponse.json(
        { error: "Only imported scenes can be deleted." },
        { status: 403 },
      );
    }

    await deleteImportedScene({ sceneId: scene.id, userId: user.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete scene.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
