import { NextResponse } from "next/server";
import { requireVerifiedCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
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
    const { user } = await requireVerifiedCurrentProfile();
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
    const response = await generateExpressionMap({
      userId: user.id,
      payload,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to generate expression map.");
  }
}
