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
    // ignore parse error
  }
  return new Error(fallback);
};

export interface PhraseSummaryResponse {
  totalSavedPhrases: number;
  todaySavedPhrases: number;
}

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
  sourceSentenceIndex: number | null;
  sourceSentenceText: string | null;
  sourceChunkText: string | null;
  savedAt: string;
  lastSeenAt: string;
}

export async function savePhraseFromApi(payload: {
  text: string;
  translation?: string;
  usageNote?: string;
  difficulty?: string;
  tags?: string[];
  sourceSceneSlug?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
}) {
  const response = await fetch("/api/phrases/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "收藏短语失败。");
  }
  return (await response.json()) as {
    created: boolean;
    phrase: { id: string; normalized_text: string; display_text: string };
    userPhrase: { id: string };
  };
}

export async function getMyPhrasesFromApi(params?: {
  query?: string;
  page?: number;
  limit?: number;
  status?: "saved" | "archived";
}) {
  const search = new URLSearchParams();
  if (params?.query) search.set("query", params.query);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.status) search.set("status", params.status);
  const suffix = search.toString();
  const response = await fetch(`/api/phrases/mine${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw await toApiError(response, "加载收藏短语失败。");
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
    throw await toApiError(response, "加载短语统计失败。");
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
    throw await toApiError(response, "读取已收藏短语状态失败。");
  }
  const data = (await response.json()) as { texts?: string[] };
  return data.texts ?? [];
}
