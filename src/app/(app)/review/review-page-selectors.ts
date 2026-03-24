import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { DueReviewItemResponse, DueScenePracticeReviewItemResponse } from "@/lib/utils/review-api";

export const buildFallbackExampleSentence = (expression: string) =>
  `I can use "${expression}" in a real sentence.`;

export const toDueItemFromSavedPhrase = (
  row: UserPhraseItemResponse,
): DueReviewItemResponse | null => {
  if (!(row.reviewStatus === "saved" || row.reviewStatus === "reviewing")) return null;
  return {
    userPhraseId: row.userPhraseId,
    phraseId: row.phraseId,
    text: row.text,
    translation: row.translation,
    usageNote: row.usageNote,
    sourceSceneSlug: row.sourceSceneSlug,
    sourceSentenceText: row.sourceSentenceText,
    expressionClusterId: row.expressionClusterId,
    reviewStatus: row.reviewStatus,
    reviewCount: row.reviewCount,
    correctCount: row.correctCount,
    incorrectCount: row.incorrectCount,
    nextReviewAt: row.nextReviewAt,
  };
};

export const mergePrioritizedReviewItems = ({
  prioritizedIds,
  dueRows,
  phraseRows,
}: {
  prioritizedIds: string[];
  dueRows: DueReviewItemResponse[];
  phraseRows: UserPhraseItemResponse[];
}) => {
  if (prioritizedIds.length === 0) return dueRows;

  const dueById = new Map(dueRows.map((item) => [item.userPhraseId, item]));
  const supplementalById = new Map<string, DueReviewItemResponse>();

  for (const row of phraseRows) {
    const mapped = toDueItemFromSavedPhrase(row);
    if (!mapped) continue;
    supplementalById.set(mapped.userPhraseId, mapped);
  }

  const merged: DueReviewItemResponse[] = [];
  const added = new Set<string>();

  for (const id of prioritizedIds) {
    const item = dueById.get(id) ?? supplementalById.get(id) ?? null;
    if (!item || added.has(item.userPhraseId)) continue;
    merged.push(item);
    added.add(item.userPhraseId);
  }

  for (const dueItem of dueRows) {
    if (added.has(dueItem.userPhraseId)) continue;
    merged.push(dueItem);
    added.add(dueItem.userPhraseId);
  }

  return merged;
};

export const resolveReviewSourceLabel = ({
  isSessionReview,
  sessionSource,
  labels,
}: {
  isSessionReview: boolean;
  sessionSource: string | null;
  labels: {
    fromExpressionLibrary: string;
    fromExpressionMap: string;
    fromTodayTask: string;
    fromSelected: string;
  };
}) => {
  if (!isSessionReview) return null;
  if (sessionSource === "expression-library-manual-add") return labels.fromExpressionLibrary;
  if (sessionSource === "expression-library-card") return labels.fromExpressionLibrary;
  if (sessionSource === "expression-map-cluster" || sessionSource === "expression-map-single") {
    return labels.fromExpressionMap;
  }
  if (sessionSource === "today-task") return labels.fromTodayTask;
  return labels.fromSelected;
};

export const resolveReviewHints = ({
  isSessionReview,
  sessionSource,
  labels,
}: {
  isSessionReview: boolean;
  sessionSource: string | null;
  labels: {
    defaultHint: string;
    sessionHint: string;
    manualSessionHint: string;
    trainingHintSubtle: string;
    manualTrainingHintSubtle: string;
  };
}) => ({
  primaryHint: !isSessionReview
    ? labels.defaultHint
    : sessionSource === "expression-library-manual-add"
      ? labels.manualSessionHint
      : labels.sessionHint,
  trainingHintSubtle:
    sessionSource === "expression-library-manual-add"
      ? labels.manualTrainingHintSubtle
      : labels.trainingHintSubtle,
});

export const buildScenePracticeReviewItemKey = (
  item: Pick<DueScenePracticeReviewItemResponse, "sceneSlug" | "sentenceId" | "exerciseId">,
) => `${item.sceneSlug}:${item.sentenceId ?? item.exerciseId}`;

export const buildScenePracticeReviewKeySet = (
  items: Array<Pick<DueScenePracticeReviewItemResponse, "sceneSlug" | "sentenceId" | "exerciseId">>,
) => new Set(items.map((item) => buildScenePracticeReviewItemKey(item)));
