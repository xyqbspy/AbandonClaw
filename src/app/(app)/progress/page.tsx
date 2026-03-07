import { progressSummary } from "@/lib/data/mock-dashboard";
import { ProgressOverview } from "@/features/progress/components/progress-overview";
import { PageHeader } from "@/components/shared/page-header";

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="学习进度"
        title="你的学习节奏"
        description="查看连续性、复习表现与能力维度变化，及时调整每日学习重心。"
      />
      <ProgressOverview summary={progressSummary} />
    </div>
  );
}
