"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CalendarClock, FileText, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  AdminActionBar,
  AdminActionBarActions,
  AdminActionBarHint,
} from "@/components/shared/admin-action-bar";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import {
  AdminEmptyState,
  AdminList,
  AdminListBadges,
  AdminListContent,
  AdminListIcon,
  AdminListItem,
  AdminListMeta,
  AdminListTitle,
} from "@/components/shared/admin-list-shell";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildTtsWarmupEffectivenessSummary,
  clearClientEventRecords,
  listClientEventRecords,
  subscribeClientEventRecords,
  type ClientEventRecord,
} from "@/lib/utils/client-events";
import {
  APPLE_ADMIN_CONTROL,
  APPLE_ADMIN_SELECT,
  APPLE_META_TEXT,
  APPLE_PANEL_RAISED,
} from "@/lib/ui/apple-style";
import { formatAdminDateTime } from "@/lib/ui/admin-format";

const formatPayload = (payload: Record<string, unknown>) =>
  Object.entries(payload)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");

const formatKind = (kind: ClientEventRecord["kind"]) => (kind === "failure" ? "失败摘要" : "业务动作");

const formatRate = (rate: number | null) => (rate == null ? "-" : `${Math.round(rate * 100)}%`);

const formatGain = (rate: number | null) => {
  if (rate == null) return "-";
  const value = Math.round(rate * 100);
  return `${value > 0 ? "+" : ""}${value}pp`;
};

export function ClientEventsPanel() {
  const [records, setRecords] = useState<ClientEventRecord[]>([]);
  const [keyword, setKeyword] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ClientEventRecord["kind"]>("all");

  useEffect(() => {
    const refresh = () => {
      setRecords(listClientEventRecords());
    };
    refresh();
    return subscribeClientEventRecords(refresh);
  }, []);

  const filteredRecords = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return records.filter((record) => {
      if (kindFilter !== "all" && record.kind !== kindFilter) return false;
      if (!normalizedKeyword) return true;
      return (
        record.name.toLowerCase().includes(normalizedKeyword) ||
        JSON.stringify(record.payload).toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [kindFilter, keyword, records]);

  const eventCount = records.filter((record) => record.kind === "event").length;
  const failureCount = records.filter((record) => record.kind === "failure").length;
  const ttsWarmupSummary = useMemo(
    () => buildTtsWarmupEffectivenessSummary(records),
    [records],
  );

  return (
    <div className="space-y-4">
      <Card className={APPLE_PANEL_RAISED}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">业务事件回看</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className={APPLE_META_TEXT}>
            这里会展示当前浏览器最近记录的关键学习动作与失败摘要，用于开发、验收和发布前排查，
            不替代正式埋点平台。
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard title="总记录" value={records.length} />
            <StatCard title="业务动作" value={eventCount} />
            <StatCard title="失败摘要" value={failureCount} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="段落预热命中"
              value={formatRate(ttsWarmupSummary.block.warmHitRate)}
              hint={`冷启动 ${formatRate(ttsWarmupSummary.block.coldHitRate)} / 提升 ${formatGain(ttsWarmupSummary.block.warmupGain)}`}
            />
            <StatCard
              title="整段预热可播"
              value={formatRate(ttsWarmupSummary.sceneFull.warmReadyRate)}
              hint={`冷启动 ${formatRate(ttsWarmupSummary.sceneFull.coldReadyRate)} / 提升 ${formatGain(ttsWarmupSummary.sceneFull.readyGain)}`}
            />
            <StatCard
              title="整段回退率"
              value={formatRate(ttsWarmupSummary.sceneFull.warmFallbackRate)}
              hint={`冷启动 ${formatRate(ttsWarmupSummary.sceneFull.coldFallbackRate)}`}
            />
            <StatCard
              title="预热来源"
              value={`I ${formatRate(ttsWarmupSummary.sources.initial.hitRate)}`}
              hint={`D ${formatRate(ttsWarmupSummary.sources.idle.hitRate)} / P ${formatRate(ttsWarmupSummary.sources.playback.hitRate)}`}
            />
          </div>

          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索事件名或负载"
                  className={`${APPLE_ADMIN_CONTROL} pl-9`}
                />
              </div>
              <select
                value={kindFilter}
                onChange={(event) =>
                  setKindFilter(event.target.value as "all" | ClientEventRecord["kind"])
                }
                className={APPLE_ADMIN_SELECT}
              >
                <option value="all">全部类型</option>
                <option value="event">业务动作</option>
                <option value="failure">失败摘要</option>
              </select>
            </div>

            <AdminActionBar className="rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)]">
              <AdminActionBarHint>
                当前展示 {filteredRecords.length} 条最近记录，刷新页面后仍可回看，直到本地记录被清空。
              </AdminActionBarHint>
              <AdminActionBarActions>
                <AdminActionButton
                  type="button"
                  onClick={() => setRecords(listClientEventRecords())}
                >
                  <RefreshCw className="size-3.5" />
                  刷新
                </AdminActionButton>
                <AdminActionButton
                  type="button"
                  tone="danger"
                  disabled={records.length === 0}
                  onClick={() => {
                    clearClientEventRecords();
                    setRecords([]);
                  }}
                >
                  <Trash2 className="size-3.5" />
                  清空记录
                </AdminActionButton>
              </AdminActionBarActions>
            </AdminActionBar>
          </div>

          <div className="rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)] bg-background p-3">
            {filteredRecords.length === 0 ? (
              <AdminEmptyState>当前没有可回看的业务记录。</AdminEmptyState>
            ) : (
              <AdminList className="max-h-[520px] overflow-auto pr-1">
                {filteredRecords.map((record) => (
                  <AdminListItem key={record.id}>
                    <AdminListIcon className={record.kind === "failure" ? "bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground" : undefined}>
                      {record.kind === "failure" ? <AlertTriangle className="size-5" /> : <Activity className="size-5" />}
                    </AdminListIcon>
                    <AdminListContent>
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminListTitle className="text-base">{record.name}</AdminListTitle>
                        <AdminListBadges>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                            {formatKind(record.kind)}
                          </span>
                        </AdminListBadges>
                      </div>
                      <AdminListMeta>
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="size-3.5" />
                          {formatAdminDateTime(record.at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileText className="size-3.5" />
                          {formatPayload(record.payload)}
                        </span>
                      </AdminListMeta>
                    </AdminListContent>
                  </AdminListItem>
                ))}
              </AdminList>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
