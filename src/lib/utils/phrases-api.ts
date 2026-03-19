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
  expressionFamilyId: string | null;
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
  expressionFamilyId?: string;
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
  };
  void clearLearningDashboardCache().catch(() => {
    // Non-blocking.
  });
  return data;
}

export async function getMyPhrasesFromApi(params?: {
  query?: string;
  page?: number;
  limit?: number;
  status?: "saved" | "archived";
  reviewStatus?: PhraseReviewStatus | "all";
  learningItemType?: "expression" | "sentence" | "all";
}) {
  const search = new URLSearchParams();
  if (params?.query) search.set("query", params.query);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.status) search.set("status", params.status);
  if (params?.reviewStatus) search.set("reviewStatus", params.reviewStatus);
  if (params?.learningItemType) search.set("learningItemType", params.learningItemType);
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
