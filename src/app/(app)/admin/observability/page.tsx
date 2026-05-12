import { ClientEventsPanel } from "@/components/admin/client-events-panel";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminObservabilityPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        variant="admin"
        eyebrow="管理后台"
        title="业务可观测性"
        description="回看当前浏览器最近记录的关键学习动作与失败摘要，帮助复盘真实学习闭环是否按预期发生。"
      />
      <ClientEventsPanel />
    </div>
  );
}
