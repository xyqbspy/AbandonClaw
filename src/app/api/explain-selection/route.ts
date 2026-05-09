import { NextResponse } from "next/server";
import { explainSelection } from "@/lib/explain/provider";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  assertProfileCanGenerate,
  requireCurrentProfile,
  requireVerifiedCurrentProfile,
} from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";
import { enforceHighCostRateLimit } from "@/lib/server/rate-limit";
import { markHighCostUsage, reserveHighCostUsage } from "@/lib/server/high-cost-usage";
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
  reserveHighCostUsage: typeof reserveHighCostUsage;
  markHighCostUsage: typeof markHighCostUsage;
}

const defaultDependencies: ExplainSelectionDependencies = {
  requireCurrentProfile: requireVerifiedCurrentProfile,
  explainSelection,
  reserveHighCostUsage,
  markHighCostUsage,
};

export async function handleExplainSelectionPost(
  request: Request,
  dependencies: ExplainSelectionDependencies = defaultDependencies,
) {
  try {
    assertAllowedOrigin(request);
    const { user, profile } = await dependencies.requireCurrentProfile();
    assertProfileCanGenerate(profile);
    await enforceHighCostRateLimit({
      request,
      userId: user.id,
      scope: "api-explain-selection",
      userLimit: EXPLAIN_SELECTION_RATE_LIMIT,
      ipLimit: EXPLAIN_SELECTION_RATE_LIMIT * 2,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    const payload = await parseExplainSelectionRequest(request);
    const normalizedPayload = normalizeExplainSelectionPayload(payload);
    const reservation = await dependencies.reserveHighCostUsage({
      userId: user.id,
      capability: "explain_selection",
    });
    try {
      const result = await dependencies.explainSelection(normalizedPayload);
      await dependencies.markHighCostUsage(reservation, "success");
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      await dependencies.markHighCostUsage(reservation, "failed");
      throw error;
    }
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
