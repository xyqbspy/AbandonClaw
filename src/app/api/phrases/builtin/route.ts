import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { listBuiltinPhrases } from "@/lib/server/phrases/builtin-service";

const parseLimit = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

export async function GET(request: Request) {
  try {
    assertAllowedOrigin(request);
    const { user } = await requireCurrentProfile();
    const url = new URL(request.url);

    const result = await listBuiltinPhrases({
      userId: user.id,
      level: url.searchParams.get("level"),
      category: url.searchParams.get("category"),
      search: url.searchParams.get("search"),
      limit: parseLimit(url.searchParams.get("limit")),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load builtin phrases.", { request });
  }
}
