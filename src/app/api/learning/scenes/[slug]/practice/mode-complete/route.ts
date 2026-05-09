import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
  parsePracticeMode,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";
import { markScenePracticeModeComplete } from "@/lib/server/learning/practice-service";

interface MarkScenePracticeModeCompletePayload extends Record<string, unknown> {
  practiceSetId?: unknown;
  mode?: unknown;
  nextMode?: unknown;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const payload = await parseJsonBody<MarkScenePracticeModeCompletePayload>(request);
    const nextModeRaw = parseOptionalTrimmedString(payload.nextMode, "nextMode", 40);
    const result = await markScenePracticeModeComplete(user.id, slug, {
      practiceSetId: parseRequiredTrimmedString(payload.practiceSetId, "practiceSetId", 120),
      mode: parsePracticeMode(payload.mode),
      nextMode: nextModeRaw ? parsePracticeMode(nextModeRaw) : undefined,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to complete practice mode.");
  }
}
