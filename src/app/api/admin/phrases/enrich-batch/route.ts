import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { enrichAdminUserPhrasesByIds } from "@/lib/server/admin/service";
import { parseJsonBody, parseRequiredStringArray } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = await parseJsonBody<{ userPhraseIds?: unknown }>(request);
    const userPhraseIds = parseRequiredStringArray(payload.userPhraseIds, "userPhraseIds");

    const result = await enrichAdminUserPhrasesByIds(userPhraseIds);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to enrich admin phrases in batch.");
  }
}
