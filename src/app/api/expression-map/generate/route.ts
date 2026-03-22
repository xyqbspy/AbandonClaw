import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  generateExpressionMap,
  parseExpressionMapGenerateRequest,
} from "@/lib/server/expression-map/service";
import { parseJsonBody } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
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
