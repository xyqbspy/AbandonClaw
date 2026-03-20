import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import { extractJsonCandidate } from "@/lib/server/scene-json";
import {
  MANUAL_EXPRESSION_ASSIST_SYSTEM_PROMPT,
  buildManualExpressionAssistUserPrompt,
  buildManualSentenceAssistUserPrompt,
} from "@/lib/server/prompts/manual-phrase-assist-prompt";
import { normalizePhraseText } from "@/lib/shared/phrases";

const SIMILAR_LABELS = new Set([
  "更温和",
  "更口语",
  "更直接",
  "更偏恢复规律",
  "更偏重新开始",
  "更偏提醒别做过头",
  "相关说法",
]);

const CONTRAST_LABELS = new Set([
  "相反方向",
  "相反策略",
  "相反做法",
  "相反态度",
]);

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

const safeTrim = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const sanitizeCandidate = (params: {
  value: unknown;
  normalizedBase: string;
  existingSet: Set<string>;
  labels: Set<string>;
  fallbackLabel: string;
}) => {
  if (!isObject(params.value)) return null;
  const text = safeTrim(params.value.text, 120);
  if (!text || text.length < 2) return null;
  const normalized = normalizePhraseText(text);
  if (!normalized || normalized === params.normalizedBase || params.existingSet.has(normalized)) {
    return null;
  }
  const rawLabel = safeTrim(params.value.differenceLabel, 40);
  return {
    text,
    differenceLabel: params.labels.has(rawLabel) ? rawLabel : params.fallbackLabel,
  };
};

export async function POST(request: Request) {
  try {
    await requireCurrentProfile();
    const payload = (await request.json()) as {
      mode?: unknown;
      text?: unknown;
      existingExpressions?: unknown;
    };

    const mode = safeTrim(payload.mode, 20);
    const text = safeTrim(payload.text, 3000);
    if (!text) {
      return NextResponse.json({ error: "text is required." }, { status: 400 });
    }

    if (mode === "sentence") {
      const rawText = await callGlmChatCompletion({
        systemPrompt: MANUAL_EXPRESSION_ASSIST_SYSTEM_PROMPT,
        userPrompt: buildManualSentenceAssistUserPrompt({ text }),
        temperature: 0.2,
      });

      const parsed = parseWithDiagnostics(rawText);
      if (!isObject(parsed) || parsed.version !== "v1" || !isObject(parsed.sentenceItem)) {
        return NextResponse.json({ error: "Invalid sentence assist response." }, { status: 500 });
      }

      const extractedExpressions = Array.isArray(parsed.sentenceItem.extractedExpressions)
        ? Array.from(
            new Set(
              parsed.sentenceItem.extractedExpressions
                .map((item) => safeTrim(item, 120))
                .filter(Boolean)
                .filter((item) => normalizePhraseText(item).length > 0),
            ),
          ).slice(0, 5)
        : [];

      return NextResponse.json(
        {
          version: "v1",
          sentenceItem: {
            text,
            translation: safeTrim(parsed.sentenceItem.translation, 200),
            usageNote: safeTrim(parsed.sentenceItem.usageNote, 300),
            semanticFocus: safeTrim(parsed.sentenceItem.semanticFocus, 40),
            typicalScenario: safeTrim(parsed.sentenceItem.typicalScenario, 80),
            extractedExpressions,
          },
        },
        { status: 200 },
      );
    }

    const existingExpressions = Array.isArray(payload.existingExpressions)
      ? payload.existingExpressions.filter((item): item is string => typeof item === "string")
      : [];
    const normalizedBase = normalizePhraseText(text);
    const existingSet = new Set(
      existingExpressions.map((item) => normalizePhraseText(item)).filter(Boolean),
    );

    const rawText = await callGlmChatCompletion({
      systemPrompt: MANUAL_EXPRESSION_ASSIST_SYSTEM_PROMPT,
      userPrompt: buildManualExpressionAssistUserPrompt({
        text,
        existingExpressions,
      }),
      temperature: 0.2,
    });

    const parsed = parseWithDiagnostics(rawText);
    if (!isObject(parsed) || parsed.version !== "v1" || !isObject(parsed.inputItem)) {
      return NextResponse.json({ error: "Invalid expression assist response." }, { status: 500 });
    }

    const dedupe = new Set<string>();
    const dedupeFilter = (candidate: { text: string }) => {
      const normalized = normalizePhraseText(candidate.text);
      if (!normalized || dedupe.has(normalized)) return false;
      dedupe.add(normalized);
      return true;
    };

    const similarExpressions = Array.isArray(parsed.similarExpressions)
      ? parsed.similarExpressions
          .map((item) =>
            sanitizeCandidate({
              value: item,
              normalizedBase,
              existingSet,
              labels: SIMILAR_LABELS,
              fallbackLabel: "相关说法",
            }),
          )
          .filter((item): item is { text: string; differenceLabel: string } => Boolean(item))
          .filter(dedupeFilter)
          .slice(0, 8)
      : [];

    const contrastExpressions = Array.isArray(parsed.contrastExpressions)
      ? parsed.contrastExpressions
          .map((item) =>
            sanitizeCandidate({
              value: item,
              normalizedBase,
              existingSet,
              labels: CONTRAST_LABELS,
              fallbackLabel: "相反方向",
            }),
          )
          .filter((item): item is { text: string; differenceLabel: string } => Boolean(item))
          .filter(dedupeFilter)
          .slice(0, 5)
      : [];

      return NextResponse.json(
        {
          version: "v1",
          inputItem: {
            text,
            translation: safeTrim(parsed.inputItem.translation, 200),
            usageNote: safeTrim(parsed.inputItem.usageNote, 300),
            examples: Array.isArray(parsed.inputItem.examples)
              ? parsed.inputItem.examples
                  .filter((item): item is Record<string, unknown> => isObject(item))
                  .map((item) => ({
                    en: safeTrim(item.en, 500),
                    zh: safeTrim(item.zh, 200),
                  }))
                  .filter((item) => item.en && item.zh)
                  .slice(0, 2)
              : [],
            semanticFocus: safeTrim(parsed.inputItem.semanticFocus, 40),
            typicalScenario: safeTrim(parsed.inputItem.typicalScenario, 80),
          },
        similarExpressions,
        contrastExpressions,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate manual phrase assist.";
    return NextResponse.json(
      { error: `Manual phrase assist failed: ${message}` },
      { status: 500 },
    );
  }
}
