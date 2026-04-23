import { Flame, Sparkles } from "lucide-react";
import { ProgressSummary } from "@/lib/types";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function ProgressWeeklyMinutesCard({ weeklyMinutes }: { weeklyMinutes: ProgressSummary["weeklyMinutes"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>本周学习时长</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-7 gap-2">
        {weeklyMinutes.map((minutes, index) => (
          <div key={`${minutes}-${index}`} className="space-y-1">
            <div
              className="rounded-lg bg-primary/15"
              style={{ height: `${Math.max(26, minutes * 2)}px` }}
            />
            <p className="text-center text-xs text-muted-foreground">{minutes} 分钟</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProgressSkillBreakdownCard({
  skillBreakdown,
}: {
  skillBreakdown: ProgressSummary["skillBreakdown"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>能力维度</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {skillBreakdown.map((skill) => (
          <div key={skill.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <p>{skill.name}</p>
              <p className="text-muted-foreground">{skill.value}%</p>
            </div>
            <Progress value={skill.value} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ProgressOverview({ summary }: { summary: ProgressSummary }) {
  const statCards = [
    {
      title: "连续学习",
      value: `${summary.streakDays} 天`,
      icon: <Flame className="size-4 text-orange-500" />,
    },
    {
      title: "完成课程",
      value: `${summary.lessonsCompleted}`,
    },
    {
      title: "已收藏短语",
      value: `${summary.chunksSaved}`,
    },
    {
      title: "复习正确率",
      value: `${summary.reviewAccuracy}%`,
      icon: <Sparkles className="size-4 text-sky-600" />,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ProgressWeeklyMinutesCard weeklyMinutes={summary.weeklyMinutes} />
        <ProgressSkillBreakdownCard skillBreakdown={summary.skillBreakdown} />
      </div>
    </div>
  );
}
