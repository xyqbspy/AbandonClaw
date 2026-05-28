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
import {
  ensureProfileOrAnonymousQuota,
  isAnonymousAccessError,
  type ProfileOrAnonymousDependencies,
  type ProfileOrAnonymousResult,
} from "@/lib/server/anonymous/route-guard";
import {
  attachAnonymousQuotaHeaders,
  buildAnonymousQuotaHeaders,
} from "@/lib/server/anonymous/quota-headers";

const EXPLAIN_SELECTION_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface ExplainSelectionDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  explainSelection: typeof explainSelection;
  reserveHighCostUsage: typeof reserveHighCostUsage;
  markHighCostUsage: typeof markHighCostUsage;
  anonymous?: ProfileOrAnonymousDependencies;
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
  let accessResult: ProfileOrAnonymousResult | null = null;
  try {
    assertAllowedOrigin(request);
    accessResult = await ensureProfileOrAnonymousQuota(
      "explain_selection",
      request,
      () => dependencies.requireCurrentProfile(),
      dependencies.anonymous,
    );

    const payload = await parseExplainSelectionRequest(request);
    const normalizedPayload = normalizeExplainSelectionPayload(payload);

    if (accessResult.mode === "registered") {
      const { user, profile } = accessResult;
      assertProfileCanGenerate(profile);
      await enforceHighCostRateLimit({
        request,
        userId: user.id,
        scope: "api-explain-selection",
        userLimit: EXPLAIN_SELECTION_RATE_LIMIT,
        ipLimit: EXPLAIN_SELECTION_RATE_LIMIT * 2,
        windowMs: RATE_LIMIT_WINDOW_MS,
      });
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
    }

    const { quotaResult } = accessResult;
    const result = await dependencies.explainSelection(normalizedPayload);
    return attachAnonymousQuotaHeaders(
      NextResponse.json(result, { status: 200 }),
      quotaResult,
    );
  } catch (error) {
    const userType =
      accessResult?.mode === "anonymous" || isAnonymousAccessError(error)
        ? "anonymous"
        : "registered";
    logApiError("api/explain-selection", error, { request, userType });
    const response = toApiErrorResponse(error, "释义服务暂时不可用。", {
      request,
      userType,
    });
    if (accessResult?.mode === "anonymous") {
      const headers = buildAnonymousQuotaHeaders(accessResult.quotaResult);
      for (const [name, value] of Object.entries(headers)) {
        response.headers.set(name, value);
      }
    }
    return response;
  }
}

export async function POST(request: Request) {
  return handleExplainSelectionPost(request);
}
