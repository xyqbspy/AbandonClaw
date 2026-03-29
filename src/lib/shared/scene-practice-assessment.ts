import { PracticeAssessmentLevel, PracticeMode } from "@/lib/types/learning-flow";

export const normalizePracticeAnswer = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u3000/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, " ");

const CLOZE_PLACEHOLDER_PATTERN = /_{3,}/;

const toTokenSet = (value: string) =>
  new Set(
    normalizePracticeAnswer(value)
      .split(" ")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const toNormalizedTokens = (value: string) =>
  normalizePracticeAnswer(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

const countSharedTokens = (expected: string, actual: string) => {
  const expectedTokens = Array.from(toTokenSet(expected));
  const actualTokenSet = toTokenSet(actual);
  return expectedTokens.filter((token) => actualTokenSet.has(token)).length;
};

const countOrderedMatches = (expected: string, actual: string) => {
  const expectedTokens = normalizePracticeAnswer(expected).split(" ").filter(Boolean);
  const actualTokens = normalizePracticeAnswer(actual).split(" ").filter(Boolean);
  let actualIndex = 0;
  let matched = 0;

  for (const token of expectedTokens) {
    while (actualIndex < actualTokens.length && actualTokens[actualIndex] !== token) {
      actualIndex += 1;
    }
    if (actualIndex < actualTokens.length) {
      matched += 1;
      actualIndex += 1;
    }
  }

  return matched;
};

const countPrefixOverlap = (expectedTokens: string[], prefixTokens: string[]) => {
  const maxOverlap = Math.min(expectedTokens.length, prefixTokens.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    const expectedPrefix = expectedTokens.slice(0, size).join(" ");
    const prefixTail = prefixTokens.slice(-size).join(" ");
    if (expectedPrefix === prefixTail) return size;
  }
  return 0;
};

const countSuffixOverlap = (expectedTokens: string[], suffixTokens: string[]) => {
  const maxOverlap = Math.min(expectedTokens.length, suffixTokens.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    const expectedSuffix = expectedTokens.slice(-size).join(" ");
    const suffixHead = suffixTokens.slice(0, size).join(" ");
    if (expectedSuffix === suffixHead) return size;
  }
  return 0;
};

export const deriveDisplayedClozeAnswer = (
  expected: string,
  displayText?: string | null,
) => {
  const cleanExpected = expected.trim();
  if (!cleanExpected) return "";
  if (!displayText || !CLOZE_PLACEHOLDER_PATTERN.test(displayText)) return cleanExpected;

  const [beforeText, afterText] = displayText.split(CLOZE_PLACEHOLDER_PATTERN, 2);
  const expectedTokens = toNormalizedTokens(cleanExpected);
  if (expectedTokens.length === 0) return cleanExpected;

  const prefixOverlap = countPrefixOverlap(expectedTokens, toNormalizedTokens(beforeText ?? ""));
  const remainingTokens = expectedTokens.slice(prefixOverlap);
  if (remainingTokens.length === 0) return cleanExpected;

  const suffixOverlap = countSuffixOverlap(remainingTokens, toNormalizedTokens(afterText ?? ""));
  const blankTokens =
    suffixOverlap > 0 ? remainingTokens.slice(0, remainingTokens.length - suffixOverlap) : remainingTokens;

  return blankTokens.join(" ") || cleanExpected;
};

export const buildAcceptedPracticeAnswers = (
  expected: string,
  acceptedAnswers?: string[] | null,
  options?: {
    displayText?: string | null;
  },
) =>
  Array.from(
    new Set(
      [
        expected,
        deriveDisplayedClozeAnswer(expected, options?.displayText),
        ...(acceptedAnswers ?? []),
        ...(acceptedAnswers ?? []).map((item) =>
          deriveDisplayedClozeAnswer(item, options?.displayText),
        ),
      ]
        .map(normalizePracticeAnswer)
        .filter(Boolean),
    ),
  );

export const getPracticeAssessment = ({
  mode,
  expected,
  answer,
  acceptedAnswers,
}: {
  mode: PracticeMode;
  expected: string;
  answer: string;
  acceptedAnswers: string[];
}): PracticeAssessmentLevel => {
  const normalizedAnswer = normalizePracticeAnswer(answer);
  if (!normalizedAnswer) return "incorrect";
  if (acceptedAnswers.includes(normalizedAnswer)) return "complete";
  if (mode !== "sentence_recall" && mode !== "full_dictation") return "incorrect";

  const expectedTokens = normalizePracticeAnswer(expected).split(" ").filter(Boolean);
  if (expectedTokens.length === 0) return "incorrect";

  const sharedCount = countSharedTokens(expected, answer);
  const orderedMatches = countOrderedMatches(expected, answer);
  const tokenCoverage = sharedCount / expectedTokens.length;
  const orderedCoverage = orderedMatches / expectedTokens.length;

  if (tokenCoverage >= 0.85 && orderedCoverage >= 0.7) {
    return "structure";
  }
  if (tokenCoverage >= 0.45) {
    return "keyword";
  }
  return "incorrect";
};

export const isPracticeAssessmentComplete = (assessment: PracticeAssessmentLevel) =>
  assessment === "complete";

export const getPracticeAssessmentRank = (
  assessment: PracticeAssessmentLevel | null | undefined,
) => {
  if (assessment === "keyword") return 1;
  if (assessment === "structure") return 2;
  if (assessment === "complete") return 3;
  return 0;
};

export const hasPracticeAssessmentImproved = (
  previous: PracticeAssessmentLevel | null | undefined,
  next: PracticeAssessmentLevel | null | undefined,
) => getPracticeAssessmentRank(next) > getPracticeAssessmentRank(previous);
