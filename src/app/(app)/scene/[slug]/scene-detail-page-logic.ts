import { normalizeSceneSlug } from "@/lib/cache/scene-cache";

export type SceneViewMode =
  | "scene"
  | "practice"
  | "variants"
  | "variant-study"
  | "expression-map";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

export const estimateSceneLearningProgress = (mode: SceneViewMode) => {
  if (mode === "practice") return 90;
  if (mode === "variants" || mode === "variant-study" || mode === "expression-map") {
    return 65;
  }
  return 20;
};

export const parseSceneDetailRouteState = (searchParams: SearchParamsLike) => {
  const modeParam = searchParams.get("view");
  const variantParam = searchParams.get("variant");
  const viewMode: SceneViewMode =
    modeParam === "practice" ||
    modeParam === "variants" ||
    modeParam === "variant-study" ||
    modeParam === "expression-map"
      ? modeParam
      : "scene";

  return {
    viewMode,
    activeVariantId: viewMode === "variant-study" ? variantParam : null,
  };
};

export const buildSceneDetailHref = ({
  sceneSlug,
  searchParams,
  nextViewMode,
  variantId,
}: {
  sceneSlug: string;
  searchParams: SearchParamsLike;
  nextViewMode: SceneViewMode;
  variantId?: string | null;
}) => {
  const nextParams = new URLSearchParams(searchParams.toString());
  if (nextViewMode === "scene") {
    nextParams.delete("view");
    nextParams.delete("variant");
  } else {
    nextParams.set("view", nextViewMode);
    if (nextViewMode === "variant-study" && variantId) {
      nextParams.set("variant", variantId);
    } else {
      nextParams.delete("variant");
    }
  }
  const query = nextParams.toString();
  return query ? `/scene/${sceneSlug}?${query}` : `/scene/${sceneSlug}`;
};

export const buildScenePrefetchCandidates = ({
  requestSlug,
  sceneSlugs,
  recentCacheKeys,
  extractSlugFromSceneCacheKey,
  limit = 2,
}: {
  requestSlug: string;
  sceneSlugs: string[];
  recentCacheKeys: string[];
  extractSlugFromSceneCacheKey: (key: string) => string;
  limit?: number;
}) => {
  const normalizedRequestSlug = normalizeSceneSlug(requestSlug);
  const candidates: string[] = [];

  const pushCandidate = (value: string) => {
    const normalized = normalizeSceneSlug(value);
    if (!normalized || normalized === normalizedRequestSlug) return;
    if (candidates.includes(normalized)) return;
    candidates.push(normalized);
  };

  const currentIndex = sceneSlugs.findIndex(
    (item) => normalizeSceneSlug(item) === normalizedRequestSlug,
  );
  if (currentIndex >= 0) {
    for (let index = currentIndex + 1; index < sceneSlugs.length; index += 1) {
      pushCandidate(sceneSlugs[index] ?? "");
      if (candidates.length >= limit) return candidates;
    }
  }

  for (const key of recentCacheKeys) {
    pushCandidate(extractSlugFromSceneCacheKey(key));
    if (candidates.length >= limit) return candidates;
  }

  return candidates;
};
