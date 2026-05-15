import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { requireCurrentProfile } from "@/lib/server/auth";
import { ValidationError } from "@/lib/server/errors";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import {
  buildSceneMutateUserPrompt,
  SCENE_MUTATE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/scene-mutate-prompt";
import {
  isValidParsedScene,
  parseJsonWithFallback,
} from "@/lib/server/scene-json";
import { parseJsonBody } from "@/lib/server/validation";
import { MutateSceneRequest, SceneMutateResponse } from "@/lib/types/scene-parser";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const sanitizeVariantCount = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 2;
  return clamp(Math.round(value), 1, 3);
};

const sanitizeRetainChunkRatio = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.6;
  return clamp(value, 0.5, 0.7);
};

const toValidMutatePayload = (
  payload: Partial<MutateSceneRequest>,
):
  | {
      ok: true;
      value: {
        scene: MutateSceneRequest["scene"];
        variantCount: number;
        retainChunkRatio: number;
        theme?: string;
      };
    }
  | { ok: false; error: string } => {
  if (!isValidParsedScene(payload.scene)) {
    return { ok: false, error: "Invalid payload.scene structure." };
  }

  const variantCount = sanitizeVariantCount(payload.variantCount);
  const retainChunkRatio = sanitizeRetainChunkRatio(payload.retainChunkRatio);
  const theme =
    typeof payload.theme === "string" && payload.theme.trim()
      ? payload.theme.trim()
      : undefined;

  return {
    ok: true,
    value: {
      scene: payload.scene,
      variantCount,
      retainChunkRatio,
      theme,
    },
  };
};

const normalizeMutateResponseVersion = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  const record = value as { version?: unknown };

  if (record.version === "1") {
    return {
      ...(value as Record<string, unknown>),
      version: "v1",
    };
  }

  return value;
};

const isValidSceneMutateResponse = (
  value: unknown,
): value is SceneMutateResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as SceneMutateResponse;

  if (response.version !== "v1") return false;
  if (!Array.isArray(response.variants) || response.variants.length === 0) {
    return false;
  }

  return response.variants.every(isValidParsedScene);
};

interface SceneMutateDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  callGlmChatCompletion: typeof callGlmChatCompletion;
}

const defaultDependencies: SceneMutateDependencies = {
  requireCurrentProfile,
  callGlmChatCompletion,
};

export async function handleSceneMutatePost(
  request: Request,
  dependencies: SceneMutateDependencies = defaultDependencies,
) {
  try {
    await dependencies.requireCurrentProfile();
    const payload = await parseJsonBody<Partial<MutateSceneRequest>>(request);
    const normalized = toValidMutatePayload(payload);

    if (!normalized.ok) {
      throw new ValidationError(normalized.error);
    }

    const { scene, variantCount, retainChunkRatio, theme } = normalized.value;

    const rawModelText = await dependencies.callGlmChatCompletion({
      systemPrompt: SCENE_MUTATE_SYSTEM_PROMPT,
      userPrompt: buildSceneMutateUserPrompt({
        sceneJson: JSON.stringify(scene),
        variantCount,
        retainChunkRatio,
        theme,
      }),
      temperature: 0.3,
    });

    const parsed = normalizeMutateResponseVersion(
      parseJsonWithFallback(rawModelText),
    );

    if (!isValidSceneMutateResponse(parsed)) {
      throw new Error("Model output JSON does not match SceneMutateResponse basic structure.");
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Scene mutate failed.", { request });
  }
}

export async function POST(request: Request) {
  return handleSceneMutatePost(request);
}
