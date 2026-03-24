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
import { getScenesFromApi, SceneListItemResponse } from "@/lib/utils/scenes-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    sceneTask: { done: false, continueSceneSlug: null },
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="size-5" />
              {zh.continueTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-medium">
              {continueLearning?.title ?? zh.continueEmptyTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              {continueLearning?.subtitle ?? zh.continueEmptyDesc}
            </p>
            {continueLearning ? (
              <p className="text-xs text-muted-foreground">
                {zh.currentProgress}：{Math.round(continueLearning.progressPercent)}%
              </p>
            ) : null}
            <Link
              href={continueLearning ? `/scene/${continueLearning.sceneSlug}` : "/scenes"}
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {zh.continueBtn}
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{zh.recTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && recommendedScenes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{zh.sceneLoading}</p>
            ) : recommendedScenes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{zh.recEmpty}</p>
            ) : (
              recommendedScenes.map((scene) => (
                <Link key={scene.id} href={`/scene/${scene.slug}`} className="block">
                  <div className="rounded-lg border border-border/70 p-3 text-sm transition-colors hover:bg-muted">
                    <p className="font-medium">{scene.title}</p>
                    <p className="text-muted-foreground">
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
