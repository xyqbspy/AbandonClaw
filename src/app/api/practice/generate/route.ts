import { NextResponse } from "next/server";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import {
  buildPracticeGenerateUserPrompt,
  PRACTICE_GENERATE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/practice-generate-prompt";
import {
  parseJsonWithFallback,
  isValidParsedScene,
} from "@/lib/server/scene-json";
import {
  PracticeExerciseType,
  PracticeGenerateRequest,
  PracticeGenerateResponse,
} from "@/lib/types/scene-parser";
import { buildExerciseSpecsFromScene } from "@/lib/server/exercises/spec-builder";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const sanitizeExerciseCount = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 6;
  return clamp(Math.round(value), 3, 12);
};

const isValidExerciseType = (value: unknown): value is PracticeExerciseType =>
  value === "chunk_cloze" ||
  value === "keyword_cloze" ||
  value === "multiple_choice" ||
  value === "typing" ||
  value === "sentence_rebuild" ||
  value === "translation_prompt";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const normalizeExpression = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, " ");

const EXPRESSION_FAMILY_HINTS = [
  {
    anchor: "running on empty",
    meaning: "表示精力见底、非常疲惫",
    expressions: ["running on empty", "exhausted", "worn out", "drained"],
  },
  {
    anchor: "call it a day",
    meaning: "表示今天先收工、到此为止",
    expressions: ["call it a day", "wrap it up", "stop for today"],
  },
  {
    anchor: "get through the day",
    meaning: "表示先把这一天撑过去",
    expressions: ["get through the day", "make it through the day", "survive the day"],
  },
] as const;

const buildExpressionFamiliesForPrompt = (
  scene: PracticeGenerateRequest["scene"],
): string => {
  const sceneExpressions = new Set<string>();
  for (const section of scene.sections) {
    for (const block of section.blocks) {
      for (const sentence of block.sentences) {
        for (const chunk of sentence.chunks) {
          if (!chunk?.text) continue;
          sceneExpressions.add(normalizeExpression(chunk.text));
        }
      }
    }
  }

  const families = EXPRESSION_FAMILY_HINTS.map((hint) => {
    const presentInScene = hint.expressions.filter((item) =>
      sceneExpressions.has(normalizeExpression(item)),
    );
    return {
      anchor: hint.anchor,
      meaning: hint.meaning,
      expressions: hint.expressions,
      presentInScene,
    };
  }).filter((family) => family.presentInScene.length > 0);

  return JSON.stringify(families, null, 2);
};

const parseWithDiagnostics = (rawText: string) => {
  return {
    jsonCandidate: rawText,
    parsed: parseJsonWithFallback(rawText),
  };
};

const toValidPayload = (
  payload: Partial<PracticeGenerateRequest>,
):
  | { ok: true; value: { scene: PracticeGenerateRequest["scene"]; exerciseCount: number } }
  | { ok: false; error: string } => {
  if (!isValidParsedScene(payload.scene)) {
    return { ok: false, error: "Invalid payload.scene structure." };
  }

  return {
    ok: true,
    value: {
      scene: payload.scene,
      exerciseCount: sanitizeExerciseCount(payload.exerciseCount),
    },
  };
};

const normalizePracticeResponse = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;

  const version =
    record.version === undefined
      ? "v1"
      : record.version === "1"
        ? "v1"
        : record.version;

  let exercises = record.exercises;

  if (exercises === undefined && record.practice !== undefined) {
    exercises = record.practice;
  }

  if (exercises && !Array.isArray(exercises) && typeof exercises === "object") {
    exercises = [exercises];
  }

  if (Array.isArray(exercises)) {
    exercises = exercises.map((exercise, index) => {
      if (!exercise || typeof exercise !== "object") return exercise;
      const item = exercise as Record<string, unknown>;
      const normalizedId =
        typeof item.id === "string" && item.id.trim()
          ? item.id
          : `practice-${index + 1}`;
      return {
        ...item,
        id: normalizedId,
        ...((item.prompt === undefined || item.prompt === null) &&
        typeof item.question === "string"
          ? { prompt: item.question }
          : {}),
        ...(item.targetChunk === undefined &&
        typeof item.target_chunk === "string"
          ? { targetChunk: item.target_chunk }
          : {}),
        ...(item.referenceSentence === undefined &&
        typeof item.reference_sentence === "string"
          ? { referenceSentence: item.reference_sentence }
          : {}),
      };
    });
  }

  return {
    ...record,
    version,
    exercises,
  };
};

const validatePracticeGenerateResponse = (
  value: unknown,
): { ok: true } | { ok: false; error: string } => {
  if (!isObject(value)) {
    return { ok: false, error: "Top-level JSON must be an object." };
  }
  const response = value as unknown as PracticeGenerateResponse;

  if (response.version !== "v1") {
    return {
      ok: false,
      error: `Invalid version: expected "v1", got ${JSON.stringify(response.version)}.`,
    };
  }

  if (!Array.isArray(response.exercises)) {
    return { ok: false, error: "exercises must be an array." };
  }

  for (let i = 0; i < response.exercises.length; i += 1) {
    const exercise = response.exercises[i];
    if (!isObject(exercise)) {
      return { ok: false, error: `exercises[${i}] must be an object.` };
    }

    if (typeof exercise.id !== "string" || !exercise.id.trim()) {
      return { ok: false, error: `exercises[${i}] missing required id.` };
    }

    if (!isValidExerciseType(exercise.type)) {
      return {
        ok: false,
        error: `exercises[${i}] invalid type: ${JSON.stringify(exercise.type)}.`,
      };
    }

    if (typeof exercise.prompt !== "string" || !exercise.prompt.trim()) {
      return { ok: false, error: `exercises[${i}] missing required prompt.` };
    }

    if (!isObject(exercise.answer)) {
      return { ok: false, error: `exercises[${i}] missing required answer object.` };
    }
    if (typeof exercise.answer.text !== "string" || !exercise.answer.text.trim()) {
      return { ok: false, error: `exercises[${i}] missing required answer.` };
    }
  }

  return { ok: true };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<PracticeGenerateRequest>;
    const normalized = toValidPayload(payload);

    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { scene, exerciseCount } = normalized.value;

    const rawModelText = await callGlmChatCompletion({
      systemPrompt: PRACTICE_GENERATE_SYSTEM_PROMPT,
      userPrompt: buildPracticeGenerateUserPrompt({
        sceneJson: JSON.stringify(scene),
        expressionFamilies: buildExpressionFamiliesForPrompt(scene),
        exerciseCount,
      }),
      temperature: 0.3,
    });

    const { parsed: parsedJson } = parseWithDiagnostics(rawModelText);
    const parsed = normalizePracticeResponse(parsedJson);
    const validation = validatePracticeGenerateResponse(parsed);
    if (!validation.ok) {
      const fallback = buildExerciseSpecsFromScene(scene, exerciseCount);
      return NextResponse.json(
        {
          version: "v1",
          exercises: fallback,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate practice.";
    return NextResponse.json(
      { error: `Practice generate failed: ${message}` },
      { status: 500 },
    );
  }
}
