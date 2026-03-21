import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { listUserPhraseRelations, listUserPhraseRelationsBatch } from "@/lib/server/phrases/service";

export async function GET(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const { searchParams } = new URL(request.url);
    const userPhraseId = searchParams.get("userPhraseId")?.trim() ?? "";
    const userPhraseIds = (searchParams.get("userPhraseIds") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!userPhraseId && userPhraseIds.length === 0) {
      throw new ValidationError("userPhraseId or userPhraseIds is required.");
    }

    const rows =
      userPhraseIds.length > 0
        ? await listUserPhraseRelationsBatch({
            userId: user.id,
            userPhraseIds,
          })
        : await listUserPhraseRelations({
            userId: user.id,
            userPhraseId,
          });

    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load phrase relations.");
  }
}
