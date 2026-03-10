import { Lesson, LessonSentence } from "@/lib/types";

type ParsedTurn = {
  speaker?: string;
  text: string;
};

export type ParseCustomScenarioResult =
  | {
      ok: true;
      value: Lesson;
    }
  | {
      ok: false;
      error: string;
    };

const TOPIC_KEYWORDS = [
  "dinner",
  "office",
  "meeting",
  "coffee",
  "weekend",
  "work",
  "late",
  "commute",
  "subway",
  "sleep",
] as const;

const speakerLinePattern = /^([A-Za-z][A-Za-z0-9' -]{0,30})\s*:\s*(.+)$/;
const sentenceSplitPattern = /(?<=[.!?])\s+/;
const minValidSentenceCount = 2;

const normalizeInput = (input: string) =>
  input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

const splitIntoSentences = (text: string) =>
  text
    .split(sentenceSplitPattern)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const isMeaningfulEnglishSentence = (text: string) => {
  const compact = text.trim();
  if (!compact) return false;
  if (!/[A-Za-z]/.test(compact)) return false;
  return compact.replace(/[^A-Za-z]/g, "").length >= 2;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export function estimateDurationBySentences(sentenceCount: number) {
  const estimated = Math.ceil(sentenceCount * 1.2);
  return Math.max(2, estimated);
}

export function generateCustomScenarioTitle(turns: ParsedTurn[]) {
  const text = turns
    .slice(0, 4)
    .map((turn) => turn.text.toLowerCase())
    .join(" ");
  const hit = TOPIC_KEYWORDS.find((keyword) => text.includes(keyword));

  if (hit === "dinner") return "Dinner Plan Update";
  if (hit === "office" || hit === "work" || hit === "meeting")
    return "Workday Conversation";
  if (hit === "coffee") return "Coffee Break Chat";
  if (hit === "weekend") return "Weekend Plan Talk";
  if (hit === "commute" || hit === "subway") return "Commute Conversation";
  if (hit === "sleep" || hit === "late") return "Late Night Check-in";

  return "Imported Conversation";
}

const generateSubtitle = (turns: ParsedTurn[]) => {
  const summary = turns
    .slice(0, 2)
    .map((turn) => turn.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!summary) {
    return "A custom English dialogue imported from your text.";
  }
  return summary.length > 88 ? `${summary.slice(0, 85).trim()}...` : summary;
};

const toSentenceData = (turns: ParsedTurn[], sceneId: string): LessonSentence[] =>
  turns.map((turn, index) => ({
    id: `${sceneId}-s-${index + 1}`,
    text: turn.text,
    translation: "",
    chunks: [],
    speaker: turn.speaker,
    audioText: turn.text,
  }));

const parseTurns = (normalized: string): ParsedTurn[] => {
  const lines = normalized.split("\n").filter(Boolean);
  const prefixedLineCount = lines.filter((line) =>
    speakerLinePattern.test(line),
  ).length;
  const useSpeakerMode = prefixedLineCount >= 2;
  const turns: ParsedTurn[] = [];

  if (useSpeakerMode) {
    for (const line of lines) {
      const match = line.match(speakerLinePattern);
      if (match) {
        const speaker = match[1].trim();
        const content = match[2].trim();
        for (const sentence of splitIntoSentences(content)) {
          turns.push({ speaker, text: sentence });
        }
        continue;
      }

      for (const sentence of splitIntoSentences(line)) {
        turns.push({ text: sentence });
      }
    }
  } else {
    for (const sentence of splitIntoSentences(lines.join(" "))) {
      turns.push({ text: sentence });
    }
  }

  return turns.filter((turn) => isMeaningfulEnglishSentence(turn.text));
};

export function parseCustomScenario(input: string): ParseCustomScenarioResult {
  const normalized = normalizeInput(input);
  if (!normalized) {
    return { ok: false, error: "请先粘贴英文对话内容" };
  }

  const turns = parseTurns(normalized);
  if (turns.length < minValidSentenceCount) {
    return { ok: false, error: "请至少粘贴 2 句英语对话" };
  }

  const title = generateCustomScenarioTitle(turns);
  const createdAt = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const sceneId = `custom-${createdAt}-${randomSuffix}`;
  const slug = `${slugify(title) || "imported-conversation"}-${randomSuffix}`;
  const sentences = toSentenceData(turns, sceneId);
  const subtitle = generateSubtitle(turns);

  const lesson: Lesson = {
    id: sceneId,
    slug,
    title,
    subtitle,
    description: subtitle,
    difficulty: "Intermediate",
    estimatedMinutes: estimateDurationBySentences(sentences.length),
    completionRate: 0,
    tags: ["custom", "imported"],
    sourceType: "custom",
    sections: [
      {
        id: `${sceneId}-section-1`,
        title,
        summary: "Custom dialogue imported by user.",
        sentences,
      },
    ],
    explanations: [],
  };

  return { ok: true, value: lesson };
}

