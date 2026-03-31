import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { DueReviewItemResponse, DueScenePracticeReviewItemResponse } from "@/lib/utils/review-api";

export type ReviewTaskStage = "recall" | "practice" | "feedback";

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

export const buildReviewProgressModel = ({
  summary,
  scenePracticeCount,
}: {
  summary: {
    dueReviewCount: number;
    reviewedTodayCount: number;
    reviewAccuracy: number | null;
    masteredPhraseCount: number;
  } | null;
  scenePracticeCount: number;
}) => {
  const reviewedTodayCount = summary?.reviewedTodayCount ?? 0;
  const dueReviewCount = summary?.dueReviewCount ?? 0;
  const totalCount = reviewedTodayCount + dueReviewCount + scenePracticeCount;
  const completedCount = reviewedTodayCount;
  const progressPercent =
    totalCount <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((completedCount / totalCount) * 100)));

  return {
    reviewedTodayCount,
    dueReviewCount,
    totalCount,
    completedCount,
    progressPercent,
    accuracyText: summary?.reviewAccuracy == null ? "—" : `${summary.reviewAccuracy}%`,
  };
};

export const buildReviewTaskStageMeta = ({
  taskKind,
  stage,
}: {
  taskKind: "scene_practice" | "phrase_review";
  stage: ReviewTaskStage;
}) => {
  if (taskKind === "scene_practice") {
    if (stage === "recall") {
      return {
        stepTag: "STEP 1. 场景回补",
        title: "先回忆这句该怎么接",
      };
    }
    if (stage === "practice") {
      return {
        stepTag: "STEP 2. 当场再练一次",
        title: "把这句重新说出来",
      };
    }
    return {
      stepTag: "STEP 3. 反馈与下一步",
      title: "根据结果决定继续回场景还是进入下一题",
    };
  }

  if (stage === "recall") {
    return {
      stepTag: "STEP 1. 表达唤醒",
      title: "先在脑中把这条表达提起来",
    };
  }
  if (stage === "practice") {
    return {
      stepTag: "STEP 2. 输出练习",
      title: "试着用自己的话造一句",
    };
  }
  return {
    stepTag: "STEP 3. 复习判断",
    title: "给这次复习一个明确判断",
  };
};
