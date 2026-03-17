import Link from "next/link";
import { ArrowRight, BookOpenCheck, Flame } from "lucide-react";
import { requireCurrentProfile } from "@/lib/server/auth";
import { getLearningDashboard } from "@/lib/server/services/learning-service";
import { listScenes } from "@/lib/server/services/scene-service";
import { DailyTask } from "@/lib/types";
import { TodayTaskList } from "@/features/today/components/today-task-list";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TodayPage() {
  const { user, profile } = await requireCurrentProfile();
  const sceneList = await listScenes({ userId: user.id });
  const dashboard = await getLearningDashboard(user.id).catch((error) => {
    console.warn(
      "[today][learning-dashboard-fallback]",
      error instanceof Error ? error.message : "unknown",
    );
    return {
      overview: {
        streakDays: 0,
        completedScenesCount: 0,
        inProgressScenesCount: 0,
        savedPhraseCount: 0,
        recentStudyMinutes: 0,
        reviewAccuracy: null as number | null,
      },
      continueLearning: null,
      todayTasks: {
        sceneTask: { done: false, continueSceneSlug: null },
        reviewTask: { done: false, reviewItemsCompleted: 0, dueReviewCount: 0 },
        outputTask: { done: false, phrasesSavedToday: 0 },
      },
    };
  });

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
      title: "完成一个场景学习",
      description: continueLearning
        ? `继续 ${continueLearning.title}，推进到 100%。`
        : "选择一个场景并开始学习。",
      durationMinutes: continueLearning?.estimatedMinutes ?? 12,
      done: dashboard.todayTasks.sceneTask.done,
      actionHref: continueLearning ? `/scene/${continueLearning.sceneSlug}` : "/scenes",
    },
    {
      id: "task-review",
      title: "进行一次短时复习",
      description:
        dashboard.todayTasks.reviewTask.dueReviewCount > 0
          ? `当前待复习 ${dashboard.todayTasks.reviewTask.dueReviewCount} 条，今天已完成 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} 条。`
          : `今天已完成 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} 条复习。`,
      durationMinutes: 8,
      done: dashboard.todayTasks.reviewTask.done,
      actionHref: "/review",
    },
    {
      id: "task-output",
      title: "输出练习",
      description: `今日已累计收藏 ${dashboard.todayTasks.outputTask.phrasesSavedToday} 条短语。`,
      durationMinutes: 4,
      done: dashboard.todayTasks.outputTask.done,
      actionHref: "/chunks",
    },
  ];

  const recommendedScenes = sceneList.slice(0, 2);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="今日学习"
        title={`欢迎回来，${profile.username ?? user.email?.split("@")[0] ?? "学习者"}`}
        description="保持短时、稳定的学习节奏，比一次性学习更容易沉淀表达。"
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard
          title="连续学习"
          value={`${dashboard.overview.streakDays} 天`}
          icon={<Flame className="size-4 text-orange-500" />}
        />
        <StatCard title="已收藏短语" value={`${dashboard.overview.savedPhraseCount}`} />
        <StatCard
          title="复习正确率"
          value={
            dashboard.overview.reviewAccuracy == null
              ? "—"
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
              继续学习
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-medium">{continueLearning?.title ?? "选择一个场景开始学习"}</p>
            <p className="text-sm text-muted-foreground">
              {continueLearning?.subtitle ?? "你还没有学习记录，先进入一个场景吧。"}
            </p>
            {continueLearning ? (
              <p className="text-xs text-muted-foreground">
                当前进度：{Math.round(continueLearning.progressPercent)}%
              </p>
            ) : null}
            <Link
              href={continueLearning ? `/scene/${continueLearning.sceneSlug}` : "/scenes"}
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              继续学习
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>推荐下一组场景</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendedScenes.map((scene) => (
              <Link key={scene.id} href={`/scene/${scene.slug}`} className="block">
                <div className="rounded-lg border border-border/70 p-3 text-sm transition-colors hover:bg-muted">
                  <p className="font-medium">{scene.title}</p>
                  <p className="text-muted-foreground">预计时间 {scene.estimatedMinutes} 分钟</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
