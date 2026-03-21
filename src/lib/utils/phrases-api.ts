import { clearLearningDashboardCache } from "@/lib/cache/learning-dashboard-cache";
import { normalizePhraseText } from "@/lib/shared/phrases";

interface ApiErrorBody {
  error?: string;
}

const toApiError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.error === "string" && body.error.trim()) {
      return new Error(body.error);
    }
  } catch {
    // Ignore parse error.
  }
  return new Error(fallback);
};

export interface PhraseSummaryResponse {
  totalSavedPhrases: number;
  todaySavedPhrases: number;
}

export type PhraseReviewStatus = "saved" | "reviewing" | "mastered" | "archived";

export interface UserPhraseItemResponse {
  userPhraseId: string;
  phraseId: string;
  text: string;
  normalizedText: string;
  translation: string | null;
  usageNote: string | null;
  difficulty: string | null;
  tags: string[];
  sourceSceneSlug: string | null;
  sourceType: "scene" | "manual";
  sourceNote: string | null;
  sourceSentenceIndex: number | null;
  sourceSentenceText: string | null;
  sourceChunkText: string | null;
  expressionClusterId: string | null;
  expressionClusterRole: "main" | "variant" | null;
  expressionClusterMainUserPhraseId: string | null;
  aiEnrichmentStatus: "pending" | "done" | "failed" | null;
  semanticFocus: string | null;
  typicalScenario: string | null;
  exampleSentences: Array<{
    en: string;
    zh: string;
  }>;
  aiEnrichmentError: string | null;
  learningItemType: "expression" | "sentence";
  savedAt: string;
  lastSeenAt: string;
  reviewStatus: PhraseReviewStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  masteredAt: string | null;
}

export type UserPhraseRelationType = "similar" | "contrast";

export interface UserPhraseRelationItemResponse {
  sourceUserPhraseId: string;
  relationType: UserPhraseRelationType;
  item: UserPhraseItemResponse;
}

export async function savePhraseFromApi(payload: {
  text?: string;
  learningItemType?: "expression" | "sentence";
  sentenceText?: string;
  translation?: string;
  usageNote?: string;
  difficulty?: string;
  tags?: string[];
  sourceSceneSlug?: string;
  sourceType?: "scene" | "manual";
  sourceNote?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
  expressionClusterId?: string;
  relationSourceUserPhraseId?: string;
  relationType?: UserPhraseRelationType;
}) {
  const response = await fetch("/api/phrases/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "\u6536\u85cf\u77ed\u8bed\u5931\u8d25\u3002");
  }
  const data = (await response.json()) as {
    created: boolean;
    phrase: { id: string; normalized_text: string; display_text: string };
    userPhrase: { id: string };
    expressionClusterId: string | null;
  };
  void clearLearningDashboardCache().catch(() => {
    // Non-blocking.
  });
  return data;
}

export async function savePhrasesBatchFromApi(payload: {
  items: Array<{
    text?: string;
    learningItemType?: "expression" | "sentence";
    sentenceText?: string;
    translation?: string;
    usageNote?: string;
    difficulty?: string;
    tags?: string[];
    sourceSceneSlug?: string;
    sourceType?: "scene" | "manual";
    sourceNote?: string;
    sourceSentenceIndex?: number;
    sourceSentenceText?: string;
    sourceChunkText?: string;
    expressionClusterId?: string;
    relationSourceUserPhraseId?: string;
    relationType?: UserPhraseRelationType;
  }>;
}) {
  const response = await fetch("/api/phrases/save-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "批量保存表达失败。");
  }
  const data = (await response.json()) as {
    items: Array<{
      created: boolean;
      phrase: { id: string; normalized_text: string; display_text: string };
      userPhrase: { id: string };
      expressionClusterId: string | null;
    }>;
  };
  void clearLearningDashboardCache().catch(() => {
    // Non-blocking.
  });
  return data;
}

export async function getPhraseRelationsFromApi(userPhraseId: string) {
  const search = new URLSearchParams({ userPhraseId });
  const response = await fetch(`/api/phrases/relations?${search.toString()}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw await toApiError(response, "加载表达关系失败。");
  }
  return (await response.json()) as {
    rows: UserPhraseRelationItemResponse[];
  };
}

export async function getPhraseRelationsBatchFromApi(userPhraseIds: string[]) {
  const uniqueIds = Array.from(new Set(userPhraseIds.map((item) => item.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { rows: [] as UserPhraseRelationItemResponse[] };
  }
  const search = new URLSearchParams({ userPhraseIds: uniqueIds.join(",") });
  const response = await fetch(`/api/phrases/relations?${search.toString()}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw await toApiError(response, "加载表达关系失败。");
  }
  return (await response.json()) as {
    rows: UserPhraseRelationItemResponse[];
  };
}

export async function getMyPhrasesFromApi(params?: {
  query?: string;
  page?: number;
  limit?: number;
  status?: "saved" | "archived";
  reviewStatus?: PhraseReviewStatus | "all";
  learningItemType?: "expression" | "sentence" | "all";
  expressionClusterId?: string;
}) {
  const search = new URLSearchParams();
  if (params?.query) search.set("query", params.query);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.status) search.set("status", params.status);
  if (params?.reviewStatus) search.set("reviewStatus", params.reviewStatus);
  if (params?.learningItemType) search.set("learningItemType", params.learningItemType);
  if (params?.expressionClusterId) search.set("expressionClusterId", params.expressionClusterId);
  const suffix = search.toString();
  const response = await fetch(`/api/phrases/mine${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw await toApiError(response, "\u52a0\u8f7d\u6536\u85cf\u77ed\u8bed\u5931\u8d25\u3002");
  }
  return (await response.json()) as {
    rows: UserPhraseItemResponse[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface SimilarExpressionCandidateResponse {
  text: string;
  differenceLabel: string;
}

export interface ManualExpressionAssistResponse {
  version: "v1";
  inputItem: {
    text: string;
    translation: string;
    usageNote: string;
    examples: Array<{
      en: string;
      zh: string;
    }>;
    semanticFocus: string;
    typicalScenario: string;
  };
  similarExpressions: SimilarExpressionCandidateResponse[];
  contrastExpressions: SimilarExpressionCandidateResponse[];
}

export interface ManualSentenceAssistResponse {
  version: "v1";
  sentenceItem: {
    text: string;
    translation: string;
    usageNote: string;
    semanticFocus: string;
    typicalScenario: string;
    extractedExpressions: string[];
  };
}

export async function enrichSimilarExpressionFromApi(payload: {
  userPhraseId: string;
  baseExpression?: string;
  differenceLabel?: string;
}) {
  const response = await fetch("/api/phrases/similar/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "补全学习信息失败。");
  }
  return (await response.json()) as { userPhraseId: string; status: "done" };
}

export async function enrichSimilarExpressionsBatchFromApi(payload: {
  items: Array<{
    userPhraseId: string;
    baseExpression?: string;
    differenceLabel?: string;
  }>;
}) {
  const response = await fetch("/api/phrases/similar/enrich-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "批量补全学习信息失败。");
  }
  return (await response.json()) as {
    items: Array<{
      userPhraseId: string;
      status: "done" | "failed";
      error?: string;
    }>;
  };
}

export async function generateSimilarExpressionsFromApi(payload: {
  baseExpression: string;
  existingExpressions?: string[];
}) {
  const response = await fetch("/api/phrases/similar/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "生成同类表达失败。");
  }
  return (await response.json()) as {
    version: "v1";
    candidates: SimilarExpressionCandidateResponse[];
  };
}

export async function generateManualExpressionAssistFromApi(payload: {
  text: string;
  existingExpressions?: string[];
}) {
  const response = await fetch("/api/phrases/manual-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "expression",
      text: payload.text,
      existingExpressions: payload.existingExpressions ?? [],
    }),
  });
  if (!response.ok) {
    throw await toApiError(response, "生成表达补全信息失败。");
  }
  return (await response.json()) as ManualExpressionAssistResponse;
}

export async function generateManualSentenceAssistFromApi(payload: {
  text: string;
}) {
  const response = await fetch("/api/phrases/manual-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "sentence",
      text: payload.text,
    }),
  });
  if (!response.ok) {
    throw await toApiError(response, "生成句子补全信息失败。");
  }
  return (await response.json()) as ManualSentenceAssistResponse;
}

export async function getPhraseSummaryFromApi() {
  const response = await fetch("/api/phrases/summary", { method: "GET" });
  if (!response.ok) {
    throw await toApiError(response, "\u52a0\u8f7d\u77ed\u8bed\u7edf\u8ba1\u5931\u8d25\u3002");
  }
  return (await response.json()) as PhraseSummaryResponse;
}

export async function getSavedNormalizedPhraseTextsFromApi(texts: string[]) {
  const normalizedTexts = Array.from(
    new Set(texts.map((text) => normalizePhraseText(text)).filter(Boolean)),
  ).slice(0, 120);
  if (normalizedTexts.length === 0) return [];
  const response = await fetch(
    `/api/phrases/mine?normalizedTexts=${encodeURIComponent(normalizedTexts.join(","))}`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw await toApiError(response, "\u8bfb\u53d6\u5df2\u6536\u85cf\u77ed\u8bed\u72b6\u6001\u5931\u8d25\u3002");
  }
  const data = (await response.json()) as { texts?: string[] };
  return data.texts ?? [];
}
