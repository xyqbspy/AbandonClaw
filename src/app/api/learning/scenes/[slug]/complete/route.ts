import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { completeSceneLearning } from "@/lib/server/services/learning-service";
import { parseOptionalNonNegativeDelta } from "@/lib/server/validation";

interface CompletePayload {
  studySecondsDelta?: unknown;
  savedPhraseDelta?: unknown;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { slug } = await context.params;
    const payload = (await request.json()) as CompletePayload;

    const result = await completeSceneLearning(user.id, slug, {
      studySecondsDelta: parseOptionalNonNegativeDelta(
        payload.studySecondsDelta,
        "studySecondsDelta",
      ),
      savedPhraseDelta: parseOptionalNonNegativeDelta(
        payload.savedPhraseDelta,
        "savedPhraseDelta",
      ),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to complete scene learning.");
  }
}

