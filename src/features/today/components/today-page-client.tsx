"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { TodayContinueCard } from "@/features/today/components/today-continue-card";
import { TodayLearningPathSection } from "@/features/today/components/today-learning-path-section";
import { todayPageLabels as zh } from "@/features/today/components/today-page-labels";
import {
  buildTodayTasks,
  getContinueLearningCardState,
  getRecommendedScenes,
  resolveTodayLearningSnapshot,
} from "@/features/today/components/today-page-selectors";
import { TodayRecommendedScenesSection } from "@/features/today/components/today-recommended-scenes-section";
import { TodayReviewSummaryCard } from "@/features/today/components/today-review-summary-card";
import { TodaySavedExpressionsSection } from "@/features/today/components/today-saved-expressions-section";
import { TodayWelcomeCard } from "@/features/today/components/today-welcome-card";
import { getLearningDashboardCache, setLearningDashboardCache } from "@/lib/cache/learning-dashboard-cache";
import { getPhraseListCache, setPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { getSceneListCache, setSceneListCache } from "@/lib/cache/scene-list-cache";
import { getLearningDashboardFromApi, LearningDashboardResponse } from "@/lib/utils/learning-api";
import { getMyPhrasesFromApi, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { warmupContinueLearningScene } from "@/lib/utils/scene-resource-actions";
import { getScenesFromApi, SceneListItemResponse } from "@/lib/utils/scenes-api";

const EMPTY_DASHBOARD: LearningDashboardResponse = {
  overview: {
    streakDays: 0,
    completedScenesCount: 0,
    inProgressScenesCount: 0,
    savedPhraseCount: 0,
    recentStudyMinutes: 0,
    reviewAccuracy: null,
  },
  continueLearning: null,
  todayTasks: {
    sceneTask: {
      done: false,
      continueSceneSlug: null,
      currentStep: null,
      masteryStage: null,
      progressPercent: 0,
      completedSentenceCount: 0,
    },
    reviewTask: { done: false, reviewItemsCompleted: 0, dueReviewCount: 0 },
    outputTask: { done: false, phrasesSavedToday: 0 },
  },
};

const getRecommendationReason = (scene: SceneListItemResponse) => {
  if (scene.learningStatus === "in_progress") return "可以顺手接着练";
  if (scene.learningStatus === "completed") return "适合回炉巩固";
  if (scene.progressPercent > 0) return "已经有一点熟悉感";
  return "适合今天开一个新场景";
};

const getRecommendationBadge = (scene: SceneListItemResponse) => {
  if (scene.progressPercent >= 100) return "🎯 巩固";
  if (scene.progressPercent >= 40) return "⭐ 继续";
  return "✨ 新鲜";
};

const getContinueStepIcon = (stepLabel: string) => {
  if (stepLabel.includes("听")) return "🎧";
  if (stepLabel.includes("表达")) return "✨";
  if (stepLabel.includes("变体")) return "🧩";
  if (stepLabel.includes("回炉")) return "🔁";
  if (stepLabel.includes("继续")) return "🌀";
  return "📝";
};

export function TodayPageClient({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<LearningDashboardResponse>(EMPTY_DASHBOARD);
  const [sceneList, setSceneList] = useState<SceneListItemResponse[]>([]);
  const [recentPhrases, setRecentPhrases] = useState<UserPhraseItemResponse[]>([]);
  const [dashboardDataSource, setDashboardDataSource] = useState<"none" | "cache" | "network">("none");
  const [phraseDataSource, setPhraseDataSource] = useState<"none" | "cache" | "network">("none");
  const [sceneDataSource, setSceneDataSource] = useState<"none" | "cache" | "network">("none");
  const activeLoadTokenRef = useRef(0);

  const refreshData = async (options?: { preferCache?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const preferCache = options?.preferCache ?? false;

    if (!preferCache) {
      setDashboardDataSource("none");
      setPhraseDataSource("none");
      setSceneDataSource("none");
    }
    setLoading(true);

    let hasCacheFallback = false;
    const canApply = () => activeLoadTokenRef.current === token;

    if (preferCache) {
      try {
        const [dashboardCache, phraseCache, sceneCache] = await Promise.all([
          getLearningDashboardCache(),
          getPhraseListCache({
            query: "",
            status: "saved",
            reviewStatus: "all",
            learningItemType: "expression",
            page: 1,
            limit: 3,
          }),
          getSceneListCache(),
        ]);

        if (canApply()) {
          if (dashboardCache.found && dashboardCache.record) {
            hasCacheFallback = true;
            setDashboard(dashboardCache.record.data);
            setDashboardDataSource("cache");
            setLoading(false);
          }
          if (phraseCache.found && phraseCache.record) {
            hasCacheFallback = true;
            setRecentPhrases(phraseCache.record.data.rows);
            setPhraseDataSource("cache");
            setLoading(false);
          }
          if (sceneCache.found && sceneCache.record) {
            hasCacheFallback = true;
            setSceneList(sceneCache.record.data);
            setSceneDataSource("cache");
            setLoading(false);
          }
        }
      } catch {
        // Ignore cache failures.
      }
    }

    const [dashboardResult, phrasesResult, scenesResult] = await Promise.allSettled([
      getLearningDashboardFromApi(),
      getMyPhrasesFromApi({
        status: "saved",
        reviewStatus: "all",
        learningItemType: "expression",
        page: 1,
        limit: 3,
      }),
      getScenesFromApi(),
    ]);

    if (!canApply()) return;

    let hasNetworkSuccess = false;

    if (dashboardResult.status === "fulfilled") {
      hasNetworkSuccess = true;
      setDashboard(dashboardResult.value);
      setDashboardDataSource("network");
      void setLearningDashboardCache(dashboardResult.value).catch(() => undefined);
    }

    if (phrasesResult.status === "fulfilled") {
      hasNetworkSuccess = true;
      setRecentPhrases(phrasesResult.value.rows);
      setPhraseDataSource("network");
      void setPhraseListCache(
        {
          query: "",
          status: "saved",
          reviewStatus: "all",
          learningItemType: "expression",
          page: 1,
          limit: 3,
        },
        {
          rows: phrasesResult.value.rows,
          total: phrasesResult.value.total,
          page: phrasesResult.value.page,
          limit: phrasesResult.value.limit,
        },
      ).catch(() => undefined);
    }

    if (scenesResult.status === "fulfilled") {
      hasNetworkSuccess = true;
      setSceneList(scenesResult.value);
      setSceneDataSource("network");
      void setSceneListCache(scenesResult.value).catch(() => undefined);
    }

    if (!hasNetworkSuccess && !hasCacheFallback) {
      const reason =
        dashboardResult.status === "rejected"
          ? dashboardResult.reason
          : phrasesResult.status === "rejected"
            ? phrasesResult.reason
            : scenesResult.status === "rejected"
              ? scenesResult.reason
              : new Error("unknown");
      toast.error(reason instanceof Error ? reason.message : zh.loadFail);
    }

    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshData({ preferCache: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[today-cache][debug]", {
      dashboard: dashboardDataSource,
      phrases: phraseDataSource,
      scenes: sceneDataSource,
      sceneCount: sceneList.length,
      phraseCount: recentPhrases.length,
    });
  }, [dashboardDataSource, phraseDataSource, recentPhrases.length, sceneDataSource, sceneList.length]);

  const todayLearningSnapshot = useMemo(
    () =>
      resolveTodayLearningSnapshot({
        dashboard,
        sceneList,
      }),
    [dashboard, sceneList],
  );
  const continueLearning = todayLearningSnapshot.continueLearning;

  const dailyTasks = useMemo(
    () =>
      buildTodayTasks({
        dashboard,
        continueLearning,
        labels: {
          taskSceneTitle: zh.taskSceneTitle,
          taskSceneDesc: zh.taskSceneDesc,
          taskReviewTitle: zh.taskReviewTitle,
          taskOutputTitle: zh.taskOutputTitle,
        },
      }),
    [continueLearning, dashboard],
  );

  const recommendedScenes = useMemo(() => getRecommendedScenes(sceneList), [sceneList]);
  const finalDisplayName = displayName || zh.userFallback;
  const isContinueCardPending =
    loading && dashboardDataSource === "none" && sceneDataSource === "none";
  const continueCardState = useMemo(
    () =>
      getContinueLearningCardState({
        continueLearning,
        sceneTask: dashboard.todayTasks.sceneTask,
        isPending: isContinueCardPending,
        emptyTitle: zh.continueEmptyTitle,
        emptyDesc: zh.continueEmptyDesc,
      }),
    [continueLearning, dashboard.todayTasks.sceneTask, isContinueCardPending],
  );
  const continueStepIcon = useMemo(
    () => getContinueStepIcon(continueCardState.stepLabel),
    [continueCardState.stepLabel],
  );
  const progressPercent = Math.round(
    todayLearningSnapshot.effectiveProgressPercent,
  );

  const expressionSummary = useMemo(() => {
    const todaySaved = dashboard.todayTasks.outputTask.phrasesSavedToday;
    const sceneSaved = continueLearning?.savedPhraseCount ?? 0;
    const dueReview = dashboard.todayTasks.reviewTask.dueReviewCount;
    const items = [
      todaySaved > 0 ? `today.saved(${todaySaved})` : null,
      sceneSaved > 0 ? `scene.saved(${sceneSaved})` : null,
      dueReview > 0 ? `review.due(${dueReview})` : null,
    ].filter(Boolean) as string[];

    if (items.length === 0) {
      return [
        "还没有新的表达沉淀下来",
        "完成一轮场景输入后，这里会开始积累你今天带走的表达。",
      ];
    }

    return items.map((item) => {
      if (item.startsWith("today.saved")) {
        return `今天已带走 ${todaySaved} 条表达`;
      }
      if (item.startsWith("scene.saved")) {
        return `当前场景累计保存 ${sceneSaved} 条表达`;
      }
      return `${dueReview} 条表达正在等待回忆`;
    });
  }, [
    continueLearning?.savedPhraseCount,
    dashboard.todayTasks.outputTask.phrasesSavedToday,
    dashboard.todayTasks.reviewTask.dueReviewCount,
  ]);

  const expressionPreviewItems = useMemo(() => {
    if (recentPhrases.length > 0) {
      return recentPhrases.map((phrase) => ({
        key: phrase.userPhraseId,
        text: phrase.text,
        meta:
          phrase.translation?.trim() ||
          phrase.usageNote?.trim() ||
          (phrase.sourceSceneSlug ? `来自场景 ${phrase.sourceSceneSlug}` : "最近保存"),
      }));
    }

    return expressionSummary.map((line) => ({
      key: line,
      text: line,
      meta: "等待你在场景里继续沉淀",
    }));
  }, [expressionSummary, recentPhrases]);

  useEffect(() => {
    if (!continueLearning) return;
    warmupContinueLearningScene({
      sceneSlug: continueLearning.sceneSlug,
      currentStep: todayLearningSnapshot.effectiveCurrentStep,
    });
  }, [continueLearning, todayLearningSnapshot.effectiveCurrentStep]);

  return (
    <div className="mx-auto max-w-[500px] space-y-[var(--mobile-space-lg)] text-foreground">
      <TodayWelcomeCard displayName={finalDisplayName} streakDays={dashboard.overview.streakDays} />

      <TodayLearningPathSection
        tasks={dailyTasks}
        onOpenTask={(task) => {
          if (task.id === "task-review") {
            startReviewSession({ router, source: "today-task" });
            return;
          }
          router.push(task.actionHref);
        }}
      />

      <TodayContinueCard
        title={continueCardState.title}
        subtitle={continueCardState.subtitle}
        stepLabel={continueCardState.stepLabel}
        stepIcon={continueStepIcon}
        helperText={continueCardState.helperText}
        progressPercent={progressPercent}
        isPending={continueCardState.isPending}
        ctaLabel={continueCardState.ctaLabel}
        onContinue={() => {
          if (continueCardState.isPending) return;
          router.push(continueCardState.href);
        }}
      />

      <TodaySavedExpressionsSection
        savedPhraseCount={dashboard.overview.savedPhraseCount}
        items={expressionPreviewItems}
      />

      <TodayReviewSummaryCard
        reviewAccuracy={dashboard.overview.reviewAccuracy}
        dueReviewCount={dashboard.todayTasks.reviewTask.dueReviewCount}
        onClick={() => {
          startReviewSession({ router, source: "today-task" });
        }}
      />

      <TodayRecommendedScenesSection
        loading={loading}
        recommendedScenes={recommendedScenes}
        emptyText={zh.recEmpty}
        loadingText={zh.sceneLoading}
        getRecommendationReason={getRecommendationReason}
        getRecommendationBadge={getRecommendationBadge}
        onOpenScene={(slug) => {
          router.push(`/scene/${slug}`);
        }}
      />
    </div>
  );
}
