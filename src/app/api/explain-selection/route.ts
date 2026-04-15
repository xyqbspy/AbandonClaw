import { NextResponse } from "next/server";
import { explainSelection } from "@/lib/explain/provider";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { requireCurrentProfile } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
  parseRequiredStringArray,
  parseRequiredTrimmedString,
} from "@/lib/server/validation";
import { ExplainSelectionRequest } from "@/lib/types";

const EXPLAIN_SELECTION_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const parseExplainSelectionPayload = (
  payload: Partial<ExplainSelectionRequest>,
): ExplainSelectionRequest => ({
  selectedText: parseRequiredTrimmedString(payload.selectedText, "selectedText", 240),
  sourceSentence: parseRequiredTrimmedString(payload.sourceSentence, "sourceSentence", 1500),
  sourceTranslation: parseOptionalTrimmedString(
    payload.sourceTranslation,
    "sourceTranslation",
    1500,
  ),
  sourceChunks:
    payload.sourceChunks == null
      ? undefined
      : parseRequiredStringArray(payload.sourceChunks, "sourceChunks", {
          maxItems: 24,
          maxItemLength: 200,
        }),
  lessonId: parseRequiredTrimmedString(payload.lessonId, "lessonId", 120),
  lessonTitle: parseRequiredTrimmedString(payload.lessonTitle, "lessonTitle", 160),
  lessonDifficulty: parseRequiredTrimmedString(
    payload.lessonDifficulty,
    "lessonDifficulty",
    40,
  ),
});

interface ExplainSelectionDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  explainSelection: typeof explainSelection;
}

const defaultDependencies: ExplainSelectionDependencies = {
  requireCurrentProfile,
  explainSelection,
};

export async function handleExplainSelectionPost(
  request: Request,
  dependencies: ExplainSelectionDependencies = defaultDependencies,
) {
  try {
    assertAllowedOrigin(request);
    const { user } = await dependencies.requireCurrentProfile();
    enforceRateLimit({
      key: user.id,
      limit: EXPLAIN_SELECTION_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      scope: "api-explain-selection",
    });
    const payload = await parseJsonBody<Partial<ExplainSelectionRequest>>(request);
    const result = await dependencies.explainSelection(parseExplainSelectionPayload(payload));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logApiError("api/explain-selection", error, {
      request,
    });
    return toApiErrorResponse(error, "释义服务暂时不可用。", { request });
  }
}

export async function POST(request: Request) {
  return handleExplainSelectionPost(request);
}
