import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { listScenes } from "@/lib/server/services/scene-service";

export async function GET() {
  try {
    const { user } = await requireCurrentProfile();
    const scenes = await listScenes({ userId: user.id });
    return NextResponse.json({ scenes }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load scenes.");
  }
}
