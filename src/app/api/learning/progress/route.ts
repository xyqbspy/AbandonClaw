import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { listLearningProgress } from "@/lib/server/learning/service";
import { parseOptionalStatusFilter } from "@/lib/server/validation";

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
};

export async function GET(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const { searchParams } = new URL(request.url);
    const status = parseOptionalStatusFilter(searchParams.get("status"));
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 20);

    const result = await listLearningProgress({
      userId: user.id,
      status,
      page,
      limit,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load learning progress.");
  }
}

