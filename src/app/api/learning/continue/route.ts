import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { getContinueLearningScene } from "@/lib/server/services/learning-service";

export async function GET() {
  try {
    const { user } = await requireCurrentProfile();
    const continueLearning = await getContinueLearningScene(user.id);
    return NextResponse.json({ continueLearning }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load continue learning.");
  }
}

