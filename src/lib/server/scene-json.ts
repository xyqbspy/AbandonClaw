import {
  ParsedScene,
  SceneParserResponse,
} from "@/lib/types/scene-parser";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

export const extractJsonCandidate = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1).trim();
    }
  }

  return null;
};

export const parseJsonWithFallback = (raw: string) => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    const candidate = extractJsonCandidate(raw);
    if (!candidate) {
      throw new Error("Model output is not valid JSON and no JSON object could be extracted.");
    }

    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      throw new Error("Extracted JSON candidate is still invalid JSON.");
    }
  }
};

const isValidChunk = (value: unknown) => {
  if (!isObject(value)) return false;
  return (
    typeof value.key === "string" &&
    typeof value.text === "string" &&
    Array.isArray(value.examples)
  );
};

const isValidSentence = (value: unknown) => {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string" || typeof value.text !== "string") {
    return false;
  }
  if (!Array.isArray(value.chunks)) return false;
  return value.chunks.every(isValidChunk);
};

const isValidSection = (value: unknown) => {
  if (!isObject(value)) return false;
  if (!Array.isArray(value.sentences) || value.sentences.length === 0) {
    return false;
  }
  return value.sentences.every(isValidSentence);
};

export const isValidParsedScene = (value: unknown): value is ParsedScene => {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (!Array.isArray(value.sections) || value.sections.length === 0) {
    return false;
  }
  return value.sections.every(isValidSection);
};

export const normalizeSceneParserResponseVersion = (value: unknown): unknown => {
  if (!isObject(value)) return value;
  if (value.version === "1") {
    return {
      ...value,
      version: "v1",
    };
  }
  return value;
};

export const isValidSceneParserResponse = (
  value: unknown,
): value is SceneParserResponse => {
  if (!isObject(value)) return false;
  if (value.version !== "v1") return false;
  return isValidParsedScene(value.scene);
};
