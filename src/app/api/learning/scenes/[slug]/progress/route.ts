import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { updateSceneProgress } from "@/lib/server/learning/service";
import {
  parseJsonBody,
  parseOptionalNonNegativeDelta,
  parseOptionalNonNegativeInt,
  parseProgressPercent,
} from "@/lib/server/validation";

interface UpdateProgressPayload extends Record<string, unknown> {
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
    assertAllowedOrigin(request);
    const { user } = await requireCurrentProfile();
    const { slug } = await context.params;
    const payload = await parseJsonBody<UpdateProgressPayload>(request);

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
    return toApiErrorResponse(error, "Failed to update scene progress.", { request });
  }
}

