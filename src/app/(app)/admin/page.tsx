import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { syncSeedScenesAction } from "@/app/(app)/admin/actions";
import { readAdminNotice } from "@/app/(app)/admin/admin-page-state";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminInfoCard, AdminInfoList, AdminNoticeCard } from "@/components/shared/admin-info-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/server/auth";
import { getAdminOverviewStats } from "@/lib/server/admin/service";
import {
  APPLE_CARD_INTERACTIVE,
  APPLE_META_TEXT,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";

const LABELS = {
  eyebrow: "\u5185\u90e8\u5de5\u5177",
  title: "\u7ba1\u7406\u540e\u53f0",
  description: "\u7528\u4e8e\u6392\u67e5\u548c\u7ef4\u62a4\u5185\u5bb9\u6570\u636e\u7684\u6781\u7b80\u7ba1\u7406\u9875\u3002",
  syncSeed: "\u540c\u6b65\u5185\u7f6e\u573a\u666f",
  scenesTitle: "\u5185\u7f6e\u4e0e\u5bfc\u5165\u573a\u666f",
  scenesHint: "\u5bfc\u5165\u573a\u666f\uff1a",
  variantsTitle: "\u573a\u666f\u53d8\u4f53",
  cacheHint: "\u6700\u8fd1\u7f13\u5b58\uff1a",
  activityTitle: "\u5b66\u4e60\u6d3b\u8dc3\u5ea6",
  activityUsers: "\u6709\u5b66\u4e60\u8bb0\u5f55\u7528\u6237\uff1a",
  activityLearning: "\u5b66\u4e60\u4e2d\uff1a",
  activityDone: "\u5df2\u5b8c\u6210\uff1a",
  activityRecent: "\u6700\u8fd1\u6d3b\u8dc3\uff1a",
  adminTitle: "\u5f53\u524d\u7ba1\u7406\u5458",
} as const;

const entries = [
  {
    title: "\u573a\u666f",
    description:
      "\u67e5\u770b\u5168\u90e8 seed/imported \u573a\u666f\uff0c\u652f\u6301\u641c\u7d22\u548c\u7b5b\u9009\u3002",
    href: "/admin/scenes",
  },
  {
    title: "\u8868\u8fbe\u5e93",
    description:
      "\u7ba1\u7406\u8868\u8fbe\u4e0e\u53e5\u5b50\uff0c\u652f\u6301\u7b5b\u9009\u3001\u8865\u5168\u3001\u5220\u9664\u3002",
    href: "/admin/phrases",
  },
  {
    title: "\u5bfc\u5165\u573a\u666f",
    description:
      "\u91cd\u70b9\u6392\u67e5 imported \u573a\u666f\uff0c\u4fbf\u4e8e\u68c0\u67e5\u89e3\u6790\u8d28\u91cf\u3002",
    href: "/admin/imported",
  },
  {
    title: "\u53d8\u4f53",
    description:
      "\u67e5\u770b\u5df2\u751f\u6210\u53d8\u4f53\uff0c\u5e76\u8ffd\u6eaf\u5230\u6765\u6e90\u573a\u666f\u3002",
    href: "/admin/variants",
  },
  {
    title: "AI \u7f13\u5b58",
    description:
      "\u53ea\u8bfb\u67e5\u770b\u7f13\u5b58\u8bb0\u5f55\uff0c\u7528\u4e8e parse/variant \u6545\u969c\u6392\u67e5\u3002",
    href: "/admin/cache",
  },
  {
    title: "TTS \u7f13\u5b58",
    description:
      "\u67e5\u770b\u5f53\u524d\u6d4f\u89c8\u5668\u91cc\u7684\u672c\u5730\u97f3\u9891\u7f13\u5b58\uff0c\u5e76\u652f\u6301\u6309\u9700\u6e05\u7406\u3002",
    href: "/admin/tts",
  },
];

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const notice = readAdminNotice(params);
  const [adminUser, stats] = await Promise.all([requireAdmin(), getAdminOverviewStats()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={LABELS.eyebrow}
        title={LABELS.title}
        description={LABELS.description}
        actions={
          <form action={syncSeedScenesAction}>
            <AdminActionButton type="submit">
              <RefreshCw className="size-3.5" />
              {LABELS.syncSeed}
            </AdminActionButton>
          </form>
        }
      />

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={LABELS.scenesTitle}
          value={stats.totalScenes}
          hint={`${LABELS.scenesHint}${stats.importedScenes}`}
        />
        <StatCard title={LABELS.variantsTitle} value={stats.totalVariants} />
        <StatCard
          title="AI 缓存"
          value={stats.totalCacheRows}
          hint={`${LABELS.cacheHint}${stats.latestCacheCreatedAt ?? "-"}`}
        />
        <AdminInfoCard title={LABELS.activityTitle}>
          <AdminInfoList
            items={[
              { label: LABELS.activityUsers, value: stats.totalUsersWithProgress },
              { label: LABELS.activityLearning, value: stats.scenesInProgressCount },
              { label: LABELS.activityDone, value: stats.scenesCompletedCount },
              { label: LABELS.activityRecent, value: stats.latestLearningActivityAt ?? "-", muted: true },
            ]}
          />
        </AdminInfoCard>
      </div>

      <AdminInfoCard title={LABELS.adminTitle} contentClassName="text-muted-foreground">
        {adminUser.email ?? adminUser.id}
      </AdminInfoCard>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link key={entry.href} href={entry.href} className="block">
            <Card className={APPLE_CARD_INTERACTIVE}>
              <CardHeader>
                <CardTitle className={APPLE_TITLE_MD}>{entry.title}</CardTitle>
              </CardHeader>
              <CardContent className={APPLE_META_TEXT}>{entry.description}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
