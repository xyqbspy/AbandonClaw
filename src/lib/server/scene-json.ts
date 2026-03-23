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

const removeJsonComments = (value: string) => {
  let result = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const nextChar = value[i + 1] ?? "";

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && nextChar === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === "/" && nextChar === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    result += char;
  }

  return result;
};

const removeTrailingCommas = (value: string) =>
  value.replace(/,\s*([}\]])/g, "$1");

const findNextNonWhitespaceChar = (value: string, startIndex: number) => {
  for (let i = startIndex; i < value.length; i += 1) {
    const char = value[i];
    if (!/\s/.test(char)) return char;
  }
  return "";
};

const escapeInvalidStringContent = (value: string) => {
  let result = "";
  let inString = false;
  let escaped = false;
  let stringCanBeKey = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (!inString) {
      result += char;
      if (char === '"') {
        inString = true;
        const previousNonWhitespace = (() => {
          for (let j = i - 1; j >= 0; j -= 1) {
            if (!/\s/.test(value[j])) return value[j];
          }
          return "";
        })();
        stringCanBeKey =
          previousNonWhitespace === "{" ||
          previousNonWhitespace === "," ||
          previousNonWhitespace === "";
      }
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      const nextNonWhitespace = findNextNonWhitespaceChar(value, i + 1);
      const looksLikeClosingQuote =
        !nextNonWhitespace ||
        nextNonWhitespace === "," ||
        nextNonWhitespace === "}" ||
        nextNonWhitespace === "]" ||
        (nextNonWhitespace === ":" && stringCanBeKey);

      if (looksLikeClosingQuote) {
        result += char;
        inString = false;
        stringCanBeKey = false;
      } else {
        result += '\\"';
      }
      continue;
    }

    if (char === "\n") {
      result += "\\n";
      continue;
    }

    if (char === "\r") {
      result += "\\r";
      continue;
    }

    if (char === "\t") {
      result += "\\t";
      continue;
    }

    result += char;
  }

  return result;
};

const tryParseWithRepairs = (candidate: string) => {
  const seeds = [
    candidate,
    escapeInvalidStringContent(candidate),
    removeTrailingCommas(candidate),
    removeTrailingCommas(escapeInvalidStringContent(candidate)),
    removeTrailingCommas(removeJsonComments(candidate)),
    removeTrailingCommas(removeJsonComments(escapeInvalidStringContent(candidate))),
    removeTrailingCommas(removeJsonComments(stripInvalidControlChars(candidate))),
    removeTrailingCommas(
      removeJsonComments(stripInvalidControlChars(escapeInvalidStringContent(candidate))),
    ),
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
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.start === "number" &&
    typeof value.end === "number"
  );
};

const isValidSpeaker = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const isValidSentence = (value: unknown) => {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string" || typeof value.text !== "string") return false;
  if (value.translation !== undefined && typeof value.translation !== "string") return false;
  if (value.tts !== undefined && typeof value.tts !== "string") return false;
  if (!Array.isArray(value.chunks)) return false;
  return value.chunks.every(isValidChunk);
};

const isValidBlock = (value: unknown) => {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string") return false;
  if (value.type !== "dialogue" && value.type !== "monologue") return false;
  if (value.type === "dialogue" && !isValidSpeaker(value.speaker)) return false;
  if (value.speaker !== undefined && !isValidSpeaker(value.speaker)) return false;
  if (value.translation !== undefined && typeof value.translation !== "string") return false;
  if (value.tts !== undefined && typeof value.tts !== "string") return false;
  if (!Array.isArray(value.sentences) || value.sentences.length === 0) return false;
  if (value.sentences.length > 2) return false;
  return value.sentences.every(isValidSentence);
};

const isValidSection = (value: unknown) => {
  if (!isObject(value)) return false;
  if (!Array.isArray(value.blocks) || value.blocks.length === 0) {
    return false;
  }
  return value.blocks.every(isValidBlock);
};

export const isValidParsedScene = (value: unknown): value is ParsedScene => {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (value.type !== "dialogue" && value.type !== "monologue") return false;
  const hasValidSections =
    Array.isArray(value.sections) &&
    value.sections.length > 0 &&
    value.sections.every(isValidSection);
  if (!hasValidSections) {
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
