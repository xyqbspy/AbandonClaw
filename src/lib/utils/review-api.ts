export type ReviewResult = "again" | "hard" | "good";

export interface DueReviewItemResponse {
  userPhraseId: string;
  phraseId: string;
  text: string;
  translation: string | null;
  usageNote: string | null;
  sourceSceneSlug: string | null;
  sourceSentenceText: string | null;
  expressionClusterId: string | null;
  reviewStatus: "saved" | "reviewing" | "mastered" | "archived";
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewAt: string | null;
}

export interface DueScenePracticeReviewItemResponse {
  sceneSlug: string;
  sceneTitle: string;
  exerciseId: string;
  sentenceId: string | null;
  sourceMode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
  recommendedMode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
  assessmentLevel: "incorrect" | "keyword" | "structure" | "complete";
  expectedAnswer: string | null;
  promptText: string | null;
  displayText: string | null;
  hint: string | null;
  latestAnswer: string;
  reviewedAt: string;
}

export interface ReviewSummaryResponse {
  dueReviewCount: number;
  reviewedTodayCount: number;
  reviewAccuracy: number | null;
  masteredPhraseCount: number;
}

const toApiError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as { error?: string };
    if (typeof body.error === "string" && body.error.trim()) {
      return new Error(body.error);
    }
  } catch {
    // Ignore parse failure.
  }
  return new Error(fallback);
};

export async function getDueReviewItemsFromApi(limit = 20) {
  const response = await fetch(`/api/review/due?limit=${limit}`, { method: "GET" });
  if (!response.ok) {
    throw await toApiError(response, "加载待复习列表失败。");
  }
  return (await response.json()) as {
    rows: DueReviewItemResponse[];
    total: number;
    scenePracticeRows: DueScenePracticeReviewItemResponse[];
  };
}

export async function submitPhraseReviewFromApi(payload: {
  userPhraseId: string;
  reviewResult: ReviewResult;
  source?: string;
}) {
  const response = await fetch("/api/review/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "提交复习结果失败。");
  }
  return (await response.json()) as {
    item: DueReviewItemResponse;
    summary: ReviewSummaryResponse;
  };
}

export async function getReviewSummaryFromApi() {
  const response = await fetch("/api/review/summary", { method: "GET" });
  if (!response.ok) {
    throw await toApiError(response, "加载复习统计失败。");
  }
  return (await response.json()) as ReviewSummaryResponse;
}
