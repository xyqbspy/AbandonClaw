import type { SceneListItem } from "@/lib/server/scene/service";

type ContinueLearningInput = {
  sceneSlug: string;
  title: string;
  subtitle: string | null;
  progressPercent: number;
  estimatedMinutes: number | null;
} | null;

export type TodayPrimaryRecommendationType =
  | "continue"
  | "start_starter"
  | "next_starter"
  | "next_daily"
  | "empty";

export type TodayPrimaryRecommendationScene = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  category: string | null;
  estimatedMinutes: number | null;
  learningGoal: string | null;
  progressPercent: number | null;
};

export type TodayPrimaryRecommendation = {
  type: TodayPrimaryRecommendationType;
  scene: TodayPrimaryRecommendationScene | null;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
  completedStarterCount?: number;
  totalStarterCount?: number;
};

const normalizeLevel = (level?: string | null) => {
  if (level === "L0" || level === "L1" || level === "L2") return level;
  return "unknown" as const;
};

const levelRank = (level?: string | null) => {
  switch (normalizeLevel(level)) {
    case "L0":
      return 0;
    case "L1":
      return 1;
    case "L2":
      return 2;
    default:
      return 3;
  }
};

const isSceneCompleted = (scene: Pick<SceneListItem, "learningStatus" | "progressPercent">) =>
  scene.learningStatus === "completed" || scene.progressPercent >= 100;

const isStarterScene = (scene: Pick<SceneListItem, "sourceType" | "isStarter">) =>
  scene.sourceType === "builtin" && scene.isStarter === true;

const isStartedStarterScene = (scene: Pick<SceneListItem, "learningStatus" | "progressPercent">) =>
  !isSceneCompleted(scene) &&
  (scene.learningStatus === "in_progress" ||
    scene.learningStatus === "paused" ||
    scene.progressPercent > 0);

const isDailyPathScene = (scene: Pick<SceneListItem, "sourceType" | "category">) =>
  scene.sourceType === "builtin" &&
  (scene.category === "daily_life" || scene.category === "time_plan" || scene.category === "social");

const compareStarterCandidate = (left: SceneListItem, right: SceneListItem) => {
  const starterOrderDelta =
    (left.starterOrder ?? left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
    (right.starterOrder ?? right.sortOrder ?? Number.MAX_SAFE_INTEGER);
  if (starterOrderDelta !== 0) return starterOrderDelta;

  const levelDelta = levelRank(left.level) - levelRank(right.level);
  if (levelDelta !== 0) return levelDelta;

  const sortDelta = (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER);
  if (sortDelta !== 0) return sortDelta;

  const featuredDelta = Number(right.isFeatured === true) - Number(left.isFeatured === true);
  if (featuredDelta !== 0) return featuredDelta;

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
};

export const getStarterPathScenes = (scenes: SceneListItem[]) =>
  scenes.filter(isStarterScene).sort(compareStarterCandidate);

export const getNextStarterScene = (params: {
  scenes: SceneListItem[];
}): SceneListItem | null => {
  const starterScenes = getStarterPathScenes(params.scenes);
  const startedScene = starterScenes.find(isStartedStarterScene);
  if (startedScene) return startedScene;
  return starterScenes.find((scene) => !isSceneCompleted(scene)) ?? null;
};

const compareDailyCandidate = (left: SceneListItem, right: SceneListItem) => {
  const leftLevelRank = normalizeLevel(left.level) === "L2" ? 2 : levelRank(left.level);
  const rightLevelRank = normalizeLevel(right.level) === "L2" ? 2 : levelRank(right.level);
  const levelDelta = leftLevelRank - rightLevelRank;
  if (levelDelta !== 0) return levelDelta;

  const sortDelta = (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER);
  if (sortDelta !== 0) return sortDelta;

  const featuredDelta = Number(right.isFeatured === true) - Number(left.isFeatured === true);
  if (featuredDelta !== 0) return featuredDelta;

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
};

const toRecommendationScene = (
  scene: Pick<
    SceneListItem,
    | "id"
    | "slug"
    | "title"
    | "subtitle"
    | "level"
    | "category"
    | "estimatedMinutes"
    | "learningGoal"
    | "progressPercent"
  >,
): TodayPrimaryRecommendationScene => ({
  id: scene.id,
  slug: scene.slug,
  title: scene.title,
  description: scene.subtitle?.trim() || null,
  level: scene.level ?? null,
  category: scene.category ?? null,
  estimatedMinutes: scene.estimatedMinutes ?? null,
  learningGoal: scene.learningGoal?.trim() || null,
  progressPercent: Number.isFinite(scene.progressPercent) ? scene.progressPercent : null,
});

const buildContinueRecommendation = (
  continueLearning: NonNullable<ContinueLearningInput>,
  matchedScene?: SceneListItem | null,
): TodayPrimaryRecommendation => {
  const scene =
    matchedScene
      ? toRecommendationScene(matchedScene)
      : {
          id: continueLearning.sceneSlug,
          slug: continueLearning.sceneSlug,
          title: continueLearning.title,
          description: continueLearning.subtitle?.trim() || null,
          level: null,
          category: null,
          estimatedMinutes: continueLearning.estimatedMinutes ?? null,
          learningGoal: null,
          progressPercent: continueLearning.progressPercent,
        };
  const safeProgress = Math.max(0, Math.round(continueLearning.progressPercent));

  return {
    type: "continue",
    scene,
    title: "继续学习",
    reason:
      safeProgress > 0
        ? `你上次已经学到 ${safeProgress}% ，现在可以接着完成它。`
        : "你上次已经开始了这个场景，现在接着往下学会更顺。",
    ctaLabel: "继续学习",
    href: `/scene/${continueLearning.sceneSlug}`,
  };
};

const buildEmptyRecommendation = (): TodayPrimaryRecommendation => ({
  type: "empty",
  scene: null,
  title: "暂时没有可推荐的入门场景",
  reason: "当前没有可用的内置入门场景。你可以先去 Scenes 浏览已有场景，或稍后再试。",
  ctaLabel: "去 Scenes 浏览",
  href: "/scenes",
});

export const getTodayPrimaryRecommendation = (params: {
  scenes: SceneListItem[];
  continueLearning: ContinueLearningInput;
  dueReviewCount?: number;
}): TodayPrimaryRecommendation => {
  const { scenes, continueLearning } = params;

  if (continueLearning) {
    const matchedScene = scenes.find((scene) => scene.slug === continueLearning.sceneSlug) ?? null;
    return buildContinueRecommendation(continueLearning, matchedScene);
  }

  const starterScenes = getStarterPathScenes(scenes);
  const totalStarterCount = starterScenes.length;
  const completedStarterScenes = starterScenes.filter(isSceneCompleted);
  const completedStarterCount = completedStarterScenes.length;

  if (starterScenes.length > 0) {
    const nextStarter = getNextStarterScene({ scenes });
    if (nextStarter) {
      if (completedStarterCount === 0) {
        return {
          type: "start_starter",
          scene: toRecommendationScene(nextStarter),
          title: "今天从这里开始",
          reason:
            "这是 Start Here 的第一个场景，适合第一次学习。完成后，你会获得几个高频表达，并开启后续复习。",
          ctaLabel: "开始第一个场景",
          href: `/scene/${nextStarter.slug}`,
          completedStarterCount,
          totalStarterCount,
        };
      }

      return {
        type: "next_starter",
        scene: toRecommendationScene(nextStarter),
        title: "继续新手路径",
        reason: `你已经完成了 ${completedStarterCount}/${totalStarterCount} 个入门场景，继续完成这组基础对话。`,
        ctaLabel: "继续新手路径",
        href: `/scene/${nextStarter.slug}`,
        completedStarterCount,
        totalStarterCount,
      };
    }
  }

  const nextDailyScene =
    scenes
      .filter((scene) => isDailyPathScene(scene) && !isSceneCompleted(scene))
      .sort(compareDailyCandidate)[0] ?? null;

  if (nextDailyScene) {
    return {
      type: "next_daily",
      scene: toRecommendationScene(nextDailyScene),
      title: "进入日常生活场景",
      reason: "你已经完成入门路径，可以开始学习更真实的日常生活表达。",
      ctaLabel: "开始学习",
      href: `/scene/${nextDailyScene.slug}`,
      completedStarterCount,
      totalStarterCount,
    };
  }

  return buildEmptyRecommendation();
};
