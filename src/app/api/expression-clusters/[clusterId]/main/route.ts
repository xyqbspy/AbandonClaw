import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { setExpressionClusterMain } from "@/lib/server/expression-clusters/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ clusterId: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { clusterId } = await context.params;
    const payload = (await request.json()) as {
      mainUserPhraseId?: unknown;
    };

    const mainUserPhraseId =
      typeof payload.mainUserPhraseId === "string" ? payload.mainUserPhraseId.trim() : "";
    if (!clusterId?.trim()) {
      throw new ValidationError("clusterId is required.");
    }
    if (!mainUserPhraseId) {
      throw new ValidationError("mainUserPhraseId is required.");
    }

    const result = await setExpressionClusterMain({
      userId: user.id,
      clusterId: clusterId.trim(),
      mainUserPhraseId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to set expression cluster main.");
  }
}
