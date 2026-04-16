"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminActionBar,
  AdminActionBarActions,
  AdminActionBarHint,
} from "@/components/shared/admin-action-bar";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clearClientEventRecords,
  listClientEventRecords,
  subscribeClientEventRecords,
  type ClientEventRecord,
} from "@/lib/utils/client-events";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_SM,
  APPLE_INPUT_BASE,
  APPLE_META_TEXT,
  APPLE_PANEL_RAISED,
  APPLE_TABLE_HEAD,
  APPLE_TABLE_ROW,
} from "@/lib/ui/apple-style";

const formatPayload = (payload: Record<string, unknown>) =>
  Object.entries(payload)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");

export function ClientEventsPanel() {
  const [records, setRecords] = useState<ClientEventRecord[]>([]);
  const [keyword, setKeyword] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ClientEventRecord["kind"]>("all");

  const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

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

          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索事件名或 payload"
              />
              <select
                value={kindFilter}
                onChange={(event) =>
                  setKindFilter(event.target.value as "all" | ClientEventRecord["kind"])
                }
                className={`h-9 px-3 text-sm ${APPLE_INPUT_BASE}`}
              >
                <option value="all">全部类型</option>
                <option value="event">event</option>
                <option value="failure">failure</option>
              </select>
            </div>

            <AdminActionBar className="rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)]">
              <AdminActionBarHint>
                当前展示 {filteredRecords.length} 条最近记录，刷新页面后仍可回看，直到本地记录被清空。
              </AdminActionBarHint>
              <AdminActionBarActions>
                <Button
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  onClick={() => setRecords(listClientEventRecords())}
                >
                  刷新
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  disabled={records.length === 0}
                  onClick={() => {
                    clearClientEventRecords();
                    setRecords([]);
                  }}
                >
                  清空记录
                </Button>
              </AdminActionBarActions>
            </AdminActionBar>
          </div>

          <div className="overflow-hidden rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)] bg-background">
            {filteredRecords.length === 0 ? (
              <div className={`px-3 py-8 text-center ${APPLE_META_TEXT}`}>
                当前没有可回看的业务记录。
              </div>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className={`sticky top-0 text-left text-xs ${APPLE_TABLE_HEAD}`}>
                    <tr>
                      <th className="px-3 py-2">类型</th>
                      <th className="px-3 py-2">事件名</th>
                      <th className="px-3 py-2">时间</th>
                      <th className="px-3 py-2">摘要</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className={APPLE_TABLE_ROW}>
                        <td className="px-3 py-2 whitespace-nowrap">{record.kind}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{record.name}</td>
                        <td className={`px-3 py-2 whitespace-nowrap ${APPLE_META_TEXT}`}>
                          {new Date(record.at).toLocaleString("zh-CN", { hour12: false })}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatPayload(record.payload)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
