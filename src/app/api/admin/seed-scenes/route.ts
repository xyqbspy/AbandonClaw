import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { runSeedScenesSync } from "@/lib/server/services/scene-service";

export async function POST() {
  try {
    await requireAdmin();
    const result = await runSeedScenesSync();
    return NextResponse.json(
      {
        ok: true,
        seeded: result.total,
      },
      { status: 200 },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Failed to sync seed scenes.");
  }
}
