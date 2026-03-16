import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { updateSceneProgress } from "@/lib/server/services/learning-service";
import {
  parseOptionalNonNegativeDelta,
  parseOptionalNonNegativeInt,
  parseProgressPercent,
} from "@/lib/server/validation";

interface UpdateProgressPayload {
  progressPercent?: unknown;
  lastSentenceIndex?: unknown;
  lastVariantIndex?: unknown;
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
    const payload = (await request.json()) as UpdateProgressPayload;

    const result = await updateSceneProgress(user.id, slug, {
      progressPercent:
        payload.progressPercent == null
          ? undefined
          : parseProgressPercent(payload.progressPercent),
      lastSentenceIndex: parseOptionalNonNegativeInt(
        payload.lastSentenceIndex,
        "lastSentenceIndex",
      ),
      lastVariantIndex: parseOptionalNonNegativeInt(
        payload.lastVariantIndex,
        "lastVariantIndex",
      ),
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
    return toApiErrorResponse(error, "Failed to update scene progress.");
  }
}

