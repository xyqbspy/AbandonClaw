"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { GenerateSceneSheet } from "@/components/scenes/generate-scene-sheet";
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
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_BUTTON_TEXT_SM,
  APPLE_SURFACE,
} from "@/lib/ui/apple-style";

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
const sceneTypeSummary = (scene: SceneListItemResponse) =>
  scene.sceneType === "dialogue"
    ? `双人对话 · ${scene.sentenceCount}轮`
    : `自述练习 · ${scene.sentenceCount}句`;

const placeholderExample = `A: Are we still on for dinner?
B: I was just about to text you. Something came up at work.
A: Again?
B: Yeah, I'm stuck at the office.`;
const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

export default function ScenesPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allScenes, setAllScenes] = useState<SceneListItemResponse[]>([]);
  const [listDataSource, setListDataSource] = useState<"none" | "cache" | "network">("none");
  const [confirmDeleteSceneId, setConfirmDeleteSceneId] = useState<string | null>(null);
  const [deletingSceneId, setDeletingSceneId] = useState<string | null>(null);
  const activeLoadTokenRef = useRef(0);

  const refreshScenes = async (options?: { preferCache?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    let hasCacheFallback = false;
    let cacheFresh = false;
    const preferCache = options?.preferCache ?? false;
    setLoading(true);
    if (!preferCache) {
      setListDataSource("none");
    }

    const canApply = () => activeLoadTokenRef.current === token;

    if (preferCache) {
      try {
        const cache = await getSceneListCache();
        if (canApply() && cache.found && cache.record) {
          hasCacheFallback = true;
          cacheFresh = !cache.isExpired;
          setAllScenes(cache.record.data);
          setListDataSource("cache");
          setLoading(false);
        }
      } catch {
        // Non-blocking.
      }
      if (cacheFresh) return;
    }

    try {
      const nextScenes = await getScenesFromApi();
      if (!canApply()) return;
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

  const handleGenerateSuccess = async (scene: {
    slug: string;
    title: string;
    migrationInsight?: {
      relatedChunkVariantsUsed: Array<{
        text: string;
        differenceLabel: string;
        knownChunkText?: string | null;
      }>;
      relatedChunkVariantsMatched: Array<{
        text: string;
        differenceLabel: string;
        knownChunkText?: string | null;
      }>;
    };
  }) => {
    await refreshScenes({ preferCache: false });
    toast.success("新场景已生成");
    const matchedVariants = scene.migrationInsight?.relatedChunkVariantsMatched ?? [];
    if (matchedVariants.length > 0) {
      const sample = matchedVariants[0];
      const comparison = sample.knownChunkText
        ? `你熟悉的表达：${sample.knownChunkText} -> 这次出现的变体：${sample.text}`
        : `这次出现的变体：${sample.text}`;
      toast.message(`这次场景里带入了 ${matchedVariants.length} 个相关表达变体`, {
        description: `${comparison}${sample.differenceLabel ? `（${sample.differenceLabel}）` : ""}`,
      });
    }
    router.push(`/scene/${scene.slug}`);
  };

  const handleDeleteCustomScene = async (scene: SceneListItemResponse) => {
    if (deletingSceneId) return;
    setDeletingSceneId(scene.id);
    try {
      await deleteSceneBySlugFromApi(scene.slug);
      await refreshScenes({ preferCache: false });
      toast.success("自定义场景已删除。");
      setConfirmDeleteSceneId(null);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "删除失败。");
    } finally {
      setDeletingSceneId(null);
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
              className={`scene-card-motion h-full cursor-pointer ${APPLE_SURFACE} transition-all duration-150 hover:bg-[rgb(242,242,242)]`}
              onClick={() => router.push(`/scene/${scene.slug}`)}
            >
              <CardHeader className="space-y-0.5 p-2.5 pb-1.5 sm:p-3 sm:pb-2">
                <div className="flex items-start gap-2">
                  <CardTitle className="min-w-0 flex-1 line-clamp-1 text-[15px] leading-5 sm:text-base">
                    {scene.title}
                  </CardTitle>
                  {isImported ? (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        data-scene-delete="true"
                        aria-label="删除场景"
                        className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground ${APPLE_BUTTON_BASE}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setConfirmDeleteSceneId((prev) => (prev === scene.id ? null : scene.id));
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      {confirmDeleteSceneId === scene.id ? (
                        <div
                          className="absolute right-0 top-8 z-20 w-44 rounded-2xl border-0 bg-[rgb(246,246,246)] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <p className="text-xs text-muted-foreground">删除这个场景？</p>
                          <div className="mt-1.5 flex justify-end gap-1.5">
                            <button
                              type="button"
                              className={`${APPLE_BUTTON_BASE} px-2.5 py-1 text-[11px] font-medium text-muted-foreground`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setConfirmDeleteSceneId(null);
                              }}
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              className={`${APPLE_BUTTON_DANGER} px-2.5 py-1 text-[11px] font-medium disabled:opacity-60`}
                              disabled={deletingSceneId === scene.id}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void handleDeleteCustomScene(scene);
                              }}
                            >
                              {deletingSceneId === scene.id ? "删除中..." : "删除"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">{scene.subtitle}</p>
              </CardHeader>

              <CardContent className="p-2.5 pt-0 sm:p-3 sm:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {difficultyLabel[scene.difficulty] ?? "中级"} · {scene.estimatedMinutes}分钟 ·{" "}
                    {sceneTypeSummary(scene)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {learningStatusLabel[scene.learningStatus]} · {Math.round(scene.progressPercent)}%
                  </p>
                  {scene.variantLinks.length > 0 ? (
                    <button
                      type="button"
                      data-scene-variant-view="true"
                      className={`${APPLE_BUTTON_BASE} px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        router.push(`/scene/${scene.slug}?view=variants`);
                      }}
                    >
                      查看变体
                    </button>
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
    console.debug("[scene-list-cache][debug]", {
      source: listDataSource,
      count: allScenes.length,
    });
  }, [allScenes.length, listDataSource]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          className={`h-8 cursor-pointer px-3 text-xs ${appleButtonClassName}`}
          variant="ghost"
          onClick={() => setGenerateSheetOpen(true)}
        >
          生成我的场景
        </Button>
        <Button
          type="button"
          size="sm"
          className={`h-8 cursor-pointer px-3 text-xs ${appleButtonClassName}`}
          variant="ghost"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-3" />
          导入
        </Button>
      </div>

      {renderSceneCards()}

      <GenerateSceneSheet
        open={generateSheetOpen}
        onOpenChange={setGenerateSheetOpen}
        onGenerated={handleGenerateSuccess}
      />

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/25 p-3 animate-in fade-in-0 duration-200 sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            aria-label="关闭导入弹窗"
            className="absolute inset-0"
            onClick={closeDialog}
          />
          <Card className="relative z-10 w-full max-w-2xl border-0 bg-[rgb(246,246,246)] shadow-[0_16px_40px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom-6 fade-in-0 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
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
                  className="cursor-pointer rounded-full border border-black/5 bg-[rgb(246,246,246)] hover:bg-[rgb(238,238,238)]"
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
                  variant="ghost"
                  onClick={closeDialog}
                  className={`cursor-pointer ${appleButtonClassName}`}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleImport}
                  className={`cursor-pointer ${appleButtonClassName}`}
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


