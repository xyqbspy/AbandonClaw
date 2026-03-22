import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { getLearningDashboard } from "@/lib/server/learning/service";

export async function GET() {
  try {
    const { user } = await requireCurrentProfile();
    const dashboard = await getLearningDashboard(user.id);
    return NextResponse.json(dashboard, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load learning dashboard.");
  }
}

