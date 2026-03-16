import { NextResponse } from "next/server";
import { ensureProfile, requireCurrentUser } from "@/lib/server/auth";
import { listScenes } from "@/lib/server/services/scene-service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await ensureProfile(user);
    const scenes = await listScenes({ userId: user.id });
    return NextResponse.json({ scenes }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load scenes.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
