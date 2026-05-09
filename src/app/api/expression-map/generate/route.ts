import { NextResponse } from "next/server";
import { assertProfileCanGenerate, requireVerifiedCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { markHighCostUsage, reserveHighCostUsage } from "@/lib/server/high-cost-usage";
import { enforceHighCostRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  generateExpressionMap,
  parseExpressionMapGenerateRequest,
} from "@/lib/server/expression-map/service";
import { parseJsonBody } from "@/lib/server/validation";

const EXPRESSION_MAP_GENERATE_RATE_LIMIT = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    const { user, profile } = await requireVerifiedCurrentProfile();
    assertProfileCanGenerate(profile);
    await enforceHighCostRateLimit({
      request,
      userId: user.id,
      scope: "api-expression-map-generate",
      userLimit: EXPRESSION_MAP_GENERATE_RATE_LIMIT,
      ipLimit: EXPRESSION_MAP_GENERATE_RATE_LIMIT * 2,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    const payloadRaw = await parseJsonBody<Record<string, unknown>>(request);
    const payload = parseExpressionMapGenerateRequest(payloadRaw);
    const reservation = await reserveHighCostUsage({
      userId: user.id,
      capability: "expression_map_generate",
    });
    let response;
    try {
      response = await generateExpressionMap({
        userId: user.id,
        payload,
      });
      await markHighCostUsage(reservation, "success");
    } catch (error) {
      await markHighCostUsage(reservation, "failed");
      throw error;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to generate expression map.");
  }
}
