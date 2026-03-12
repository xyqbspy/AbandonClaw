import { NextResponse } from "next/server";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import {
  buildPracticeGenerateUserPrompt,
  PRACTICE_GENERATE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/practice-generate-prompt";
import { isValidParsedScene, parseJsonWithFallback } from "@/lib/server/scene-json";
import {
  PracticeExerciseType,
  PracticeGenerateRequest,
  PracticeGenerateResponse,
} from "@/lib/types/scene-parser";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const sanitizeExerciseCount = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 6;
  return clamp(Math.round(value), 3, 12);
};

const isValidExerciseType = (value: unknown): value is PracticeExerciseType =>
  value === "recall" || value === "fill_chunk" || value === "rewrite";

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
    exercises = exercises.map((exercise) => {
      if (!exercise || typeof exercise !== "object") return exercise;
      const item = exercise as Record<string, unknown>;
      if (
        (item.prompt === undefined || item.prompt === null) &&
        typeof item.question === "string"
      ) {
        return {
          ...item,
          prompt: item.question,
        };
      }
      return item;
    });
  }

  return {
    ...record,
    version,
    exercises,
  };
};

const isValidPracticeGenerateResponse = (
  value: unknown,
): value is PracticeGenerateResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as PracticeGenerateResponse;

  if (response.version !== "v1") return false;
  if (!Array.isArray(response.exercises) || response.exercises.length === 0) {
    return false;
  }

  return response.exercises.every((exercise) => {
    if (!exercise || typeof exercise !== "object") return false;
    return (
      typeof exercise.id === "string" &&
      isValidExerciseType(exercise.type) &&
      typeof exercise.prompt === "string" &&
      typeof exercise.answer === "string" &&
      (exercise.referenceSentence === undefined ||
        typeof exercise.referenceSentence === "string") &&
      (exercise.targetChunk === undefined || typeof exercise.targetChunk === "string")
    );
  });
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
        exerciseCount,
      }),
      temperature: 0.3,
    });

    const parsed = normalizePracticeResponse(parseJsonWithFallback(rawModelText));

    if (!isValidPracticeGenerateResponse(parsed)) {
      return NextResponse.json(
        {
          error:
            "Model output JSON does not match PracticeGenerateResponse basic structure.",
        },
        { status: 500 },
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
