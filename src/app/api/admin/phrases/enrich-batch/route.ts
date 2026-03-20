import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { enrichAdminUserPhrasesByIds } from "@/lib/server/admin/service";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = (await request.json()) as { userPhraseIds?: unknown };
    const userPhraseIds = Array.isArray(payload.userPhraseIds)
      ? payload.userPhraseIds.map((value) => String(value ?? "").trim()).filter(Boolean)
      : [];

    if (userPhraseIds.length === 0) {
      return NextResponse.json({ error: "userPhraseIds is required." }, { status: 400 });
    }

    const result = await enrichAdminUserPhrasesByIds(userPhraseIds);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to enrich admin phrases in batch.");
  }
}
