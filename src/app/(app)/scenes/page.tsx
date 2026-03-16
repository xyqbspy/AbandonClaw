"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSceneBySlugFromApi,
  getScenesFromApi,
  importSceneFromApi,
  SceneListItemResponse,
} from "@/lib/utils/scenes-api";
import { getSceneListCache, setSceneListCache } from "@/lib/cache/scene-list-cache";

const difficultyLabel: Record<string, string> = {
  Beginner: "初级",
  Intermediate: "中级",
  Advanced: "高级",
};

const learningStatusLabel: Record<SceneListItemResponse["learningStatus"], string> = {
  not_started: "未开始",
  in_progress: "学习中",
  completed: "已完成",
  paused: "已暂停",
};

const placeholderExample = `A: Are we still on for dinner?
B: I was just about to text you. Something came up at work.
A: Again?
B: Yeah, I'm stuck at the office.`;

export default function ScenesPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allScenes, setAllScenes] = useState<SceneListItemResponse[]>([]);
  const [listDataSource, setListDataSource] = useState<"none" | "cache" | "network">("none");
  const activeLoadTokenRef = useRef(0);

  const refreshScenes = async (options?: { preferCache?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    let networkApplied = false;
    let hasCacheFallback = false;
    const preferCache = options?.preferCache ?? false;
    setLoading(true);
    if (!preferCache) {
      setListDataSource("none");
    }

    const canApply = () => activeLoadTokenRef.current === token;
    const networkPromise = getScenesFromApi();

    const cacheTask = (async () => {
      if (!preferCache) return;
      try {
        const cache = await getSceneListCache();
        if (!canApply() || networkApplied) return;
        if (cache.found && cache.record) {
          hasCacheFallback = true;
          setAllScenes(cache.record.data);
          setListDataSource("cache");
          setLoading(false);
        }
      } catch {
        // Non-blocking.
      }
    })();

    const networkTask = (async () => {
      try {
        const nextScenes = await networkPromise;
        if (!canApply()) return;
        networkApplied = true;
        setAllScenes(nextScenes);
        setListDataSource("network");
        setLoading(false);
        void setSceneListCache(nextScenes).catch(() => {
          // Non-blocking.
        });
      } catch (fetchError) {
        if (!canApply()) return;
        if (!hasCacheFallback) {
          toast.error(fetchError instanceof Error ? fetchError.message : "加载场景失败。");
          setLoading(false);
        }
      }
    })();

    await Promise.allSettled([cacheTask, networkTask]);
  };

  useEffect(() => {
    void refreshScenes({ preferCache: true });
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [dialogOpen]);

  const closeDialog = () => {
    setDialogOpen(false);
    setError("");
  };

  const handleImport = async () => {
    const sourceText = input.trim();
    if (!sourceText) {
      setError("请先粘贴英文场景文本。");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const importedScene = await importSceneFromApi({ sourceText });
      setInput("");
      closeDialog();
      await refreshScenes({ preferCache: false });
      toast.success("场景导入成功。");
      router.push(`/scene/${importedScene.slug}`);
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "导入失败，请重试。",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteCustomScene = async (scene: SceneListItemResponse) => {
    const confirmed = window.confirm(`确认删除“${scene.title}”？`);
    if (!confirmed) return;
    try {
      await deleteSceneBySlugFromApi(scene.slug);
      await refreshScenes({ preferCache: false });
      toast.success("自定义场景已删除。");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "删除失败。");
    }
  };

  const renderSceneCards = () => {
    if (loading) return <p className="text-sm text-muted-foreground">场景加载中...</p>;
    if (allScenes.length === 0) return <p className="text-sm text-muted-foreground">暂无场景。</p>;

    return (
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {allScenes.map((scene) => {
          const isImported = scene.sourceType === "imported";
          return (
            <Card
              key={scene.id}
              className="scene-card-motion h-full cursor-pointer border-border/70 transition-all duration-150 hover:border-primary/40 hover:shadow-sm"
              onClick={() => router.push(`/scene/${scene.slug}`)}
            >
              <CardHeader className="space-y-0.5 p-2.5 pb-1.5 sm:p-3 sm:pb-2">
                <div className="flex items-start gap-2">
                  <CardTitle className="min-w-0 flex-1 line-clamp-1 text-[15px] leading-5 sm:text-base">
                    {scene.title}
                  </CardTitle>
                  {isImported ? (
                    <button
                      type="button"
                      data-scene-delete="true"
                      aria-label="删除场景"
                      className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleDeleteCustomScene(scene);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">{scene.subtitle}</p>
              </CardHeader>

              <CardContent className="p-2.5 pt-0 sm:p-3 sm:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {difficultyLabel[scene.difficulty] ?? "中级"} - {scene.sentenceCount} 句 -{" "}
                    {scene.estimatedMinutes} 分钟
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {learningStatusLabel[scene.learningStatus]} - {Math.round(scene.progressPercent)}%
                  </p>
                  {scene.variantLinks.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {scene.variantLinks.slice(0, 3).map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          data-scene-variant-view="true"
                          className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            router.push(`/scene/${scene.slug}?view=variants`);
                          }}
                        >
                          {variant.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.debug("[scene-list-cache][debug]", {
      source: listDataSource,
      count: allScenes.length,
    });
  }, [allScenes.length, listDataSource]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="场景学习"
        title="选择真实对话场景"
        description="先在语境中阅读，再进入变体与练习。"
      />

      <Card className="border-border/70 bg-card">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 space-y-0">
              <p className="text-sm font-semibold leading-5">导入自定义场景</p>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                粘贴英文对话并解析为可学习格式。
              </p>
              <p className="text-[11px] text-muted-foreground/90">来源：用户导入文本</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 cursor-pointer shrink-0 px-2 text-[11px]"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-3" />
              导入
            </Button>
          </div>
        </CardContent>
      </Card>

      {renderSceneCards()}

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/25 p-3 animate-in fade-in-0 duration-200 sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            aria-label="关闭导入弹窗"
            className="absolute inset-0"
            onClick={closeDialog}
          />
          <Card className="relative z-10 w-full max-w-2xl border-border/80 animate-in slide-in-from-bottom-6 fade-in-0 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">导入自定义英文场景</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    系统会将文本解析为当前场景数据结构。
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  aria-label="关闭"
                  onClick={closeDialog}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (error) setError("");
                }}
                placeholder={placeholderExample}
                className="min-h-44 text-sm leading-6"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  className="cursor-pointer"
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleImport}
                  className="cursor-pointer"
                  disabled={importing}
                >
                  {importing ? "导入中..." : "导入"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
