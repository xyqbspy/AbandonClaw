export interface ScenePhraseRecommendationItem {
  text: string;
  normalizedText: string;
  translation: string | null;
  sourceSentenceIndex: number | null;
  sourceSentenceText: string | null;
  sourceChunkText: string;
  reasonCode:
    | "useful_chunk"
    | "not_saved_yet"
    | "fits_current_scene"
    | "seen_not_saved"
    | "good_for_review";
  reasonCodes: string[];
  alreadySaved: boolean;
  alreadyMastered: boolean;
  score: number;
}

const toApiError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as { error?: string };
    if (typeof body.error === "string" && body.error.trim()) {
      return new Error(body.error);
    }
  } catch {
    // ignore
  }
  return new Error(fallback);
};

export async function getScenePhraseRecommendationsFromApi(
  sceneSlug: string,
  limit = 3,
) {
  const response = await fetch(
    `/api/recommendations/scenes/${encodeURIComponent(sceneSlug)}/phrases?limit=${Math.max(
      1,
      Math.min(5, Math.floor(limit)),
    )}`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw await toApiError(response, "加载推荐表达失败。");
  }
  const data = (await response.json()) as {
    items?: ScenePhraseRecommendationItem[];
  };
  return data.items ?? [];
}
