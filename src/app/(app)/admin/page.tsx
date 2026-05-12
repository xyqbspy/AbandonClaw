import Link from "next/link";
import {
  AlertTriangle,
  HardDrive,
  Image,
  Layers,
  MessageSquareText,
  Search,
  RefreshCw,
  Sparkles,
  Ticket,
  UserRound,
} from "lucide-react";
import {
  syncSeedScenesAction,
  updateAdminHighCostControlAction,
} from "@/app/(app)/admin/actions";
import { readAdminNotice } from "@/app/(app)/admin/admin-page-state";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminNoticeCard } from "@/components/shared/admin-info-card";
import { requireAdmin } from "@/lib/server/auth";
import { getAdminHighCostCapabilityControls, getAdminOverviewStats } from "@/lib/server/admin/service";
import { cn } from "@/lib/utils";

const LABELS = {
  syncSeed: "同步内置场景",
  scenesTitle: "内置与导入场景",
  variantsTitle: "场景变体",
  cacheTitle: "AI 缓存",
  cacheHint: "最近缓存",
  activityTitle: "学习活跃度",
  learning: "学习中",
  activeUsers: "活跃用户",
  highCostTitle: "高成本紧急开关",
  highCostDescription: "关闭后将会在 Quota 预估和上游调用前拒绝请求",
} as const;

const HIGH_COST_LABELS: Record<string, string> = {
  practice_generate: "练习生成",
  scene_generate: "场景生成",
  similar_generate: "相似表达生成",
  expression_map_generate: "表达地图生成",
  explain_selection: "划词解释",
  tts_generate: "TTS 生成",
  tts_regenerate: "TTS 重生成",
};

const entries = [
  {
    title: "用户",
    description: "按邮箱、用户 ID、用户名和账号状态快速查找用户，并执行最小账号处置。",
    href: "/admin/users",
    icon: UserRound,
    iconClassName: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  },
  {
    title: "邀请码",
    description: "生成、停用和查看注册邀请码，追踪使用账号与最小活动情况。",
    href: "/admin/invites",
    icon: Ticket,
    iconClassName: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
  },
  {
    title: "场景",
    description: "查看全部 seed/imported 场景，支持搜索和筛选。",
    href: "/admin/scenes",
    icon: Image,
    iconClassName: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    title: "表达库",
    description: "管理表达与句子，支持筛选、补全、删除。",
    href: "/admin/phrases",
    icon: MessageSquareText,
    iconClassName: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
  },
  {
    title: "导入场景",
    description: "重点排查 imported 场景，便于检查解析质量。",
    href: "/admin/imported",
    icon: Layers,
    iconClassName: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    title: "变体",
    description: "查看已生成变体，并追溯到来源场景。",
    href: "/admin/variants",
    icon: Sparkles,
    iconClassName: "bg-pink-50 text-pink-600 group-hover:bg-pink-600 group-hover:text-white",
  },
  {
    title: "AI 缓存",
    description: "只读查看缓存记录，用于 parse/variant 故障排查。",
    href: "/admin/cache",
    icon: HardDrive,
    iconClassName: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
  },
  {
    title: "TTS 缓存",
    description: "查看当前浏览器里的本地音频缓存，并支持按需清理。",
    href: "/admin/tts",
    icon: HardDrive,
    iconClassName: "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
  },
  {
    title: "可观测性",
    description: "查看客户端事件与失败记录，用于回溯异常和排查线上问题。",
    href: "/admin/observability",
    icon: Search,
    iconClassName: "bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white",
  },
];

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const notice = readAdminNotice(params);
  const [, stats, highCostControls] = await Promise.all([
    requireAdmin(),
    getAdminOverviewStats(),
    getAdminHighCostCapabilityControls(),
  ]);
  const disabledControlCount = highCostControls.filter((item) => item.disabled).length;

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <form action={syncSeedScenesAction}>
          <button
            type="submit"
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-500 transition-all hover:text-blue-600"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {LABELS.syncSeed}
          </button>
        </form>
      </div>

      {notice ? <AdminNoticeCard tone={notice.tone}>{notice.notice}</AdminNoticeCard> : null}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5">
          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">{LABELS.scenesTitle}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{stats.totalScenes}</span>
            <span className="text-xs font-medium text-green-500">↑ {stats.importedScenes}</span>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 bg-blue-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5">
          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">{LABELS.variantsTitle}</p>
          <div className={cn("mt-2 text-3xl font-bold", stats.totalVariants > 0 ? "text-slate-800" : "text-slate-300")}>
            {stats.totalVariants}
          </div>
          <p className="mt-4 text-[10px] text-slate-400 italic">暂无增长数据</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5">
          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">{LABELS.cacheTitle}</p>
          <div className="mt-2 text-3xl font-bold text-slate-800">{stats.totalCacheRows}</div>
          <p className="mt-4 text-[10px] leading-tight text-slate-400">
            {LABELS.cacheHint}: {stats.latestCacheCreatedAt ?? "-"}
          </p>
        </div>

        <div className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg">
          <p className="text-xs font-bold tracking-wider uppercase opacity-80">{LABELS.activityTitle}</p>
          <div className="mt-2 flex items-center gap-4">
            <div>
              <span className="text-3xl font-bold">{stats.scenesInProgressCount}</span>
              <span className="block text-[10px] font-medium tracking-wide italic opacity-70">{LABELS.learning}</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <span className="text-3xl font-bold">{stats.totalUsersWithProgress}</span>
              <span className="block text-[10px] font-medium tracking-wide italic opacity-70">{LABELS.activeUsers}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border-2 border-orange-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 bg-orange-50 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-orange-800">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {LABELS.highCostTitle}
            </h2>
            <p className="mt-1 text-[11px] text-orange-600 opacity-80">{LABELS.highCostDescription}</p>
          </div>
          <span className="rounded bg-orange-200 px-2 py-1 text-[10px] font-black text-orange-800">
            {disabledControlCount} 个已关闭
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          {highCostControls.map((item) => (
            <div
              key={item.capability}
              className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 transition-all hover:bg-slate-50"
            >
              <div>
                <p className="text-xs font-bold text-slate-700">{HIGH_COST_LABELS[item.capability] ?? item.capability}</p>
                <p className="font-mono text-[10px] text-slate-400">{item.capability}</p>
              </div>
              <form action={updateAdminHighCostControlAction}>
                <input type="hidden" name="returnTo" value="/admin" />
                <input type="hidden" name="capability" value={item.capability} />
                <input type="hidden" name="disabled" value={item.disabled ? "false" : "true"} />
                <AdminActionButton
                  type="submit"
                  tone={item.disabled ? "primary" : "secondary"}
                  className={cn(
                    "min-h-0 rounded-full px-0 py-0 text-[0px]",
                    item.disabled ? "border-orange-200 bg-orange-50 hover:bg-orange-100" : "border-transparent bg-transparent hover:bg-transparent",
                  )}
                  aria-label={item.disabled ? "恢复" : "关闭"}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative flex h-5 w-10 items-center rounded-full px-1 transition-colors",
                      item.disabled ? "bg-slate-300" : "bg-green-500",
                    )}
                  >
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full bg-white shadow-sm transition-transform",
                        item.disabled ? "translate-x-0" : "translate-x-5",
                      )}
                    />
                  </span>
                </AdminActionButton>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {entries.map((entry) => {
          const Icon = entry.icon;

          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-500 hover:shadow-md"
            >
              <div
                className={cn(
                  "mb-4 flex size-10 items-center justify-center rounded-xl transition-all",
                  entry.iconClassName,
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{entry.title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{entry.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
