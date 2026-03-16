import Link from "next/link";
import { syncSeedScenesAction } from "@/app/(app)/admin/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/server/auth";
import { getAdminOverviewStats } from "@/lib/server/admin/service";

const entries = [
  {
    title: "场景",
    description: "查看全部 seed/imported 场景，支持搜索和筛选。",
    href: "/admin/scenes",
  },
  {
    title: "导入场景",
    description: "重点排查 imported 场景，便于检查 parse 质量和清理数据。",
    href: "/admin/imported",
  },
  {
    title: "变体",
    description: "查看生成变体，并追溯到源场景。",
    href: "/admin/variants",
  },
  {
    title: "AI 缓存",
    description: "只读查看缓存记录，用于 parse/variant 排查。",
    href: "/admin/cache",
  },
];

export default function AdminHomePage() {
  return <AdminHomePageContent />;
}

async function AdminHomePageContent() {
  const [adminUser, stats] = await Promise.all([
    requireAdmin(),
    getAdminOverviewStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="内部工具"
        title="管理后台"
        description="用于排查和维护内容数据的极简管理页。"
        actions={
          <form action={syncSeedScenesAction}>
            <Button type="submit" variant="outline" size="sm">
              同步 Seed 场景
            </Button>
          </form>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm">Seed + 导入场景</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-semibold">{stats.totalScenes}</p>
            <p className="text-muted-foreground">导入场景：{stats.importedScenes}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm">场景变体</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-semibold">{stats.totalVariants}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm">AI Cache</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-semibold">{stats.totalCacheRows}</p>
            <p className="text-muted-foreground">
              最近缓存：{stats.latestCacheCreatedAt ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm">学习活跃度</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>有学习记录用户：{stats.totalUsersWithProgress}</p>
            <p>学习中：{stats.scenesInProgressCount}</p>
            <p>已完成：{stats.scenesCompletedCount}</p>
            <p className="text-muted-foreground">
              最近活跃：{stats.latestLearningActivityAt ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm">当前管理员</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {adminUser.email ?? adminUser.id}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link key={entry.href} href={entry.href} className="block">
            <Card className="border-border/70 transition-colors hover:bg-muted/30">
              <CardHeader>
                <CardTitle>{entry.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {entry.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
