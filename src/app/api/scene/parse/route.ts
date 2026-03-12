import { NextResponse } from "next/server";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import {
  buildSceneParseUserPrompt,
  SCENE_PARSE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/scene-parse-prompt";
import {
  extractJsonCandidate,
  isValidSceneParserResponse,
  normalizeSceneParserResponseVersion,
} from "@/lib/server/scene-json";
import { ParseSceneRequest } from "@/lib/types/scene-parser";

const isValidPayload = (
  payload: Partial<ParseSceneRequest>,
): payload is ParseSceneRequest => {
  const sourceLanguageValid =
    payload.sourceLanguage === undefined ||
    payload.sourceLanguage === "en" ||
    payload.sourceLanguage === "zh" ||
    payload.sourceLanguage === "mixed";

  return Boolean(payload.rawText?.trim()) && sourceLanguageValid;
};

const parseWithDiagnostics = (rawText: string) => {
  try {
    return {
      jsonCandidate: rawText,
      parsed: JSON.parse(rawText) as unknown,
    };
  } catch {
    const jsonCandidate = extractJsonCandidate(rawText);
    if (!jsonCandidate) {
      throw new Error(
        "Model output is not valid JSON and no JSON object could be extracted.",
      );
    }

    try {
      return {
        jsonCandidate,
        parsed: JSON.parse(jsonCandidate) as unknown,
      };
    } catch {
      throw new Error("Extracted JSON candidate is still invalid JSON.");
    }
  }
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const normalizeSceneResponse = (value: unknown): unknown => {
  const withVersion = normalizeSceneParserResponseVersion(value);
  if (!isObject(withVersion)) return withVersion;

  const topLevel = withVersion as Record<string, unknown>;
  let normalizedTop = { ...topLevel };

  // Minimal compatibility: model may return ParsedScene directly.
  if (!isObject(normalizedTop.scene) && "sections" in normalizedTop) {
    normalizedTop = {
      version: "v1",
      scene: normalizedTop,
    };
  }

  if (!isObject(normalizedTop.scene)) return normalizedTop;

  const scene = { ...(normalizedTop.scene as Record<string, unknown>) };

  // 1) sections on top-level -> move into scene.
  if (scene.sections === undefined && normalizedTop.sections !== undefined) {
    scene.sections = normalizedTop.sections;
  }

  // 2) scene.sections object -> wrap into array.
  if (scene.sections && !Array.isArray(scene.sections) && isObject(scene.sections)) {
    scene.sections = [scene.sections];
  }

  // Keep glossary compatible if model puts it at top-level.
  if (scene.glossary === undefined && normalizedTop.glossary !== undefined) {
    scene.glossary = normalizedTop.glossary;
  }

  // 3) fill missing chunk.key from chunk.text.
  if (Array.isArray(scene.sections)) {
    scene.sections = scene.sections.map((section) => {
      if (!isObject(section)) return section;
      if (!Array.isArray(section.sentences)) return section;

      const nextSentences = section.sentences.map((sentence) => {
        if (!isObject(sentence) || !Array.isArray(sentence.chunks)) return sentence;

        const nextChunks = sentence.chunks.map((chunk) => {
          if (!isObject(chunk)) return chunk;
          if (typeof chunk.key === "string" && chunk.key.trim()) return chunk;
          if (typeof chunk.text === "string" && chunk.text.trim()) {
            return {
              ...chunk,
              key: chunk.text,
            };
          }
          return chunk;
        });

        return {
          ...sentence,
          chunks: nextChunks,
        };
      });

      return {
        ...section,
        sentences: nextSentences,
      };
    });
  }

  return {
    ...normalizedTop,
    scene,
  };
};

const validateSceneParserResponse = (
  value: unknown,
): { ok: true } | { ok: false; error: string } => {
  if (!isObject(value)) {
    return { ok: false, error: "Top-level JSON must be an object." };
  }

  const version = value.version;
  if (version !== "v1") {
    return {
      ok: false,
      error: `Invalid version: expected \"v1\", got ${JSON.stringify(version)}.`,
    };
  }

  if (!isObject(value.scene)) {
    return { ok: false, error: "Missing top-level scene object." };
  }

  const scene = value.scene as Record<string, unknown>;

  if (!Array.isArray(scene.sections)) {
    return { ok: false, error: "scene.sections must be an array." };
  }

  for (let i = 0; i < scene.sections.length; i += 1) {
    const section = scene.sections[i];
    if (!isObject(section)) {
      return { ok: false, error: `scene.sections[${i}] must be an object.` };
    }

    if (!Array.isArray(section.sentences)) {
      return {
        ok: false,
        error: `scene.sections[${i}].sentences must be an array.`,
      };
    }

    for (let j = 0; j < section.sentences.length; j += 1) {
      const sentence = section.sentences[j];
      if (!isObject(sentence)) {
        return {
          ok: false,
          error: `scene.sections[${i}].sentences[${j}] must be an object.`,
        };
      }

      if (typeof sentence.text !== "string" || !sentence.text.trim()) {
        return {
          ok: false,
          error: `scene.sections[${i}].sentences[${j}] missing required text.`,
        };
      }

      if (typeof sentence.translation !== "string") {
        return {
          ok: false,
          error: `scene.sections[${i}].sentences[${j}] missing required translation.`,
        };
      }

      if (!Array.isArray(sentence.chunks)) {
        return {
          ok: false,
          error: `scene.sections[${i}].sentences[${j}].chunks must be an array.`,
        };
      }

      if (sentence.chunks.every((chunk) => typeof chunk === "string")) {
        return {
          ok: false,
          error: "chunks is string[] but ParsedSceneChunk[] is required",
        };
      }

      for (let k = 0; k < sentence.chunks.length; k += 1) {
        const chunk = sentence.chunks[k];
        if (!isObject(chunk)) {
          return {
            ok: false,
            error: `scene.sections[${i}].sentences[${j}].chunks[${k}] must be an object.`,
          };
        }

        if (typeof chunk.text !== "string" || typeof chunk.key !== "string") {
          return {
            ok: false,
            error: `scene.sections[${i}].sentences[${j}].chunks[${k}] missing text/key.`,
          };
        }
      }
    }
  }

  if (scene.glossary !== undefined) {
    if (!Array.isArray(scene.glossary)) {
      return {
        ok: false,
        error: "scene.glossary must be an array when provided.",
      };
    }

    for (let i = 0; i < scene.glossary.length; i += 1) {
      const item = scene.glossary[i];
      if (!isObject(item)) {
        return { ok: false, error: `scene.glossary[${i}] must be an object.` };
      }

      if (typeof item.key !== "string" || typeof item.text !== "string") {
        return { ok: false, error: `scene.glossary[${i}] missing key/text.` };
      }
    }
  }

  return { ok: true };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<ParseSceneRequest>;

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { error: "Invalid request payload. rawText is required." },
        { status: 400 },
      );
    }

    const rawModelText = await callGlmChatCompletion({
      systemPrompt: SCENE_PARSE_SYSTEM_PROMPT,
      userPrompt: buildSceneParseUserPrompt({
        rawText: payload.rawText.trim(),
        sourceLanguage: payload.sourceLanguage,
      }),
      temperature: 0.2,
    });

    const { jsonCandidate, parsed: parsedJson } = parseWithDiagnostics(rawModelText);
    const parsed = normalizeSceneResponse(parsedJson);

    // Temporary diagnostics for schema mismatch debugging.
    console.log("[scene-parse][rawModelText]", rawModelText);
    console.log("[scene-parse][jsonCandidate]", jsonCandidate);
    console.log("[scene-parse][parsed]", JSON.stringify(parsed, null, 2));

    if (!isValidSceneParserResponse(parsed)) {
      const validation = validateSceneParserResponse(parsed);
      return NextResponse.json(
        {
          error: validation.ok
            ? "Model output JSON does not match SceneParserResponse basic structure."
            : validation.error,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse scene.";
    return NextResponse.json(
      { error: `Scene parse failed: ${message}` },
      { status: 500 },
    );
  }
}
