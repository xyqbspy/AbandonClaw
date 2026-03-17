import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { getRecommendedPhrasesForScene } from "@/lib/server/recommendations/service";

const parseLimit = (raw: string | null) => {
  if (!raw) return 3;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError("limit must be a positive number.");
  }
  return Math.min(5, Math.max(1, Math.floor(parsed)));
};

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const items = await getRecommendedPhrasesForScene(user.id, slug, { limit });
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load scene phrase recommendations.");
  }
}
