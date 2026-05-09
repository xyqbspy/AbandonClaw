import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";
import {
  getSceneVariantRunSnapshot,
  startSceneVariantRun,
} from "@/lib/server/learning/variant-service";

interface StartSceneVariantRunPayload extends Record<string, unknown> {
  variantSetId?: unknown;
  activeVariantId?: unknown;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const payload = await parseJsonBody<StartSceneVariantRunPayload>(request);
    const result = await startSceneVariantRun(user.id, slug, {
      variantSetId: parseRequiredTrimmedString(payload.variantSetId, "variantSetId", 120),
      activeVariantId: parseOptionalTrimmedString(
        payload.activeVariantId,
        "activeVariantId",
        120,
      ),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to start scene variant run.");
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { slug } = await context.params;
    const url = new URL(request.url);
    const result = await getSceneVariantRunSnapshot(user.id, slug, {
      variantSetId: parseOptionalTrimmedString(
        url.searchParams.get("variantSetId"),
        "variantSetId",
        120,
      ),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load scene variant run snapshot.");
  }
}
