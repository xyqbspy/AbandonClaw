import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { listScenes } from "@/lib/server/scene/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireCurrentProfile();
    const scenes = await listScenes({ userId: user.id });
    return NextResponse.json(
      { scenes },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load scenes.");
  }
}
