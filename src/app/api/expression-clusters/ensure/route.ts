import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { ensureExpressionClusterForPhrase } from "@/lib/server/expression-clusters/service";

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const payload = (await request.json()) as {
      userPhraseId?: unknown;
      title?: unknown;
    };

    const userPhraseId =
      typeof payload.userPhraseId === "string" ? payload.userPhraseId.trim() : "";
    const title = typeof payload.title === "string" ? payload.title.trim() : "";

    if (!userPhraseId) {
      throw new ValidationError("userPhraseId is required.");
    }

    const result = await ensureExpressionClusterForPhrase({
      userId: user.id,
      userPhraseId,
      title: title || undefined,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to ensure expression cluster.");
  }
}
