import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { DueReviewItemResponse, DueScenePracticeReviewItemResponse } from "@/lib/utils/review-api";

export type ReviewTaskStage =
  | "recall"
  | "confidence"
  | "rewrite"
  | "practice"
  | "feedback";

export type PhraseRewritePrompt = {
  id: "self" | "colleague" | "past";
  title: string;
  description: string;
};

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
    sourceSceneAvailable: false,
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
      stepTag: "STEP 1. 微回忆",
      title: "先只看语境，试着把表达主动提起来",
    };
  }
  if (stage === "confidence") {
    return {
      stepTag: "STEP 2. 熟悉度判断",
      title: "区分这条表达是眼熟，还是已经能主动说出来",
    };
  }
  if (stage === "rewrite") {
    return {
      stepTag: "STEP 3. 变体改写",
      title: "换一个对象、时态或视角，把表达重新组织一遍",
    };
  }
  if (stage === "practice") {
    return {
      stepTag: "STEP 4. 完整输出",
      title: "脱离填空，直接把整句或两句完整说出来",
    };
  }
  return {
    stepTag: "STEP 5. 复习判断",
    title: "结合前面的表现，给这次复习一个明确判断",
  };
};

export const buildPhraseRewritePrompts = (): PhraseRewritePrompt[] => [
  {
    id: "self",
    title: "改成对自己说",
    description: "把它改成你安慰自己、提醒自己的说法。",
  },
  {
    id: "colleague",
    title: "改成对同事说",
    description: "把它改成你对同事或朋友说的话。",
  },
  {
    id: "past",
    title: "改成昨天发生的事",
    description: "把它改成描述昨天已经发生过的场景。",
  },
];
