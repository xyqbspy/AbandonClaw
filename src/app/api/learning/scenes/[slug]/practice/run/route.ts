import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
  parsePracticeMode,
  parseRequiredTrimmedString,
  parseSourceType,
} from "@/lib/server/validation";
import {
  getScenePracticeSnapshot,
  startScenePracticeRun,
} from "@/lib/server/learning/practice-service";

interface StartScenePracticeRunPayload extends Record<string, unknown> {
  practiceSetId?: unknown;
  mode?: unknown;
  sourceType?: unknown;
  sourceVariantId?: unknown;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const payload = await parseJsonBody<StartScenePracticeRunPayload>(request);
    const result = await startScenePracticeRun(user.id, slug, {
      practiceSetId: parseRequiredTrimmedString(payload.practiceSetId, "practiceSetId", 120),
      mode: parsePracticeMode(payload.mode),
      sourceType: parseSourceType(payload.sourceType),
      sourceVariantId: parseOptionalTrimmedString(payload.sourceVariantId, "sourceVariantId", 64),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to start scene practice run.");
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const practiceSetId = searchParams.get("practiceSetId")?.trim() || undefined;
    const result = await getScenePracticeSnapshot(user.id, slug, {
      practiceSetId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load scene practice run.");
  }
}
