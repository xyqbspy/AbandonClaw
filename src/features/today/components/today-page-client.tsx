"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpenCheck, Flame } from "lucide-react";
import { toast } from "sonner";
import { TodayTaskList } from "@/features/today/components/today-task-list";
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

const zh = {
  loadFail: "\u52a0\u8f7d\u4eca\u65e5\u5b66\u4e60\u6570\u636e\u5931\u8d25\u3002",
  eyebrow: "\u4eca\u65e5\u5b66\u4e60",
  desc: "\u4fdd\u6301\u77ed\u65f6\u3001\u7a33\u5b9a\u7684\u5b66\u4e60\u8282\u594f\uff0c\u6bd4\u4e00\u6b21\u6027\u5b66\u4e60\u66f4\u5bb9\u6613\u6c89\u6dc0\u8868\u8fbe\u3002",
  statStreak: "\u8fde\u7eed\u5b66\u4e60",
  statSaved: "\u5df2\u6536\u85cf\u77ed\u8bed",
  statAcc: "\u590d\u4e60\u6b63\u786e\u7387",
  continueTitle: "\u7ee7\u7eed\u5b66\u4e60",
  continueEmptyTitle: "\u9009\u62e9\u4e00\u4e2a\u573a\u666f\u5f00\u59cb\u5b66\u4e60",
  continueEmptyDesc: "\u4f60\u8fd8\u6ca1\u6709\u5b66\u4e60\u8bb0\u5f55\uff0c\u5148\u8fdb\u5165\u4e00\u4e2a\u573a\u666f\u5427\u3002",
  continueBtn: "\u7ee7\u7eed\u5b66\u4e60",
  currentProgress: "\u5f53\u524d\u8fdb\u5ea6",
  recTitle: "\u63a8\u8350\u4e0b\u4e00\u7ec4\u573a\u666f",
  sceneLoading: "\u573a\u666f\u52a0\u8f7d\u4e2d...",
  recEmpty: "\u6682\u65e0\u53ef\u63a8\u8350\u573a\u666f\u3002",
  estimatedMinutes: "\u9884\u8ba1\u65f6\u95f4",
  minute: "\u5206\u949f",
  taskSceneTitle: "\u5b8c\u6210\u4e00\u4e2a\u573a\u666f\u5b66\u4e60",
  taskSceneDesc: "\u9009\u62e9\u4e00\u4e2a\u573a\u666f\u5e76\u5f00\u59cb\u5b66\u4e60\u3002",
  taskReviewTitle: "\u8fdb\u884c\u4e00\u6b21\u77ed\u65f6\u590d\u4e60",
  taskOutputTitle: "\u8f93\u51fa\u7ec3\u4e60",
  userFallback: "\u5b66\u4e60\u8005",
  day: "\u5929",
};

export function TodayPageClient({ displayName }: { displayName: string }) {
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

    const dashboardPromise = getLearningDashboardFromApi();
    const scenesPromise = getScenesFromApi();

    const cacheTask = (async () => {
      if (!preferCache) return;
      try {
        const [dashboardCache, sceneCache] = await Promise.all([
          getLearningDashboardCache(),
          getSceneListCache(),
        ]);
        if (!canApply()) return;

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
      } catch {
        // Ignore cache failures.
      }
    })();

    const networkTask = (async () => {
      const [dashboardResult, scenesResult] = await Promise.allSettled([
        dashboardPromise,
        scenesPromise,
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
    })();

    await Promise.allSettled([cacheTask, networkTask]);
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

  const continueLearning =
    dashboard.continueLearning ??
    (sceneList[0]
      ? {
          sceneSlug: sceneList[0].slug,
          title: sceneList[0].title,
          subtitle: sceneList[0].subtitle,
          progressPercent: sceneList[0].progressPercent,
          lastViewedAt: sceneList[0].lastViewedAt,
          lastSentenceIndex: null,
          estimatedMinutes: sceneList[0].estimatedMinutes,
          savedPhraseCount: 0,
        }
      : null);

  const dailyTasks: DailyTask[] = [
    {
      id: "task-scene",
      title: zh.taskSceneTitle,
      description: continueLearning
        ? `\u7ee7\u7eed ${continueLearning.title}\uff0c\u63a8\u8fdb\u5230 100%\u3002`
        : zh.taskSceneDesc,
      durationMinutes: continueLearning?.estimatedMinutes ?? 12,
      done: dashboard.todayTasks.sceneTask.done,
      actionHref: continueLearning ? `/scene/${continueLearning.sceneSlug}` : "/scenes",
    },
    {
      id: "task-review",
      title: zh.taskReviewTitle,
      description:
        dashboard.todayTasks.reviewTask.dueReviewCount > 0
          ? `\u5f53\u524d\u5f85\u590d\u4e60 ${dashboard.todayTasks.reviewTask.dueReviewCount} \u6761\uff0c\u4eca\u5929\u5df2\u5b8c\u6210 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} \u6761\u3002`
          : `\u4eca\u5929\u5df2\u5b8c\u6210 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} \u6761\u590d\u4e60\u3002`,
      durationMinutes: 8,
      done: dashboard.todayTasks.reviewTask.done,
      actionHref: "/review",
    },
    {
      id: "task-output",
      title: zh.taskOutputTitle,
      description: `\u4eca\u65e5\u5df2\u7d2f\u8ba1\u6536\u85cf ${dashboard.todayTasks.outputTask.phrasesSavedToday} \u6761\u77ed\u8bed\u3002`,
      durationMinutes: 4,
      done: dashboard.todayTasks.outputTask.done,
      actionHref: "/chunks",
    },
  ];

  const recommendedScenes = useMemo(() => sceneList.slice(0, 2), [sceneList]);
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

      <TodayTaskList tasks={dailyTasks} />

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
