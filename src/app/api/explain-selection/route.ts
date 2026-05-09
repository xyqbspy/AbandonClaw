import { NextResponse } from "next/server";
import { explainSelection } from "@/lib/explain/provider";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { requireCurrentProfile, requireVerifiedCurrentProfile } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";
import { enforceHighCostRateLimit } from "@/lib/server/rate-limit";
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
  requireCurrentProfile: requireVerifiedCurrentProfile,
  explainSelection,
};

export async function handleExplainSelectionPost(
  request: Request,
  dependencies: ExplainSelectionDependencies = defaultDependencies,
) {
  try {
    assertAllowedOrigin(request);
    const { user } = await dependencies.requireCurrentProfile();
    await enforceHighCostRateLimit({
      request,
      userId: user.id,
      scope: "api-explain-selection",
      userLimit: EXPLAIN_SELECTION_RATE_LIMIT,
      ipLimit: EXPLAIN_SELECTION_RATE_LIMIT * 2,
      windowMs: RATE_LIMIT_WINDOW_MS,
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
