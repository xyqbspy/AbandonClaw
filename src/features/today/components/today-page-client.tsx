"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpenCheck, Flame } from "lucide-react";
import { toast } from "sonner";
import { TodayTaskList } from "@/features/today/components/today-task-list";
import { todayPageLabels as zh } from "@/features/today/components/today-page-labels";
import {
  buildTodayTasks,
  getContinueLearningHelperText,
  getContinueLearningStepLabel,
  getRecommendedScenes,
  resolveContinueLearning,
} from "@/features/today/components/today-page-selectors";
import {
  getLearningDashboardCache,
  setLearningDashboardCache,
} from "@/lib/cache/learning-dashboard-cache";
import { getSceneListCache, setSceneListCache } from "@/lib/cache/scene-list-cache";
import { DailyTask } from "@/lib/types";
import {
  LearningDashboardResponse,
  getLearningDashboardFromApi,
} from "@/lib/utils/learning-api";
import { warmupContinueLearningScene } from "@/lib/utils/scene-resource-actions";
import { getScenesFromApi, SceneListItemResponse } from "@/lib/utils/scenes-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingState } from "@/components/shared/action-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_MD,
  APPLE_CARD_INTERACTIVE,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";

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
    },
    reviewTask: { done: false, reviewItemsCompleted: 0, dueReviewCount: 0 },
    outputTask: { done: false, phrasesSavedToday: 0 },
  },
};

export function TodayPageClient({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<LearningDashboardResponse>(EMPTY_DASHBOARD);
  const [sceneList, setSceneList] = useState<SceneListItemResponse[]>([]);
  const [dashboardDataSource, setDashboardDataSource] = useState<
    "none" | "cache" | "network"
  >("none");
  const [sceneDataSource, setSceneDataSource] = useState<"none" | "cache" | "network">(
    "none",
  );
  const activeLoadTokenRef = useRef(0);

  const refreshData = async (options?: { preferCache?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const preferCache = options?.preferCache ?? false;
    if (!preferCache) {
      setDashboardDataSource("none");
      setSceneDataSource("none");
    }
    setLoading(true);

    let hasCacheFallback = false;
    const canApply = () => activeLoadTokenRef.current === token;
    if (preferCache) {
      try {
        const [dashboardCache, sceneCache] = await Promise.all([
          getLearningDashboardCache(),
          getSceneListCache(),
        ]);
        if (canApply()) {
          if (dashboardCache.found && dashboardCache.record) {
            hasCacheFallback = true;
            setDashboard(dashboardCache.record.data);
            setDashboardDataSource("cache");
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

    const [dashboardResult, scenesResult] = await Promise.allSettled([
      getLearningDashboardFromApi(),
      getScenesFromApi(),
    ]);
    if (!canApply()) return;

    let hasNetworkSuccess = false;
    if (dashboardResult.status === "fulfilled") {
      hasNetworkSuccess = true;
      setDashboard(dashboardResult.value);
      setDashboardDataSource("network");
      void setLearningDashboardCache(dashboardResult.value).catch(() => {
        // Non-blocking.
      });
    }

    if (scenesResult.status === "fulfilled") {
      hasNetworkSuccess = true;
      setSceneList(scenesResult.value);
      setSceneDataSource("network");
      void setSceneListCache(scenesResult.value).catch(() => {
        // Non-blocking.
      });
    }

    if (!hasNetworkSuccess && !hasCacheFallback) {
      const reason =
        dashboardResult.status === "rejected"
          ? dashboardResult.reason
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
      scenes: sceneDataSource,
      sceneCount: sceneList.length,
    });
  }, [dashboardDataSource, sceneDataSource, sceneList.length]);

  const continueLearning = useMemo(
    () => resolveContinueLearning(dashboard, sceneList),
    [dashboard, sceneList],
  );
  const dailyTasks: DailyTask[] = useMemo(
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
  const continueStepLabel = useMemo(
    () => getContinueLearningStepLabel(continueLearning, dashboard.todayTasks.sceneTask),
    [continueLearning, dashboard.todayTasks.sceneTask],
  );
  const continueHelperText = useMemo(
    () => getContinueLearningHelperText(continueLearning, dashboard.todayTasks.sceneTask),
    [continueLearning, dashboard.todayTasks.sceneTask],
  );

  useEffect(() => {
    if (!continueLearning) return;
    warmupContinueLearningScene({
      sceneSlug: continueLearning.sceneSlug,
      currentStep: dashboard.todayTasks.sceneTask.currentStep ?? continueLearning.currentStep,
    });
  }, [continueLearning, dashboard.todayTasks.sceneTask.currentStep]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={zh.eyebrow}
        title={`\u6b22\u8fce\u56de\u6765\uff0c${finalDisplayName}`}
        description={zh.desc}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard
          title={zh.statStreak}
          value={`${dashboard.overview.streakDays} ${zh.day}`}
          icon={<Flame className="size-4 text-orange-500" />}
        />
        <StatCard title={zh.statSaved} value={`${dashboard.overview.savedPhraseCount}`} />
        <StatCard
          title={zh.statAcc}
          value={
            dashboard.overview.reviewAccuracy == null
              ? "\u2014"
              : `${dashboard.overview.reviewAccuracy}%`
          }
        />
      </div>

      <TodayTaskList
        tasks={dailyTasks}
        onStartTask={(task) => {
          if (task.status === "locked") return;
          if (task.id === "task-review") {
            startReviewSession({ router, source: "today-task" });
            return;
          }
          router.push(task.actionHref);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={APPLE_CARD_INTERACTIVE}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${APPLE_TITLE_MD}`}>
              <BookOpenCheck className="size-5" />
              {zh.continueTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold text-foreground">
              {continueLearning?.title ?? zh.continueEmptyTitle}
            </p>
            <p className={APPLE_META_TEXT}>
              {continueLearning?.subtitle ?? zh.continueEmptyDesc}
            </p>
            {continueLearning ? (
              <div className={`space-y-1 p-3 ${APPLE_PANEL}`}>
                <p className="text-xs font-medium text-foreground/80">
                  {zh.continueCurrentPrefix}：{continueStepLabel}
                </p>
                <p className={APPLE_META_TEXT}>
                  {zh.currentProgress}：{Math.round(continueLearning.progressPercent)}%
                </p>
                <p className={APPLE_META_TEXT}>
                  {zh.continueHintTitle}：{continueHelperText}
                </p>
              </div>
            ) : null}
            <Link
              href={continueLearning ? `/scene/${continueLearning.sceneSlug}` : "/scenes"}
              className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 ${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_MD} active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
            >
              {zh.continueBtn}
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className={APPLE_CARD_INTERACTIVE}>
          <CardHeader>
            <CardTitle className={APPLE_TITLE_MD}>{zh.recTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && recommendedScenes.length === 0 ? (
              <LoadingState text={zh.sceneLoading} className="py-1" />
            ) : recommendedScenes.length === 0 ? (
              <p className={APPLE_META_TEXT}>{zh.recEmpty}</p>
            ) : (
              recommendedScenes.map((scene) => (
                <Link key={scene.id} href={`/scene/${scene.slug}`} className="block">
                  <div className={`p-3 text-sm ${APPLE_LIST_ITEM}`}>
                    <p className="font-semibold text-foreground">{scene.title}</p>
                    <p className={APPLE_META_TEXT}>
                      {zh.estimatedMinutes} {scene.estimatedMinutes} {zh.minute}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
