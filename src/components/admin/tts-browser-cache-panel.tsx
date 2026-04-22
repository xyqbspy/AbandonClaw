"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Database, FileAudio, HardDrive, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AdminActionBar,
  AdminActionBarActions,
  AdminActionBarHint,
} from "@/components/shared/admin-action-bar";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import {
  AdminEmptyState,
  AdminList,
  AdminListActions,
  AdminListBadges,
  AdminListContent,
  AdminListIcon,
  AdminListItem,
  AdminListMeta,
  AdminListTitle,
} from "@/components/shared/admin-list-shell";
import { confirmAction } from "@/components/shared/confirm-action";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clearAllBrowserTtsCache,
  clearBrowserTtsCacheEntries,
  getBrowserTtsCacheSummary,
  listBrowserTtsCacheEntries,
  type BrowserTtsCacheEntry,
} from "@/lib/utils/tts-api";
import {
  APPLE_ADMIN_CONTROL,
  APPLE_ADMIN_SELECT,
  APPLE_META_TEXT,
  APPLE_PANEL_RAISED,
} from "@/lib/ui/apple-style";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

type SummaryState = {
  entryCount: number;
  totalBytes: number;
};

const TTS_KIND_LABELS: Record<BrowserTtsCacheEntry["kind"], string> = {
  sentence: "句子",
  block: "段落",
  chunk: "表达",
  scene: "完整场景",
  unknown: "未知",
};

const emptySummary: SummaryState = {
  entryCount: 0,
  totalBytes: 0,
};

export function TtsBrowserCachePanel() {
  const [entries, setEntries] = useState<BrowserTtsCacheEntry[]>([]);
  const [summary, setSummary] = useState<SummaryState>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | BrowserTtsCacheEntry["kind"]>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [supported, setSupported] = useState(true);

  const loadCacheState = async () => {
    setLoading(true);
    try {
      const cacheSupported =
        typeof window !== "undefined" &&
        typeof window.caches !== "undefined" &&
        typeof window.URL !== "undefined";
      setSupported(cacheSupported);
      if (!cacheSupported) {
        setEntries([]);
        setSummary(emptySummary);
        return;
      }

      const [nextEntries, nextSummary] = await Promise.all([
        listBrowserTtsCacheEntries(),
        getBrowserTtsCacheSummary(),
      ]);
      setEntries(nextEntries);
      setSummary(nextSummary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载 TTS 本地缓存失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCacheState();
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return entries.filter((entry) => {
      if (kindFilter !== "all" && entry.kind !== kindFilter) return false;
      if (!normalizedKeyword) return true;
      return entry.cacheKey.toLowerCase().includes(normalizedKeyword);
    });
  }, [entries, keyword, kindFilter]);

  const filteredBytes = useMemo(
    () => filteredEntries.reduce((sum, entry) => sum + entry.size, 0),
    [filteredEntries],
  );

  const groupedSummary = useMemo(() => {
    const base: Record<BrowserTtsCacheEntry["kind"], { count: number; bytes: number }> = {
      sentence: { count: 0, bytes: 0 },
      block: { count: 0, bytes: 0 },
      chunk: { count: 0, bytes: 0 },
      scene: { count: 0, bytes: 0 },
      unknown: { count: 0, bytes: 0 },
    };

    for (const entry of entries) {
      base[entry.kind].count += 1;
      base[entry.kind].bytes += entry.size;
    }

    return base;
  }, [entries]);

  const selectedEntryCount = selectedKeys.length;

  const refreshCacheState = async () => {
    setSelectedKeys([]);
    await loadCacheState();
  };

  const toggleSelectedKey = (cacheKey: string, checked: boolean) => {
    setSelectedKeys((current) => {
      if (checked) {
        return current.includes(cacheKey) ? current : [...current, cacheKey];
      }
      return current.filter((item) => item !== cacheKey);
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedKeys(checked ? filteredEntries.map((entry) => entry.cacheKey) : []);
  };

  const handleClearKeys = async (cacheKeys: string[], label: string) => {
    if (cacheKeys.length === 0 || clearing) return;

    const confirmed = await confirmAction(
      `确认清理${label}吗？这会删除当前浏览器里的 TTS 音频缓存。`,
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const result = await clearBrowserTtsCacheEntries(cacheKeys);
      toast.success(
        `已清理 ${result.removedCount} 条音频缓存，释放 ${formatBytes(result.removedBytes)}。`,
      );
      await refreshCacheState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "清理 TTS 本地缓存失败。");
    } finally {
      setClearing(false);
    }
  };

  const handleClearAll = async () => {
    if (clearing) return;
    const confirmed = await confirmAction(
      "确认清空当前浏览器里的全部 TTS 音频缓存吗？",
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const result = await clearAllBrowserTtsCache();
      toast.success(
        `已清空 ${result.removedCount} 条 TTS 缓存，释放 ${formatBytes(result.removedBytes)}。`,
      );
      await refreshCacheState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "清空 TTS 本地缓存失败。");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className={APPLE_PANEL_RAISED}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">浏览器本地 TTS 缓存</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className={APPLE_META_TEXT}>
            这里显示的是当前设备、当前浏览器里的本地音频缓存。首次在线播放成功后，
            后续会优先从这里复用。
          </p>

          {!supported ? (
            <div className={`rounded-[var(--app-radius-panel)] border border-dashed border-[var(--app-border-soft)] px-3 py-4 ${APPLE_META_TEXT}`}>
              当前环境不支持浏览器 Cache Storage，无法查看本地 TTS 缓存。
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard title="总条目" value={summary.entryCount} />
                <StatCard title="总占用" value={formatBytes(summary.totalBytes)} valueClassName="text-xl" />
                <StatCard title="当前筛选结果" value={filteredEntries.length} hint={formatBytes(filteredBytes)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(["sentence", "block", "chunk", "scene", "unknown"] as const).map((kind) => (
                  <StatCard
                    key={kind}
                    title={TTS_KIND_LABELS[kind]}
                    value={groupedSummary[kind].count}
                    hint={formatBytes(groupedSummary[kind].bytes)}
                    valueClassName="text-lg"
                  />
                ))}
              </div>

              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="搜索缓存键"
                      className={`${APPLE_ADMIN_CONTROL} pl-9`}
                    />
                  </div>
                  <select
                    value={kindFilter}
                    onChange={(event) =>
                      setKindFilter(event.target.value as "all" | BrowserTtsCacheEntry["kind"])
                    }
                    className={APPLE_ADMIN_SELECT}
                  >
                    <option value="all">全部类型</option>
                    <option value="sentence">句子</option>
                    <option value="block">段落</option>
                    <option value="chunk">表达</option>
                    <option value="scene">完整场景</option>
                    <option value="unknown">未知</option>
                  </select>
                </div>

                <AdminActionBar className="rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)]">
                  <AdminActionBarHint>已选 {selectedEntryCount} 条，可按类型筛选后定向清理。</AdminActionBarHint>
                  <AdminActionBarActions>
                    <AdminActionButton
                      type="button"
                      onClick={() => void refreshCacheState()}
                      disabled={loading || clearing}
                    >
                      <RefreshCw className="size-3.5" />
                      刷新
                    </AdminActionButton>
                    <AdminActionButton
                      type="button"
                      tone="danger"
                      onClick={() => void handleClearKeys(selectedKeys, "选中的缓存项")}
                      disabled={loading || clearing || selectedEntryCount === 0}
                    >
                      <Trash2 className="size-3.5" />
                      清选中
                    </AdminActionButton>
                    <AdminActionButton
                      type="button"
                      tone="danger"
                      onClick={() => void handleClearAll()}
                      disabled={loading || clearing || summary.entryCount === 0}
                    >
                      <Trash2 className="size-3.5" />
                      清全部
                    </AdminActionButton>
                  </AdminActionBarActions>
                </AdminActionBar>
              </div>

              <div className="rounded-[var(--app-radius-panel)] border border-[var(--app-border-soft)] bg-background">
                <div className={`flex items-center justify-between border-b border-[var(--app-border-soft)] px-3 py-2 text-xs ${APPLE_META_TEXT}`}>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        filteredEntries.length > 0 &&
                        filteredEntries.every((entry) => selectedKeys.includes(entry.cacheKey))
                      }
                      onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
                    />
                    <span>全选当前筛选结果</span>
                  </label>
                  <span>已选 {selectedEntryCount} 条</span>
                </div>

                {loading ? (
                  <div className={`px-3 py-8 text-center ${APPLE_META_TEXT}`}>正在读取本地缓存...</div>
                ) : filteredEntries.length === 0 ? (
                  <div className="p-3">
                    <AdminEmptyState>当前没有匹配的 TTS 缓存。</AdminEmptyState>
                  </div>
                ) : (
                  <div className="max-h-[520px] overflow-auto p-3">
                    <AdminList>
                      {filteredEntries.map((entry) => (
                        <AdminListItem key={entry.cacheKey}>
                          <AdminListIcon>
                            <FileAudio className="size-5" />
                          </AdminListIcon>
                          <AdminListContent>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedKeys.includes(entry.cacheKey)}
                                onChange={(event) => toggleSelectedKey(entry.cacheKey, event.target.checked)}
                                aria-label={`选择 ${entry.cacheKey}`}
                              />
                              <AdminListTitle className="font-mono text-sm">{entry.cacheKey}</AdminListTitle>
                              <AdminListBadges>
                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                  {TTS_KIND_LABELS[entry.kind]}
                                </span>
                              </AdminListBadges>
                            </div>
                            <AdminListMeta>
                              <span className="flex items-center gap-1.5">
                                <HardDrive className="size-3.5" />
                                占用：{formatBytes(entry.size)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Database className="size-3.5" />
                                内容类型：{entry.contentType ?? "-"}
                              </span>
                            </AdminListMeta>
                          </AdminListContent>
                          <AdminListActions>
                            <AdminActionButton
                              type="button"
                              onClick={() => toggleSelectedKey(entry.cacheKey, !selectedKeys.includes(entry.cacheKey))}
                              aria-label={selectedKeys.includes(entry.cacheKey) ? "取消选择" : "选择"}
                            >
                              <CheckSquare className="size-3.5" />
                              {selectedKeys.includes(entry.cacheKey) ? "取消选择" : "选择"}
                            </AdminActionButton>
                            <AdminActionButton
                              type="button"
                              tone="danger"
                              onClick={() => void handleClearKeys([entry.cacheKey], "这条缓存")}
                              disabled={clearing}
                              aria-label="清理这条缓存"
                            >
                              <Trash2 className="size-3.5" />
                              清理
                            </AdminActionButton>
                          </AdminListActions>
                        </AdminListItem>
                      ))}
                    </AdminList>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
