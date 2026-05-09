import { NextResponse } from "next/server";
import { requireVerifiedCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import { enforceHighCostRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import {
  SIMILAR_EXPRESSION_GENERATE_SYSTEM_PROMPT,
  buildSimilarExpressionGenerateUserPrompt,
} from "@/lib/server/prompts/similar-expression-prompt";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { extractJsonCandidate } from "@/lib/server/scene-json";
import { parseJsonBody } from "@/lib/server/validation";

const ALLOWED_LABELS = new Set([
  "更口语",
  "更强烈",
  "更偏直接预测",
  "更偏有迹象",
  "更常用于疲惫状态",
  "相关说法",
]);
const SIMILAR_GENERATE_RATE_LIMIT = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const parseWithDiagnostics = (rawText: string) => {
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    const jsonCandidate = extractJsonCandidate(rawText);
    if (!jsonCandidate) {
      throw new Error("Model output is not valid JSON.");
    }
    return JSON.parse(jsonCandidate) as unknown;
  }
};

const sanitizeCandidate = (
  value: unknown,
  normalizedBase: string,
  existingSet: Set<string>,
) => {
  if (!isObject(value)) return null;
  const text = typeof value.text === "string" ? value.text.trim() : "";
  if (!text || text.length < 2 || text.length > 120) return null;
  const normalized = normalizePhraseText(text);
  if (!normalized || normalized === normalizedBase || existingSet.has(normalized)) return null;

  const rawLabel = typeof value.differenceLabel === "string" ? value.differenceLabel.trim() : "";
  const differenceLabel = ALLOWED_LABELS.has(rawLabel) ? rawLabel : "相关说法";
  return { text, differenceLabel };
};

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    const { user } = await requireVerifiedCurrentProfile();
    await enforceHighCostRateLimit({
      request,
      userId: user.id,
      scope: "api-similar-generate",
      userLimit: SIMILAR_GENERATE_RATE_LIMIT,
      ipLimit: SIMILAR_GENERATE_RATE_LIMIT * 2,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    const payload = await parseJsonBody<{
      baseExpression?: unknown;
      existingExpressions?: unknown;
    }>(request);

    const baseExpression =
      typeof payload.baseExpression === "string" ? payload.baseExpression.trim() : "";
    if (!baseExpression) {
      throw new ValidationError("baseExpression is required.");
    }

    const normalizedBase = normalizePhraseText(baseExpression);
    if (!normalizedBase) {
      throw new ValidationError("baseExpression is invalid.");
    }

    const existingExpressions = Array.isArray(payload.existingExpressions)
      ? payload.existingExpressions.filter((item): item is string => typeof item === "string")
      : [];
    const existingSet = new Set(
      existingExpressions.map((item) => normalizePhraseText(item)).filter(Boolean),
    );

    const rawText = await callGlmChatCompletion({
      systemPrompt: SIMILAR_EXPRESSION_GENERATE_SYSTEM_PROMPT,
      userPrompt: buildSimilarExpressionGenerateUserPrompt({
        baseExpression,
        existingExpressions,
      }),
      temperature: 0.2,
    });

    const parsed = parseWithDiagnostics(rawText);
    if (!isObject(parsed) || parsed.version !== "v1" || !Array.isArray(parsed.candidates)) {
      throw new Error("Invalid similar-expression response.");
    }

    const dedupe = new Set<string>();
    const candidates = parsed.candidates
      .map((item) => sanitizeCandidate(item, normalizedBase, existingSet))
      .filter((item): item is { text: string; differenceLabel: string } => Boolean(item))
      .filter((item) => {
        const normalized = normalizePhraseText(item.text);
        if (dedupe.has(normalized)) return false;
        dedupe.add(normalized);
        return true;
      })
      .slice(0, 8);

    return NextResponse.json(
      {
        version: "v1",
        candidates,
      },
      { status: 200 },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Similar expression generate failed.");
  }
}
