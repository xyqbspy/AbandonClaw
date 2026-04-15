import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { requireCurrentProfile } from "@/lib/server/auth";
import { AuthError, ForbiddenError, ValidationError } from "@/lib/server/errors";
import { logApiError } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
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
  normalizePracticeGeneratePayload,
  parsePracticeGenerateRequest,
} from "@/lib/server/request-schemas";
import {
  PracticeExerciseType,
  PracticeGenerateRequest,
  PracticeGenerateResponse,
} from "@/lib/types/scene-parser";
import { buildExerciseSpecsFromScene } from "@/lib/server/exercises/spec-builder";
const PRACTICE_GENERATE_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const PRACTICE_MAX_SECTIONS = 12;
const PRACTICE_MAX_BLOCKS = 80;
const PRACTICE_MAX_SENTENCES = 400;
const PRACTICE_MAX_CHUNKS = 1200;
const PRACTICE_MAX_TEXT_LENGTH = 40000;

const sanitizeExerciseCount = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 6;
  return Math.min(12, Math.max(3, Math.round(value)));
};

const PRACTICE_GENERATE_FALLBACK_MESSAGE = "生成练习题失败，请稍后重试。";

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

const EXPRESSION_CLUSTER_HINTS = [
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

const buildExpressionClustersForPrompt = (
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

  const clusters = EXPRESSION_CLUSTER_HINTS.map((hint) => {
    const presentInScene = hint.expressions.filter((item) =>
      sceneExpressions.has(normalizeExpression(item)),
    );
    return {
      anchor: hint.anchor,
      meaning: hint.meaning,
      expressions: hint.expressions,
      presentInScene,
    };
  }).filter((cluster) => cluster.presentInScene.length > 0);

  return JSON.stringify(clusters, null, 2);
};

const parseWithDiagnostics = (rawText: string) => {
  return {
    jsonCandidate: rawText,
    parsed: parseJsonWithFallback(rawText),
  };
};

const measureScenePayload = (scene: PracticeGenerateRequest["scene"]) => {
  let blockCount = 0;
  let sentenceCount = 0;
  let chunkCount = 0;
  let textLength = 0;

  textLength += scene.title.length;
  textLength += scene.subtitle?.length ?? 0;
  textLength += scene.description?.length ?? 0;

  for (const section of scene.sections) {
    textLength += section.title?.length ?? 0;
    textLength += section.summary?.length ?? 0;
    blockCount += section.blocks.length;

    for (const block of section.blocks) {
      textLength += block.translation?.length ?? 0;
      textLength += block.tts?.length ?? 0;
      sentenceCount += block.sentences.length;

      for (const sentence of block.sentences) {
        textLength += sentence.text.length;
        textLength += sentence.translation?.length ?? 0;
        textLength += sentence.tts?.length ?? 0;
        chunkCount += sentence.chunks.length;

        for (const chunk of sentence.chunks) {
          textLength += chunk.text.length;
          textLength += chunk.translation?.length ?? 0;
          textLength += chunk.grammarLabel?.length ?? 0;
          textLength += chunk.meaningInSentence?.length ?? 0;
          textLength += chunk.usageNote?.length ?? 0;
          textLength += chunk.pronunciation?.length ?? 0;
          textLength += (chunk.notes ?? []).reduce((sum, item) => sum + item.length, 0);
          textLength += (chunk.examples ?? []).reduce(
            (sum, item) => sum + item.en.length + item.zh.length,
            0,
          );
        }
      }
    }
  }

  return {
    sections: scene.sections.length,
    blocks: blockCount,
    sentences: sentenceCount,
    chunks: chunkCount,
    textLength,
  };
};

const toValidPayload = (
  payload: Partial<PracticeGenerateRequest>,
):
  | { ok: true; value: { scene: PracticeGenerateRequest["scene"]; exerciseCount: number } }
  | { ok: false; error: string } => {
  if (!isValidParsedScene(payload.scene)) {
    return { ok: false, error: "练习题生成请求无效。" };
  }

  const metrics = measureScenePayload(payload.scene);
  if (metrics.sections > PRACTICE_MAX_SECTIONS) {
    return { ok: false, error: `场景分段数超过上限 ${PRACTICE_MAX_SECTIONS}。` };
  }
  if (metrics.blocks > PRACTICE_MAX_BLOCKS) {
    return { ok: false, error: `场景块数超过上限 ${PRACTICE_MAX_BLOCKS}。` };
  }
  if (metrics.sentences > PRACTICE_MAX_SENTENCES) {
    return { ok: false, error: `场景句子数超过上限 ${PRACTICE_MAX_SENTENCES}。` };
  }
  if (metrics.chunks > PRACTICE_MAX_CHUNKS) {
    return { ok: false, error: `场景表达块数超过上限 ${PRACTICE_MAX_CHUNKS}。` };
  }
  if (metrics.textLength > PRACTICE_MAX_TEXT_LENGTH) {
    return { ok: false, error: `场景文本长度超过上限 ${PRACTICE_MAX_TEXT_LENGTH}。` };
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

const isPracticeGenerateResponse = (value: unknown): value is PracticeGenerateResponse => {
  if (!isObject(value)) return false;
  if (value.version !== "v1") return false;
  if (!Array.isArray(value.exercises)) return false;
  return true;
};

const localizePracticeGenerateError = (error: unknown) => {
  if (error instanceof AuthError) {
    return new AuthError("请先登录后再生成练习题。");
  }
  if (error instanceof ForbiddenError) {
    return new ForbiddenError("你暂无权限生成练习题。");
  }
  if (error instanceof ValidationError) {
    return error;
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return new AuthError("请先登录后再生成练习题。");
  }
  if (error instanceof Error && error.message === "Forbidden") {
    return new ForbiddenError("你暂无权限生成练习题。");
  }
  return error;
};

interface PracticeGenerateDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  callGlmChatCompletion: typeof callGlmChatCompletion;
  buildExerciseSpecsFromScene: typeof buildExerciseSpecsFromScene;
}

const defaultDependencies: PracticeGenerateDependencies = {
  requireCurrentProfile,
  callGlmChatCompletion,
  buildExerciseSpecsFromScene,
};

export async function handlePracticeGeneratePost(
  request: Request,
  dependencies: PracticeGenerateDependencies = defaultDependencies,
) {
  try {
    assertAllowedOrigin(request);
    const { user } = await dependencies.requireCurrentProfile();
    await enforceRateLimit({
      key: user.id,
      limit: PRACTICE_GENERATE_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      scope: "api-practice-generate",
    });
    const payload = await parsePracticeGenerateRequest(request);
    const { scene, exerciseCount } = normalizePracticeGeneratePayload(payload);

    const fallbackExercises = dependencies.buildExerciseSpecsFromScene(scene, exerciseCount);

    try {
      const rawModelText = await dependencies.callGlmChatCompletion({
        systemPrompt: PRACTICE_GENERATE_SYSTEM_PROMPT,
        userPrompt: buildPracticeGenerateUserPrompt({
          sceneJson: JSON.stringify(scene),
          expressionFamilies: buildExpressionClustersForPrompt(scene),
          exerciseCount,
        }),
        temperature: 0.3,
      });

      const { parsed: parsedJson } = parseWithDiagnostics(rawModelText);
      const parsed = normalizePracticeResponse(parsedJson);
      const validation = validatePracticeGenerateResponse(parsed);
      if (!validation.ok || !isPracticeGenerateResponse(parsed)) {
        return NextResponse.json(
          {
            version: "v1",
            generationSource: "system",
            exercises: fallbackExercises,
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          version: parsed.version,
          generationSource: "ai",
          exercises: parsed.exercises,
        },
        { status: 200 },
      );
    } catch {
      return NextResponse.json(
        {
          version: "v1",
          generationSource: "system",
          exercises: fallbackExercises,
        },
        { status: 200 },
      );
    }
  } catch (error) {
    logApiError("api/practice/generate", error, {
      request,
    });
    return toApiErrorResponse(
      localizePracticeGenerateError(error),
      PRACTICE_GENERATE_FALLBACK_MESSAGE,
      { request },
    );
  }
}

export async function POST(request: Request) {
  return handlePracticeGeneratePost(request);
}
