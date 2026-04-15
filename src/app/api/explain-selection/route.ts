import { NextResponse } from "next/server";
import { explainSelection } from "@/lib/explain/provider";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { requireCurrentProfile } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  normalizeExplainSelectionPayload,
  parseExplainSelectionRequest,
} from "@/lib/server/request-schemas";

const EXPLAIN_SELECTION_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

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
    await enforceRateLimit({
      key: user.id,
      limit: EXPLAIN_SELECTION_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      scope: "api-explain-selection",
    });
    const payload = await parseExplainSelectionRequest(request);
    const result = await dependencies.explainSelection(normalizeExplainSelectionPayload(payload));
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
