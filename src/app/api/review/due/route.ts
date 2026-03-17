import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { getDueReviewItems } from "@/lib/server/review/service";
import { ValidationError } from "@/lib/server/errors";

const parseLimit = (raw: string | null) => {
  if (!raw) return 20;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError("limit must be a positive number.");
  }
  return Math.min(100, Math.floor(parsed));
};

export async function GET(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const rows = await getDueReviewItems(user.id, { limit });
    return NextResponse.json({ rows, total: rows.length }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load due review items.");
  }
}
