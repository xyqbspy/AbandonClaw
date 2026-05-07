import { invalidateAfterReviewMutation } from "@/lib/utils/cache-actions";

export type ReviewResult = "again" | "hard" | "good";
export type ReviewRecognitionState = "recognized" | "unknown";
export type ReviewOutputConfidence = "high" | "low";
export type ReviewFullOutputStatus = "completed" | "not_started";
export type ReviewVariantRewriteStatus = "completed" | "not_started";
export type ReviewVariantRewritePromptId = "self" | "colleague" | "past";
export type ReviewFullOutputCoverage =
  | "contains_target"
  | "missing_target"
  | "not_started";
export type ReviewSchedulingFocus =
  | "low_output_confidence"
  | "missing_target_coverage"
  | "missing_full_output"
  | "missing_variant_rewrite"
  | "recognition_only"
  | null;

export interface DueReviewItemResponse {
  userPhraseId: string;
  phraseId: string;
  text: string;
  translation: string | null;
  usageNote: string | null;
  sourceSceneSlug: string | null;
  sourceSceneAvailable: boolean;
  sourceSentenceText: string | null;
  expressionClusterId: string | null;
  reviewStatus: "saved" | "reviewing" | "mastered" | "archived";
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewAt: string | null;
  recognitionState: ReviewRecognitionState | null;
  outputConfidence: ReviewOutputConfidence | null;
  fullOutputStatus: ReviewFullOutputStatus | null;
  variantRewriteStatus: ReviewVariantRewriteStatus | null;
  variantRewritePromptId: ReviewVariantRewritePromptId | null;
  fullOutputCoverage: ReviewFullOutputCoverage | null;
  schedulingFocus: ReviewSchedulingFocus;
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
  confidentOutputCountToday: number;
  fullOutputCountToday: number;
  variantRewriteCountToday: number;
  targetCoverageCountToday: number;
  targetCoverageMissCountToday: number;
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
  recognitionState?: ReviewRecognitionState;
  outputConfidence?: ReviewOutputConfidence;
  fullOutputStatus?: ReviewFullOutputStatus;
  variantRewriteStatus?: ReviewVariantRewriteStatus;
  variantRewritePromptId?: ReviewVariantRewritePromptId;
  fullOutputCoverage?: ReviewFullOutputCoverage;
  fullOutputText?: string;
}) {
  const response = await fetch("/api/review/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "提交复习结果失败。");
  }
  const data = (await response.json()) as {
    item: DueReviewItemResponse;
    summary: ReviewSummaryResponse;
  };
  invalidateAfterReviewMutation();
  return data;
}

export async function getReviewSummaryFromApi() {
  const response = await fetch("/api/review/summary", { method: "GET" });
  if (!response.ok) {
    throw await toApiError(response, "加载复习统计失败。");
  }
  return (await response.json()) as ReviewSummaryResponse;
}
