"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { normalizeClientError } from "@/lib/client/api-error";
import { TodayContinueCard } from "@/features/today/components/today-continue-card";
import { TodayLearningPathSection } from "@/features/today/components/today-learning-path-section";
import { todayPageLabels as zh } from "@/features/today/components/today-page-labels";
import {
  buildTodayTasks,
  getTodayPrimaryCardState,
  getRecommendedScenes,
  resolveTodayPrimaryTaskExplanation,
  resolveTodayLearningSnapshot,
} from "@/features/today/components/today-page-selectors";
import { TodayRecommendedScenesSection } from "@/features/today/components/today-recommended-scenes-section";
import { TodayReviewSummaryCard } from "@/features/today/components/today-review-summary-card";
import { TodaySavedExpressionsSection } from "@/features/today/components/today-saved-expressions-section";
import { TodayWelcomeCard } from "@/features/today/components/today-welcome-card";
import { clearLearningDashboardCache, getLearningDashboardCache, setLearningDashboardCache } from "@/lib/cache/learning-dashboard-cache";
import { clearAllPhraseListCache, getPhraseListCache, setPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { clearSceneListCache, getSceneListCache, setSceneListCache } from "@/lib/cache/scene-list-cache";
import { recordClientEvent } from "@/lib/utils/client-events";
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
    reviewTask: {
      done: false,
      reviewItemsCompleted: 0,
      dueReviewCount: 0,
      confidentOutputCountToday: 0,
      fullOutputCountToday: 0,
      variantRewriteCountToday: 0,
      targetCoverageCountToday: 0,
      targetCoverageMissCountToday: 0,
    },
    outputTask: { done: false, phrasesSavedToday: 0 },
  },
  starterRecommendation: null,
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
  const [, setLoading] = useState(true);
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
      toast.error(
        normalizeClientError(reason, {
          context: "generic",
          fallbackMessage: zh.loadFail,
        }).message,
      );
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
    const handlePullRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname?: string; handled?: boolean }>;
      const path = (customEvent.detail?.pathname ?? "").split("?")[0];
      if (path !== "/today") return;
      if (customEvent.detail) customEvent.detail.handled = true;
      void Promise.all([
        clearLearningDashboardCache(),
        clearAllPhraseListCache(),
        clearSceneListCache(),
      ]).then(() => refreshData({ preferCache: false }));
    };
    window.addEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    return () => {
      window.removeEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    };
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
  const primaryTaskExplanation = useMemo(
    () =>
      resolveTodayPrimaryTaskExplanation({
        tasks: dailyTasks,
      }),
    [dailyTasks],
  );

  const recommendedScenes = useMemo(() => getRecommendedScenes(sceneList), [sceneList]);
  const finalDisplayName = displayName || zh.userFallback;
  const isContinueCardPending = dashboardDataSource === "none";
  const primaryCardState = useMemo(
    () =>
      getTodayPrimaryCardState({
        dashboard,
        continueLearning,
        sceneTask: dashboard.todayTasks.sceneTask,
        isPending: isContinueCardPending,
        emptyTitle: zh.continueEmptyTitle,
        emptyDesc: zh.continueEmptyDesc,
      }),
    [continueLearning, dashboard, isContinueCardPending],
  );
  const continueStepIcon = useMemo(
    () => getContinueStepIcon(primaryCardState.stepLabel),
    [primaryCardState.stepLabel],
  );
  const progressPercent = Math.round(
    primaryCardState.progressPercent || todayLearningSnapshot.effectiveProgressPercent,
  );
  const continueResultSummary = useMemo(() => {
    const todaySaved = dashboard.todayTasks.outputTask.phrasesSavedToday;
    const sceneSaved = continueLearning?.savedPhraseCount ?? 0;
    const dueReview = dashboard.todayTasks.reviewTask.dueReviewCount;

    if (continueLearning?.isRepeat) {
      return dueReview > 0
        ? `这轮回炉结束后，还有 ${dueReview} 条待回忆可以继续收口。`
        : "这轮回炉完成后，今天的输入闭环会更稳。";
    }

    if (sceneSaved > 0 && dueReview > 0) {
      return `当前场景已沉淀 ${sceneSaved} 条表达，完成这一步后还有 ${dueReview} 条待回忆。`;
    }
    if (todaySaved > 0 && dueReview > 0) {
      return `今天已带走 ${todaySaved} 条表达，完成当前推进后还有 ${dueReview} 条待回忆。`;
    }
    if (sceneSaved > 0) {
      return `当前场景已沉淀 ${sceneSaved} 条表达，适合这一轮结束后马上做回忆。`;
    }
    if (todaySaved > 0) {
      return `今天已带走 ${todaySaved} 条表达，继续推进会更容易把它们留住。`;
    }
    if (dueReview > 0) {
      return `完成当前推进后，还有 ${dueReview} 条待回忆在等你主动提取。`;
    }
    return "先把这一步做完，今天这轮输入才会真正沉下来。";
  }, [
    continueLearning?.isRepeat,
    continueLearning?.savedPhraseCount,
    dashboard.todayTasks.outputTask.phrasesSavedToday,
    dashboard.todayTasks.reviewTask.dueReviewCount,
  ]);

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
    <div className="min-h-screen bg-[#f8fafc] font-['-apple-system','BlinkMacSystemFont','Segoe_UI',sans-serif]">
      <div className="mx-auto max-w-[760px] space-y-6 px-3 pb-28 pt-3 text-foreground sm:space-y-7 sm:pb-32 sm:pt-4 lg:px-5">
      <TodayWelcomeCard displayName={finalDisplayName} streakDays={dashboard.overview.streakDays} />

      <TodayContinueCard
        title={primaryCardState.title}
        subtitle={primaryCardState.sceneDescription}
        sceneTitle={primaryCardState.sceneTitle}
        stepLabel={primaryCardState.stepLabel}
        stepIcon={continueStepIcon}
        helperText={primaryCardState.reason}
        resultSummary={continueResultSummary}
        progressPercent={progressPercent}
        isPending={primaryCardState.isPending}
        ctaLabel={primaryCardState.ctaLabel}
        metaItems={primaryCardState.metaItems}
        onContinue={() => {
          if (primaryCardState.isPending) return;
          recordClientEvent("today_continue_clicked", {
            sceneSlug: continueLearning?.sceneSlug ?? null,
            currentStep: todayLearningSnapshot.effectiveCurrentStep,
            progressPercent,
            recommendationType: dashboard.starterRecommendation?.type ?? "fallback",
          });
          router.push(primaryCardState.href);
        }}
      />

      <TodayLearningPathSection
        tasks={dailyTasks}
        primaryTaskTitle={primaryTaskExplanation.title}
        primaryTaskReason={primaryTaskExplanation.reason}
        onOpenTask={(task) => {
          if (task.id === "task-review") {
            startReviewSession({ router, source: "today-task" });
            return;
          }
          router.push(task.actionHref);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <TodaySavedExpressionsSection
          savedPhraseCount={dashboard.overview.savedPhraseCount}
          items={expressionPreviewItems}
        />

        <TodayReviewSummaryCard
          reviewAccuracy={dashboard.overview.reviewAccuracy}
          dueReviewCount={dashboard.todayTasks.reviewTask.dueReviewCount}
          onClick={() => {
            recordClientEvent("today_review_opened", {
              dueReviewCount: dashboard.todayTasks.reviewTask.dueReviewCount,
              reviewedTodayCount: dashboard.todayTasks.reviewTask.reviewItemsCompleted,
            });
            startReviewSession({ router, source: "today-task" });
          }}
        />
      </div>

      <TodayRecommendedScenesSection
        loading={sceneDataSource === "none"}
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
    </div>
  );
}
