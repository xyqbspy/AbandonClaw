import type { SceneListItemResponse } from "@/lib/utils/scenes-api";

export type SceneCategoryFilter = "all" | "starter" | "daily_life" | "time_plan" | "social" | "other";
export type SceneLevelFilter = "all" | "L0" | "L1" | "L2" | "unknown";
export type SceneSourceFilter =
  | "all"
  | "builtin"
  | "user_generated"
  | "ai_generated"
  | "imported"
  | "unknown";
export type SceneSortOption = "recommended" | "simple" | "recent";

export type SceneFilters = {
  category: SceneCategoryFilter;
  level: SceneLevelFilter;
  source: SceneSourceFilter;
  search: string;
};

export type ScenePack = {
  id: "start-here" | "everyday-survival" | "time-and-plans" | "simple-social";
  title: string;
  description: string;
  category: "starter" | "daily_life" | "time_plan" | "social";
  accent: "dark" | "light";
  scenes: SceneListItemResponse[];
  completedCount: number;
  totalCount: number;
  primaryScene: SceneListItemResponse | null;
};

export type PrimarySceneAction =
  | {
      kind: "continue" | "start" | "review";
      label: string;
      href: string;
      scene: SceneListItemResponse;
    }
  | {
      kind: "browse";
      label: string;
      href: "/scenes";
      scene: null;
    };

type SceneNormalizedLevel = "L0" | "L1" | "L2" | "unknown";

const LEVEL_ORDER: Record<SceneNormalizedLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  unknown: 3,
};

const LEARNING_STATUS_ORDER: Record<SceneListItemResponse["learningStatus"], number> = {
  in_progress: 0,
  paused: 1,
  not_started: 2,
  completed: 3,
};

const normalizeCategoryValue = (category?: string | null): SceneCategoryFilter => {
  if (category === "starter" || category === "daily_life" || category === "time_plan" || category === "social") {
    return category;
  }
  return "other";
};

const normalizeSourceValue = (source?: string | null): SceneSourceFilter => {
  if (
    source === "builtin" ||
    source === "user_generated" ||
    source === "ai_generated" ||
    source === "imported"
  ) {
    return source;
  }
  return "unknown";
};

const compareIsoDateDesc = (left?: string | null, right?: string | null) => {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
};

export const normalizeSceneLevel = (level?: string | null): SceneNormalizedLevel => {
  if (level === "L0" || level === "L1" || level === "L2") return level;
  return "unknown";
};

export const getSceneLevelLabel = (level?: string | null) => {
  switch (normalizeSceneLevel(level)) {
    case "L0":
      return "入门";
    case "L1":
      return "基础";
    case "L2":
      return "扩展";
    default:
      return "未分级";
  }
};

export const getSceneCategoryLabel = (category?: string | null) => {
  switch (normalizeCategoryValue(category)) {
    case "starter":
      return "新手";
    case "daily_life":
      return "日常生活";
    case "time_plan":
      return "时间安排";
    case "social":
      return "社交";
    default:
      return "其他";
  }
};

export const getSceneSourceLabel = (sourceType?: string | null) => {
  switch (normalizeSourceValue(sourceType)) {
    case "builtin":
      return "内置";
    case "user_generated":
      return "我的";
    case "ai_generated":
      return "AI生成";
    case "imported":
      return "导入";
    default:
      return "未知";
  }
};

export const splitSceneTitleParts = (title?: string | null) => {
  const raw = title?.trim() ?? "";
  if (!raw) {
    return { englishTitle: "", chineseTitle: "" };
  }

  const matched = raw.match(/^(.*?)\s*[（(]\s*([^()（）]+?)\s*[）)]\s*$/);
  if (!matched) {
    return { englishTitle: raw, chineseTitle: "" };
  }

  return {
    englishTitle: matched[1]?.trim() ?? raw,
    chineseTitle: matched[2]?.trim() ?? "",
  };
};

const getScenePrimaryActionTitle = (scene: SceneListItemResponse) => {
  const titleParts = splitSceneTitleParts(scene.title);
  return titleParts.englishTitle || scene.title;
};

export const getSceneStatus = (scene: SceneListItemResponse) => {
  switch (scene.learningStatus) {
    case "in_progress":
      return { key: "in_progress", label: "学习中", tone: "progress" as const };
    case "paused":
      return { key: "paused", label: "待继续", tone: "paused" as const };
    case "completed":
      return { key: "completed", label: "已完成", tone: "done" as const };
    default:
      return { key: "not_started", label: "未开始", tone: "idle" as const };
  }
};

export const getSceneActionLabel = (scene: SceneListItemResponse) => {
  if (scene.learningStatus === "completed" || scene.progressPercent >= 100) return "复习";
  if (scene.learningStatus === "in_progress" || scene.learningStatus === "paused" || scene.progressPercent > 0) {
    return "继续";
  }
  if (scene.sourceType === "imported" || scene.sourceType === "user_generated" || scene.sourceType === "ai_generated") {
    return "查看";
  }
  return "开始";
};

export const sortScenesByRecommendation = (scenes: SceneListItemResponse[]) =>
  [...scenes].sort((left, right) => {
    const featuredDelta = Number(right.isFeatured === true) - Number(left.isFeatured === true);
    if (featuredDelta !== 0) return featuredDelta;

    const starterDelta = Number(right.isStarter === true) - Number(left.isStarter === true);
    if (starterDelta !== 0) return starterDelta;

    const activeDelta = LEARNING_STATUS_ORDER[left.learningStatus] - LEARNING_STATUS_ORDER[right.learningStatus];
    if (activeDelta !== 0) return activeDelta;

    const sortDelta = (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER);
    if (sortDelta !== 0) return sortDelta;

    const progressDelta = right.progressPercent - left.progressPercent;
    if (progressDelta !== 0) return progressDelta;

    const viewedDelta = compareIsoDateDesc(left.lastViewedAt, right.lastViewedAt);
    if (viewedDelta !== 0) return viewedDelta;

    return compareIsoDateDesc(left.createdAt, right.createdAt);
  });

export const sortScenesBySimple = (scenes: SceneListItemResponse[]) =>
  [...scenes].sort((left, right) => {
    const levelDelta = LEVEL_ORDER[normalizeSceneLevel(left.level)] - LEVEL_ORDER[normalizeSceneLevel(right.level)];
    if (levelDelta !== 0) return levelDelta;
    return sortScenesByRecommendation([left, right])[0]?.id === left.id ? -1 : 1;
  });

export const sortScenesByRecent = (scenes: SceneListItemResponse[]) =>
  [...scenes].sort((left, right) => {
    const viewedDelta = compareIsoDateDesc(left.lastViewedAt, right.lastViewedAt);
    if (viewedDelta !== 0) return viewedDelta;

    const activeDelta = LEARNING_STATUS_ORDER[left.learningStatus] - LEARNING_STATUS_ORDER[right.learningStatus];
    if (activeDelta !== 0) return activeDelta;

    const progressDelta = right.progressPercent - left.progressPercent;
    if (progressDelta !== 0) return progressDelta;

    return compareIsoDateDesc(left.createdAt, right.createdAt);
  });

export const sortScenes = (scenes: SceneListItemResponse[], sort: SceneSortOption) => {
  switch (sort) {
    case "simple":
      return sortScenesBySimple(scenes);
    case "recent":
      return sortScenesByRecent(scenes);
    default:
      return sortScenesByRecommendation(scenes);
  }
};

export const filterScenes = (scenes: SceneListItemResponse[], filters: SceneFilters) => {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return scenes.filter((scene) => {
    if (filters.category !== "all" && normalizeCategoryValue(scene.category) !== filters.category) {
      return false;
    }

    if (filters.level !== "all" && normalizeSceneLevel(scene.level) !== filters.level) {
      return false;
    }

    if (filters.source !== "all" && normalizeSourceValue(scene.sourceType) !== filters.source) {
      return false;
    }

    if (!normalizedSearch) return true;

    const haystacks = [
      scene.title,
      scene.subtitle,
      scene.learningGoal ?? "",
      ...(scene.tags ?? []),
    ];
    return haystacks.some((value) => value.toLowerCase().includes(normalizedSearch));
  });
};

const pickPrimarySceneFromList = (scenes: SceneListItemResponse[]) => {
  const sorted = sortScenesByRecommendation(scenes);
  const firstUncompleted = sorted.find((scene) => scene.learningStatus !== "completed" && scene.progressPercent < 100);
  return firstUncompleted ?? sorted[0] ?? null;
};

export const groupScenesIntoStarterPacks = (scenes: SceneListItemResponse[]): ScenePack[] => {
  const sorted = sortScenesByRecommendation(scenes);
  const packDefinitions: Array<Pick<ScenePack, "id" | "title" | "description" | "category" | "accent">> = [
    {
      id: "start-here",
      title: "Start Here",
      description: "从最基础的问候、回应和求助开始。",
      category: "starter",
      accent: "dark",
    },
    {
      id: "everyday-survival",
      title: "Everyday Survival",
      description: "覆盖点单、问路、购物和出行。",
      category: "daily_life",
      accent: "light",
    },
    {
      id: "time-and-plans",
      title: "Time and Plans",
      description: "练习预约、改时间和聊安排。",
      category: "time_plan",
      accent: "light",
    },
    {
      id: "simple-social",
      title: "Simple Social",
      description: "用简单口语开启轻松社交。",
      category: "social",
      accent: "light",
    },
  ];

  return packDefinitions.map((definition) => {
    const packScenes = sorted.filter((scene) => normalizeCategoryValue(scene.category) === definition.category);
    return {
      ...definition,
      scenes: packScenes,
      completedCount: packScenes.filter((scene) => scene.learningStatus === "completed" || scene.progressPercent >= 100).length,
      totalCount: packScenes.length,
      primaryScene: pickPrimarySceneFromList(packScenes),
    };
  });
};

export const getPrimarySceneAction = (scenes: SceneListItemResponse[]): PrimarySceneAction => {
  const recommended = sortScenesByRecommendation(scenes);
  const continueScene = sortScenesByRecent(
    scenes.filter((scene) => scene.learningStatus === "in_progress" || scene.learningStatus === "paused" || scene.progressPercent > 0),
  )[0];
  if (continueScene) {
    const displayTitle = getScenePrimaryActionTitle(continueScene);
    return {
      kind: continueScene.learningStatus === "completed" ? "review" : "continue",
      label: continueScene.learningStatus === "completed"
        ? `复习 ${displayTitle}`
        : `继续学 ${displayTitle}`,
      href: `/scene/${continueScene.slug}`,
      scene: continueScene,
    };
  }

  const starterScene = recommended.find((scene) => scene.isStarter === true);
  if (starterScene) {
    const displayTitle = getScenePrimaryActionTitle(starterScene);
    return {
      kind: "start",
      label: `开始 ${displayTitle}`,
      href: `/scene/${starterScene.slug}`,
      scene: starterScene,
    };
  }

  const reviewScene = sortScenesByRecent(
    scenes.filter((scene) => scene.learningStatus === "completed" || scene.progressPercent >= 100),
  )[0];
  if (reviewScene) {
    const displayTitle = getScenePrimaryActionTitle(reviewScene);
    return {
      kind: "review",
      label: `复习 ${displayTitle}`,
      href: `/scene/${reviewScene.slug}`,
      scene: reviewScene,
    };
  }

  const fallbackScene = recommended[0];
  if (fallbackScene) {
    const displayTitle = getScenePrimaryActionTitle(fallbackScene);
    return {
      kind: "start",
      label: `开始 ${displayTitle}`,
      href: `/scene/${fallbackScene.slug}`,
      scene: fallbackScene,
    };
  }

  return {
    kind: "browse",
    label: "浏览推荐场景",
    href: "/scenes",
    scene: null,
  };
};

export const hasActiveFilters = (filters: SceneFilters) =>
  filters.category !== "all" ||
  filters.level !== "all" ||
  filters.source !== "all" ||
  filters.search.trim().length > 0;

export const CATEGORY_FILTER_OPTIONS: Array<{ value: SceneCategoryFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "starter", label: "新手" },
  { value: "daily_life", label: "日常生活" },
  { value: "time_plan", label: "时间安排" },
  { value: "social", label: "社交" },
  { value: "other", label: "其他" },
];

export const LEVEL_FILTER_OPTIONS: Array<{ value: SceneLevelFilter; label: string }> = [
  { value: "all", label: "全部等级" },
  { value: "L0", label: "L0 入门" },
  { value: "L1", label: "L1 基础" },
  { value: "L2", label: "L2 扩展" },
];

export const SOURCE_FILTER_OPTIONS: Array<{ value: SceneSourceFilter; label: string }> = [
  { value: "all", label: "全部来源" },
  { value: "builtin", label: "内置" },
  { value: "user_generated", label: "我的" },
  { value: "ai_generated", label: "AI生成" },
  { value: "imported", label: "导入" },
];

export const SORT_OPTIONS: Array<{ value: SceneSortOption; label: string }> = [
  { value: "recommended", label: "推荐优先" },
  { value: "simple", label: "简单优先" },
  { value: "recent", label: "最近学习" },
];
