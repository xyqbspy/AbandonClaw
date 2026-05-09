import { NextResponse } from "next/server";
import { assertProfileCanWrite, requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { parseJsonBody, parseRequiredTrimmedString } from "@/lib/server/validation";
import { completeScenePracticeRun } from "@/lib/server/learning/practice-service";

interface CompleteScenePracticeRunPayload extends Record<string, unknown> {
  practiceSetId?: unknown;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user, profile } = await requireCurrentProfile();
    assertProfileCanWrite(profile);
    const { slug } = await context.params;
    const payload = await parseJsonBody<CompleteScenePracticeRunPayload>(request);
    const result = await completeScenePracticeRun(user.id, slug, {
      practiceSetId: parseRequiredTrimmedString(payload.practiceSetId, "practiceSetId", 120),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to complete scene practice run.");
  }
}
