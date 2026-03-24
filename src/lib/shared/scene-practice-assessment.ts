import { PracticeAssessmentLevel, PracticeMode } from "@/lib/types/learning-flow";

export const normalizePracticeAnswer = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, " ");

const toTokenSet = (value: string) =>
  new Set(
    normalizePracticeAnswer(value)
      .split(" ")
      .map((item) => item.trim())
      .filter(Boolean),
  );

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

export const buildAcceptedPracticeAnswers = (
  expected: string,
  acceptedAnswers?: string[] | null,
) =>
  Array.from(
    new Set([expected, ...(acceptedAnswers ?? [])].map(normalizePracticeAnswer).filter(Boolean)),
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
