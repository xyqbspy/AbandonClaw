import Link from "next/link";
import { ArrowRight, BookOpenCheck, Flame } from "lucide-react";
import { dailyTasks, progressSummary } from "@/lib/data/mock-dashboard";
import { lessons } from "@/lib/data/mock-lessons";
import { TodayTaskList } from "@/features/today/components/today-task-list";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TodayPage() {
  const featuredLesson = lessons[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="今日学习"
        title="欢迎回来，Yilin"
        description="保持短时、稳定的学习节奏，比一次性学习更容易沉淀表达。"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="连续学习" value={`${progressSummary.streakDays} 天`} icon={<Flame className="size-4 text-orange-500" />} />
        <StatCard title="已收藏短语" value={`${progressSummary.chunksSaved}`} />
        <StatCard title="复习正确率" value={`${progressSummary.reviewAccuracy}%`} />
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
            <p className="text-lg font-medium">{featuredLesson.title}</p>
            <p className="text-sm text-muted-foreground">{featuredLesson.subtitle}</p>
            <Link
              href={`/lesson/${featuredLesson.slug}`}
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              继续学习
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>推荐下一节课程</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lessons.slice(0, 2).map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lesson/${lesson.slug}`}
                className="block rounded-lg border border-border/70 p-3 text-sm hover:bg-muted"
              >
                <p className="font-medium">{lesson.title}</p>
                <p className="text-muted-foreground">预计时间 {lesson.estimatedMinutes} 分钟</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
