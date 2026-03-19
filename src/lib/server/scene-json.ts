import {
  ParsedScene,
  SceneParserResponse,
} from "@/lib/types/scene-parser";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

export const extractJsonCandidate = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");
  const startCandidates = [objectStart, arrayStart].filter((value) => value >= 0);
  if (startCandidates.length === 0) return null;
  const start = Math.min(...startCandidates);
  const opening = text[start];
  const closing = opening === "[" ? "]" : "}";

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

    if (char === opening) depth += 1;
    if (char === closing) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1).trim();
    }
  }

  return null;
};

const normalizeJsonLikeText = (value: string) =>
  value
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/，/g, ",")
    .replace(/：/g, ":")
    .replace(/；/g, ";")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\r\n/g, "\n")
    .trim();

const stripInvalidControlChars = (value: string) =>
  value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

const removeJsonComments = (value: string) =>
  value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/.*$/gm, "$1");

const removeTrailingCommas = (value: string) =>
  value.replace(/,\s*([}\]])/g, "$1");

const tryParseWithRepairs = (candidate: string) => {
  const seeds = [
    candidate,
    removeTrailingCommas(candidate),
    removeTrailingCommas(removeJsonComments(candidate)),
    removeTrailingCommas(removeJsonComments(stripInvalidControlChars(candidate))),
  ];
  const tried = new Set<string>();
  for (const seed of seeds) {
    const normalized = normalizeJsonLikeText(seed);
    if (!normalized || tried.has(normalized)) continue;
    tried.add(normalized);
    try {
      return JSON.parse(normalized) as unknown;
    } catch {
      // Try next repair candidate.
    }
  }
  return null;
};

const trimToLikelyJsonBounds = (value: string) => {
  const firstBrace = value.indexOf("{");
  const firstBracket = value.indexOf("[");
  const starts = [firstBrace, firstBracket].filter((idx) => idx >= 0);
  if (starts.length === 0) return value;
  const start = Math.min(...starts);

  const lastBrace = value.lastIndexOf("}");
  const lastBracket = value.lastIndexOf("]");
  const ends = [lastBrace, lastBracket].filter((idx) => idx >= 0);
  if (ends.length === 0) return value.slice(start);
  const end = Math.max(...ends);
  return value.slice(start, end + 1).trim();
};

export const parseJsonWithFallback = (raw: string) => {
  const normalizedRaw = normalizeJsonLikeText(raw);
  try {
    return JSON.parse(normalizedRaw) as unknown;
  } catch {
    const candidate = extractJsonCandidate(normalizedRaw);
    const normalizedCandidate = candidate ? trimToLikelyJsonBounds(normalizeJsonLikeText(candidate)) : null;
    if (!normalizedCandidate) {
      throw new Error("Model output is not valid JSON and no JSON object could be extracted.");
    }
    const repairedParsed = tryParseWithRepairs(normalizedCandidate);
    if (repairedParsed !== null) {
      return repairedParsed;
    }
    const broadCandidate = trimToLikelyJsonBounds(normalizedRaw);
    const broadParsed = tryParseWithRepairs(broadCandidate);
    if (broadParsed !== null) {
      return broadParsed;
    }
    throw new Error("Extracted JSON candidate is still invalid JSON.");
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

const isValidSpeaker = (value: unknown) => value === "A" || value === "B";

const isValidDialogueLine = (value: unknown) => {
  if (!isObject(value)) return false;
  if (!isValidSpeaker(value.speaker)) return false;
  if (typeof value.id !== "string" || typeof value.text !== "string") return false;
  if (typeof value.translation !== "string") return false;
  if (value.tts !== undefined && typeof value.tts !== "string") return false;
  if (!Array.isArray(value.chunks)) return false;
  return value.chunks.every(isValidChunk);
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
  const hasValidDialogue =
    Array.isArray(value.dialogue) &&
    value.dialogue.length > 0 &&
    value.dialogue.every(isValidDialogueLine);
  const hasValidSections =
    Array.isArray(value.sections) &&
    value.sections.length > 0 &&
    value.sections.every(isValidSection);
  if (!hasValidDialogue && !hasValidSections) {
    return false;
  }
  return true;
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
