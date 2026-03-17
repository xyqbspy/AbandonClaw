import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { getReviewSummary } from "@/lib/server/review/service";

export async function GET() {
  try {
    const { user } = await requireCurrentProfile();
    const summary = await getReviewSummary(user.id);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load review summary.");
  }
}
