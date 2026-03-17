import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentProfile } from "@/lib/server/auth";
import { getLearningOverview } from "@/lib/server/services/learning-service";

export default async function ProgressPage() {
  const { user } = await requireCurrentProfile();
  const overview = await getLearningOverview(user.id).catch((error) => {
    console.warn(
      "[progress][learning-overview-fallback]",
      error instanceof Error ? error.message : "unknown",
    );
    return {
      streakDays: 0,
      completedScenesCount: 0,
      inProgressScenesCount: 0,
      savedPhraseCount: 0,
      recentStudyMinutes: 0,
      reviewAccuracy: null as number | null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="学习进度"
        title="你的学习节奏"
        description="查看连续性、复习表现与能力变化，及时调整每日学习重心。"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="连续学习" value={`${overview.streakDays} 天`} />
        <StatCard title="完成场景" value={`${overview.completedScenesCount}`} />
        <StatCard title="学习中场景" value={`${overview.inProgressScenesCount}`} />
        <StatCard title="已收藏短语" value={`${overview.savedPhraseCount}`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>最近学习数据</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          最近 7 天累计学习约 {overview.recentStudyMinutes} 分钟。
          <br />
          复习正确率：{overview.reviewAccuracy == null ? "—" : `${overview.reviewAccuracy}%`}
        </CardContent>
      </Card>
    </div>
  );
}
