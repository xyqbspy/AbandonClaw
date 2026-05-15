import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { parseJsonBody, parseRequiredTrimmedString } from "@/lib/server/validation";
import { completeSceneVariantRun } from "@/lib/server/learning/variant-service";

interface CompleteSceneVariantRunPayload extends Record<string, unknown> {
  variantSetId?: unknown;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const payload = await parseJsonBody<CompleteSceneVariantRunPayload>(request);
    const result = await completeSceneVariantRun(user.id, slug, {
      variantSetId: parseRequiredTrimmedString(payload.variantSetId, "variantSetId", 120),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to complete scene variant run.", { request });
  }
}
