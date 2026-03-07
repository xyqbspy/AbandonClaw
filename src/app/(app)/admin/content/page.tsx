import { Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="管理后台"
        title="内容管理"
        description="用于后续课程编辑、审核与发布流程的占位页面。"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            编辑流程（规划中）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- 课程草稿创建与分节编辑</p>
          <p>- AI 用法讲解审核与校对队列</p>
          <p>- 发布流程与版本记录</p>
        </CardContent>
      </Card>
    </div>
  );
}
