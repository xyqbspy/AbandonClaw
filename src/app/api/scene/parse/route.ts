import { NextResponse } from "next/server";
import { callGlmChatCompletion } from "@/lib/server/glm-client";
import {
  buildSceneParseUserPrompt,
  SCENE_PARSE_SYSTEM_PROMPT,
} from "@/lib/server/prompts/scene-parse-prompt";
import {
  parseJsonWithFallback,
  normalizeSceneParserResponseVersion,
} from "@/lib/server/scene-json";
import { ParseSceneRequest } from "@/lib/types/scene-parser";
import { normalizeParsedSceneDialogue } from "@/lib/shared/scene-dialogue";

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
  return {
    jsonCandidate: rawText,
    parsed: parseJsonWithFallback(rawText),
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const normalizeParseApiResponse = (value: unknown) => {
  if (!isObject(value) || !isObject(value.scene)) return value;
  const scene = value.scene as Record<string, unknown>;
  const parsedScene = normalizeParsedSceneDialogue({
    id: typeof scene.id === "string" ? scene.id : `scene-${Date.now()}`,
    slug: typeof scene.slug === "string" ? scene.slug : `scene-${Date.now()}`,
    title: typeof scene.title === "string" ? scene.title : "Generated Scene",
    subtitle:
      typeof scene.subtitle === "string"
        ? scene.subtitle
        : typeof scene.description === "string"
          ? scene.description
          : "",
    description: typeof scene.description === "string" ? scene.description : "",
    difficulty:
      scene.difficulty === "Beginner" ||
      scene.difficulty === "Intermediate" ||
      scene.difficulty === "Advanced"
        ? scene.difficulty
        : "Intermediate",
    estimatedMinutes:
      typeof scene.estimatedMinutes === "number" && Number.isFinite(scene.estimatedMinutes)
        ? Math.max(3, Math.min(20, Math.round(scene.estimatedMinutes)))
        : 8,
    tags: Array.isArray(scene.tags)
      ? scene.tags.filter((item): item is string => typeof item === "string")
      : [],
    type:
      scene.type === "dialogue" || scene.type === "monologue"
        ? scene.type
        : undefined,
    dialogue: Array.isArray(scene.dialogue) ? (scene.dialogue as never) : [],
    sections: Array.isArray(scene.sections) ? (scene.sections as never) : [],
    glossary: Array.isArray(scene.glossary) ? (scene.glossary as never) : undefined,
  });

  return {
    ...value,
    scene: parsedScene,
  };
};

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

  // 3) normalize glossary item aliases (only when glossary is an array).
  if (Array.isArray(scene.glossary)) {
    scene.glossary = scene.glossary.map((item) => {
      if (!isObject(item)) return item;

      const keyAlias =
        typeof item.key === "string"
          ? item.key
          : typeof item.text === "string"
            ? item.text
            : typeof item.term === "string"
              ? item.term
              : undefined;

      const textAlias =
        typeof item.text === "string"
          ? item.text
          : typeof item.term === "string"
            ? item.term
            : typeof item.key === "string"
              ? item.key
              : undefined;

      const translationAlias =
        typeof item.translation === "string"
          ? item.translation
          : typeof item.definition === "string"
            ? item.definition
            : "";

      const explanationAlias =
        typeof item.explanation === "string"
          ? item.explanation
          : typeof item.definition === "string"
            ? item.definition
            : typeof item.translation === "string"
              ? item.translation
              : "";

      return {
        ...item,
        ...(keyAlias !== undefined ? { key: keyAlias } : {}),
        ...(textAlias !== undefined ? { text: textAlias } : {}),
        translation: translationAlias,
        explanation: explanationAlias,
      };
    });
  }

  // 4) fill missing chunk.key from chunk.text.
  if (Array.isArray(scene.sections)) {
    scene.sections = scene.sections.map((section) => {
      if (!isObject(section)) return section;
      if (!Array.isArray(section.sentences)) return section;

      const nextSentences = section.sentences.map((sentence) => {
        if (!isObject(sentence) || !Array.isArray(sentence.chunks)) return sentence;

        const nextChunks = sentence.chunks.map((chunk) => {
          if (!isObject(chunk)) return chunk;
          const nextChunk =
            Array.isArray(chunk.examples) &&
            chunk.examples.every((example) => typeof example === "string")
              ? {
                  ...chunk,
                  examples: chunk.examples.map((example) => ({
                    en: example,
                    zh: "",
                  })),
                }
              : chunk;

          if (typeof nextChunk.key === "string" && nextChunk.key.trim()) {
            return nextChunk;
          }
          if (typeof nextChunk.text === "string" && nextChunk.text.trim()) {
            return {
              ...nextChunk,
              key: nextChunk.text,
            };
          }
          return nextChunk;
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

  if ((!Array.isArray(scene.sections) || scene.sections.length === 0) && Array.isArray(scene.dialogue)) {
    const sentences = scene.dialogue
      .filter((line) => isObject(line) && typeof line.text === "string" && line.text.trim())
      .map((line, index) => {
        const lineObject = line as Record<string, unknown>;
        const text = typeof lineObject.text === "string" ? lineObject.text.trim() : "";
        const translation =
          typeof lineObject.translation === "string" && lineObject.translation.trim()
            ? lineObject.translation.trim()
            : text;
        const chunks = Array.isArray(lineObject.chunks) ? lineObject.chunks : [];
        return {
          id:
            typeof lineObject.id === "string" && lineObject.id.trim()
              ? lineObject.id.trim()
              : `s${index + 1}`,
          ...(lineObject.speaker === "A" || lineObject.speaker === "B"
            ? { speaker: lineObject.speaker }
            : {}),
          text,
          translation,
          audioText:
            typeof lineObject.tts === "string" && lineObject.tts.trim()
              ? lineObject.tts.trim()
              : text,
          chunks,
        };
      });
    if (sentences.length > 0) {
      scene.sections = [
        {
          id: "dialogue-main",
          title: "Dialogue",
          summary: sentences[0]?.text?.slice(0, 80) ?? "",
          sentences,
        },
      ];
    }
  }

  return {
    ...normalizedTop,
    scene,
  };
};

type TranslationFallbackInfo = {
  sectionIndex: number;
  sentenceIndex: number;
  sentenceId: string;
};

const applySentenceTranslationFallback = (
  value: unknown,
): { nextValue: unknown; fallbacks: TranslationFallbackInfo[] } => {
  if (!isObject(value) || !isObject(value.scene)) {
    return { nextValue: value, fallbacks: [] };
  }

  const scene = value.scene as Record<string, unknown>;
  if (!Array.isArray(scene.sections)) {
    return { nextValue: value, fallbacks: [] };
  }

  const fallbacks: TranslationFallbackInfo[] = [];
  const nextSections = scene.sections.map((section, sectionIndex) => {
    if (!isObject(section) || !Array.isArray(section.sentences)) return section;

    const nextSentences = section.sentences.map((sentence, sentenceIndex) => {
      if (!isObject(sentence)) return sentence;

      const text =
        typeof sentence.text === "string" ? sentence.text.trim() : "";
      const translation =
        typeof sentence.translation === "string"
          ? sentence.translation.trim()
          : "";
      if (!text || translation) return sentence;

      const sentenceId =
        typeof sentence.id === "string" && sentence.id.trim()
          ? sentence.id
          : `section-${sectionIndex + 1}-sentence-${sentenceIndex + 1}`;

      fallbacks.push({
        sectionIndex,
        sentenceIndex,
        sentenceId,
      });

      return {
        ...sentence,
        translation: text,
      };
    });

    return {
      ...section,
      sentences: nextSentences,
    };
  });

  return {
    nextValue: {
      ...value,
      scene: {
        ...scene,
        sections: nextSections,
      },
    },
    fallbacks,
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

  if (typeof scene.title !== "string" || !scene.title.trim()) {
    return { ok: false, error: "scene.title is required and must be a non-empty string." };
  }

  if (typeof scene.description !== "string" || !scene.description.trim()) {
    if (typeof scene.summary === "string" && scene.summary.trim()) {
      return {
        ok: false,
        error: "scene.description is required; scene.summary is not accepted as a replacement.",
      };
    }
    return { ok: false, error: "scene.description is required." };
  }

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

        if (!Array.isArray(chunk.examples)) {
          return {
            ok: false,
            error: `scene.sections[${i}].sentences[${j}].chunks[${k}].examples must be an array.`,
          };
        }

        for (let m = 0; m < chunk.examples.length; m += 1) {
          const example = chunk.examples[m];
          if (!isObject(example)) {
            return {
              ok: false,
              error: `scene.sections[${i}].sentences[${j}].chunks[${k}].examples[${m}] must be an object.`,
            };
          }

          if (typeof example.en !== "string" || typeof example.zh !== "string") {
            return {
              ok: false,
              error: `scene.sections[${i}].sentences[${j}].chunks[${k}].examples[${m}] must include string en/zh.`,
            };
          }
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

    const { parsed: parsedJson } = parseWithDiagnostics(rawModelText);
    const normalized = normalizeSceneResponse(parsedJson);
    const { nextValue: parsed, fallbacks } =
      applySentenceTranslationFallback(normalized);
    if (fallbacks.length > 0) {
      console.warn(
        "[scene-parse][fallback-translation] Applied temporary translation fallback:",
        JSON.stringify(fallbacks),
      );
    }

    const validation = validateSceneParserResponse(parsed);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: 500 },
      );
    }

    const normalizedParsed = normalizeParseApiResponse(parsed);
    return NextResponse.json(normalizedParsed, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse scene.";
    return NextResponse.json(
      { error: `Scene parse failed: ${message}` },
      { status: 500 },
    );
  }
}
