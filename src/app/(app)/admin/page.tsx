import Link from "next/link";
import { syncSeedScenesAction } from "@/app/(app)/admin/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/server/auth";
import { getAdminOverviewStats } from "@/lib/server/admin/service";

const entries = [
  {
    title: "Scenes",
    description: "Browse all seed/imported scenes, search and filter.",
    href: "/admin/scenes",
  },
  {
    title: "Imported Scenes",
    description: "Focus on imported scenes for parse quality checks and cleanup.",
    href: "/admin/imported",
  },
  {
    title: "Variants",
    description: "Inspect generated variants and trace them back to source scenes.",
    href: "/admin/variants",
  },
  {
    title: "AI Cache",
    description: "Read-only cache records for parse/variant diagnostics.",
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
        eyebrow="Internal Tool"
        title="Admin"
        description="Minimal content operations for debugging and maintenance."
        actions={
          <form action={syncSeedScenesAction}>
            <Button type="submit" variant="outline" size="sm">
              Sync Seed Scenes
            </Button>
          </form>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm">Seed + Imported Scenes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-semibold">{stats.totalScenes}</p>
            <p className="text-muted-foreground">Imported: {stats.importedScenes}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm">Scene Variants</CardTitle>
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
              Latest: {stats.latestCacheCreatedAt ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm">Learning Activity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Users with progress: {stats.totalUsersWithProgress}</p>
            <p>In progress: {stats.scenesInProgressCount}</p>
            <p>Completed: {stats.scenesCompletedCount}</p>
            <p className="text-muted-foreground">
              Latest: {stats.latestLearningActivityAt ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm">Current Admin</CardTitle>
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
