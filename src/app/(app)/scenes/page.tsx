"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, MessageSquareText, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GenerateSceneSheet } from "@/components/scenes/generate-scene-sheet";
import {
  LoadingButton,
  LoadingOverlay,
  LoadingState,
} from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSceneBySlugFromApi,
  getScenesFromApi,
  importSceneFromApi,
  SceneListItemResponse,
} from "@/lib/utils/scenes-api";
import {
  clearSceneListCache,
  getSceneListCache,
  getSceneListCacheSnapshotSync,
  setSceneListCache,
} from "@/lib/cache/scene-list-cache";
import { prefetchSceneDetail, scheduleScenePrefetch } from "@/lib/cache/scene-prefetch";
import {
  APPLE_BANNER_DANGER,
  APPLE_BANNER_INFO,
  APPLE_BANNER_SUCCESS,
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
const statusClassName: Record<SceneListItemResponse["learningStatus"], string> = {
  not_started: "text-[#86868B]",
  in_progress: "text-[#FF9500]",
  completed: "text-[#34C759]",
  paused: "text-[#FF9500]",
};

const placeholderExample = `A: Are we still on for dinner?
B: I was just about to text you. Something came up at work.
A: Again?
B: Yeah, I'm stuck at the office.`;
const ACTION_WIDTH = 96;
const OPEN_THRESHOLD = 48;
const QUICK_OPEN_THRESHOLD = 24;
const MAX_OVERSHOOT = 18;
const SCENE_ENTRY_WARMUP_WAIT_MS = 180;
const sheetPanelClassName = "rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]";
const sheetLabelClassName = "mb-3 block pl-0.5 text-[13px] font-semibold text-[#1d1d1f]";
type TopTaskStatus = "running" | "done" | "failed";
type TopTask = {
  status: TopTaskStatus;
  message: string;
};

type GestureState = {
  sceneId: string;
  startX: number;
  startY: number;
  startOffset: number;
  horizontalLocked: boolean;
  verticalCancelled: boolean;
};

export default function ScenesPage() {
  const router = useRouter();
  const initialListSnapshot = getSceneListCacheSnapshotSync();
  const initialScenes = initialListSnapshot.found && initialListSnapshot.record
    ? initialListSnapshot.record.data
    : [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(!initialListSnapshot.found);
  const [allScenes, setAllScenes] = useState<SceneListItemResponse[]>(initialScenes);
  const [listDataSource, setListDataSource] = useState<"none" | "cache" | "network">(
    initialListSnapshot.found ? "cache" : "none",
  );
  const [pendingDeleteSceneId, setPendingDeleteSceneId] = useState<string | null>(null);
  const [deletingSceneId, setDeletingSceneId] = useState<string | null>(null);
  const [removingSceneId, setRemovingSceneId] = useState<string | null>(null);
  const [openSwipeSceneId, setOpenSwipeSceneId] = useState<string | null>(null);
  const [swipeOffsetMap, setSwipeOffsetMap] = useState<Record<string, number>>({});
  const [topTask, setTopTask] = useState<TopTask | null>(null);
  const [openingSceneTarget, setOpeningSceneTarget] = useState<string | null>(null);
  const activeLoadTokenRef = useRef(0);
  const visibleSceneCountRef = useRef(initialScenes.length);
  const gestureRef = useRef<GestureState | null>(null);
  const removingTimerRef = useRef<number | null>(null);

  const warmSceneEntry = useCallback((href: string, sceneSlug: string) => {
    void router.prefetch?.(href);
    return prefetchSceneDetail(sceneSlug);
  }, [router]);

  const openSceneRoute = async (href: string, sceneSlug: string) => {
    if (openingSceneTarget === href) return;
    setOpeningSceneTarget(href);
    const warmupTask = warmSceneEntry(href, sceneSlug);
    try {
      await Promise.race([
        warmupTask,
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, SCENE_ENTRY_WARMUP_WAIT_MS);
        }),
      ]);
    } catch {
      // Non-blocking: route entry should not be blocked by warmup failure.
    }
    router.push(href);
  };

  const setCardOffset = useCallback((sceneId: string, offset: number) => {
    setSwipeOffsetMap((prev) => {
      const next = { ...prev };
      if (offset === 0) {
        delete next[sceneId];
      } else {
        next[sceneId] = offset;
      }
      return next;
    });
  }, []);

  const closeOpenedSwipe = useCallback((exceptSceneId?: string | null) => {
    setOpenSwipeSceneId((prev) => {
      if (!prev || prev === exceptSceneId) return prev ?? null;
      setCardOffset(prev, 0);
      return null;
    });
  }, [setCardOffset]);

  const openSwipe = useCallback((sceneId: string) => {
    closeOpenedSwipe(sceneId);
    setCardOffset(sceneId, -ACTION_WIDTH);
    setOpenSwipeSceneId(sceneId);
  }, [closeOpenedSwipe, setCardOffset]);

  const closeSwipe = useCallback((sceneId: string) => {
    setCardOffset(sceneId, 0);
    setOpenSwipeSceneId((prev) => (prev === sceneId ? null : prev));
  }, [setCardOffset]);

  const pendingDeleteScene =
    pendingDeleteSceneId
      ? allScenes.find((scene) => scene.id === pendingDeleteSceneId) ?? null
      : null;

  const refreshScenes = useCallback(async (options?: { preferCache?: boolean; forceNetwork?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    let hasCacheFallback = false;
    let cacheFresh = false;
    const preferCache = options?.preferCache ?? false;
    const forceNetwork = options?.forceNetwork ?? false;
    const keepVisibleContent = preferCache && visibleSceneCountRef.current > 0;
    setLoading(!keepVisibleContent);
    if (!preferCache) {
      setListDataSource("none");
    }

    const canApply = () => activeLoadTokenRef.current === token;

    if (preferCache && !forceNetwork) {
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
      if (cacheFresh) {
        return;
      }
    }

    try {
      const nextScenes = await getScenesFromApi({ noStore: forceNetwork });
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
  }, []);

  useEffect(() => {
    void refreshScenes({ preferCache: true });
  }, [refreshScenes]);

  useEffect(() => {
    if (allScenes.length === 0) return;
    const topSceneSlugs = allScenes.slice(0, 2).map((scene) => scene.slug);
    scheduleScenePrefetch(topSceneSlugs);
    for (const scene of allScenes.slice(0, 2)) {
      void router.prefetch?.(`/scene/${scene.slug}`);
      void prefetchSceneDetail(scene.slug).catch(() => {
        // Non-blocking.
      });
    }
  }, [allScenes, router]);

  useEffect(() => {
    const handlePullRefresh = async (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname?: string; handled?: boolean }>;
      if (customEvent.detail?.pathname !== "/scenes") return;
      customEvent.detail.handled = true;
      setTopTask({ status: "running", message: "正在刷新场景列表..." });
      try {
        await clearSceneListCache();
        await refreshScenes({ preferCache: false, forceNetwork: true });
        setTopTask({ status: "done", message: "场景列表已刷新。" });
      } catch (refreshError) {
        const message =
          refreshError instanceof Error ? refreshError.message : "刷新场景列表失败。";
        setTopTask({ status: "failed", message });
        toast.error(message);
      }
    };

    window.addEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    return () => {
      window.removeEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    };
  }, [refreshScenes]);

  useEffect(() => {
    if (!dialogOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [dialogOpen]);

  useEffect(() => {
    if (!topTask || topTask.status === "running") return;
    const timer = window.setTimeout(() => {
      setTopTask(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [topTask]);

  useEffect(() => {
    return () => {
      if (removingTimerRef.current) {
        window.clearTimeout(removingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("[data-swipe-row]") ||
        target?.closest("[data-delete-modal]") ||
        target?.closest("[data-import-dialog]")
      ) {
        return;
      }
      closeOpenedSwipe();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeOpenedSwipe]);

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
    setTopTask({ status: "running", message: "正在导入场景..." });

    try {
      await importSceneFromApi({ sourceText });
      setInput("");
      closeDialog();
      await clearSceneListCache();
      await refreshScenes({ preferCache: false, forceNetwork: true });
      setTopTask({ status: "done", message: "导入完成，场景列表已刷新。" });
      toast.success("场景导入成功。");
    } catch (importError) {
      const message =
        importError instanceof Error ? importError.message : "导入失败，请重试。";
      setError(
        message,
      );
      setTopTask({ status: "failed", message });
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
    setTopTask({ status: "running", message: "正在生成场景..." });
    await clearSceneListCache();
    await refreshScenes({ preferCache: false, forceNetwork: true });
    setTopTask({ status: "done", message: `已生成：${scene.title}` });
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
  };

  const handleDeleteCustomScene = async (scene: SceneListItemResponse) => {
    if (deletingSceneId) return;
    setDeletingSceneId(scene.id);
    try {
      await deleteSceneBySlugFromApi(scene.slug);
      setRemovingSceneId(scene.id);
      closeSwipe(scene.id);
      setPendingDeleteSceneId(null);
      await clearSceneListCache();
      await new Promise<void>((resolve) => {
        removingTimerRef.current = window.setTimeout(() => {
          setAllScenes((prev) => prev.filter((item) => item.id !== scene.id));
          setRemovingSceneId(null);
          removingTimerRef.current = null;
          resolve();
        }, 240);
      });
      void refreshScenes({ preferCache: false, forceNetwork: true });
      toast.success("自定义场景已删除。");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "删除失败。");
    } finally {
      setDeletingSceneId(null);
    }
  };

  const renderSceneCards = () => {
    if (loading) {
      return <LoadingState text="场景加载中..." className="py-10" />;
    }
    if (allScenes.length === 0) {
      return (
        <div className="rounded-[20px] bg-white px-5 py-10 text-center text-[13px] text-[#86868B] shadow-[0_8px_24px_rgba(149,157,165,0.08)]">
          暂无场景。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {allScenes.map((scene) => {
          const isImported = scene.sourceType === "imported";
          const isOpeningScene = openingSceneTarget?.startsWith(`/scene/${scene.slug}`) ?? false;
          const swipeOffset = swipeOffsetMap[scene.id] ?? 0;
          const swipeOpen = openSwipeSceneId === scene.id;
          const swipeEnabled = isImported && !openingSceneTarget && !deletingSceneId;
          return (
            <div
              key={scene.id}
              data-swipe-row="true"
              className={`relative mb-4 overflow-hidden rounded-[24px] transition-[max-height,margin,opacity] duration-250 ease-out ${
                removingSceneId === scene.id ? "max-h-0 opacity-0 mb-0" : "max-h-[180px]"
              }`}
            >
              {isImported ? (
                <div className="absolute inset-y-0 right-0 z-0 flex w-24 items-stretch justify-stretch">
                  <button
                    type="button"
                    data-scene-delete="true"
                    aria-label="删除"
                    className="flex h-full w-full items-center justify-center bg-linear-to-b from-[#ff5d55] to-[#FF3B30] text-[15px] font-bold tracking-[-0.01em] text-white"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPendingDeleteSceneId(scene.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              ) : null}

              <article
                className={`relative z-10 flex cursor-pointer justify-between gap-[14px] rounded-[24px] bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] will-change-transform transition-[transform,box-shadow,opacity] duration-[280ms] ${
                  swipeOpen ? "shadow-[0_14px_34px_rgba(15,23,42,0.12)]" : ""
                } ${
                  removingSceneId === scene.id ? "scale-[0.96] opacity-0" : ""
                } ${
                  openingSceneTarget ? "pointer-events-none" : ""
                }`}
                style={{
                  transform: `translate3d(${swipeOffset}px,0,0)`,
                  transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                  touchAction: "pan-y",
                }}
                onPointerDown={(event) => {
                  warmSceneEntry(`/scene/${scene.slug}`, scene.slug);
                  if (!swipeEnabled) return;
                  if (event.pointerType === "mouse" && event.button !== 0) return;
                  gestureRef.current = {
                    sceneId: scene.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    startOffset: swipeOffset,
                    horizontalLocked: false,
                    verticalCancelled: false,
                  };
                  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const gesture = gestureRef.current;
                  if (!gesture || gesture.sceneId !== scene.id || !swipeEnabled) return;

                  const dx = event.clientX - gesture.startX;
                  const dy = event.clientY - gesture.startY;

                  if (!gesture.horizontalLocked && !gesture.verticalCancelled) {
                    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
                      gesture.horizontalLocked = true;
                    } else if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) {
                      gesture.verticalCancelled = true;
                    }
                  }

                  if (gesture.verticalCancelled || !gesture.horizontalLocked) return;

                  let nextX = gesture.startOffset + dx;

                  if (nextX > 0) {
                    nextX = Math.min(nextX * 0.28, MAX_OVERSHOOT);
                  }
                  if (nextX < -ACTION_WIDTH) {
                    const extra = nextX + ACTION_WIDTH;
                    nextX = -ACTION_WIDTH + extra * 0.28;
                    nextX = Math.max(nextX, -ACTION_WIDTH - MAX_OVERSHOOT);
                  }

                  closeOpenedSwipe(scene.id);
                  setCardOffset(scene.id, nextX);
                }}
                onPointerUp={() => {
                  const gesture = gestureRef.current;
                  if (!gesture || gesture.sceneId !== scene.id || !swipeEnabled) return;
                  gestureRef.current = null;
                  if (gesture.verticalCancelled) return;
                  const currentX = swipeOffsetMap[scene.id] ?? swipeOffset;
                  const absX = Math.abs(currentX);
                  if (
                    currentX <= -OPEN_THRESHOLD ||
                    (gesture.startOffset === -ACTION_WIDTH && absX > QUICK_OPEN_THRESHOLD)
                  ) {
                    openSwipe(scene.id);
                  } else {
                    closeSwipe(scene.id);
                  }
                }}
                onPointerCancel={() => {
                  const gesture = gestureRef.current;
                  if (!gesture || gesture.sceneId !== scene.id || !swipeEnabled) return;
                  gestureRef.current = null;
                  closeSwipe(scene.id);
                }}
                onClick={(event) => {
                  if (swipeOpen) {
                    event.preventDefault();
                    event.stopPropagation();
                    closeSwipe(scene.id);
                    return;
                  }
                  void openSceneRoute(`/scene/${scene.slug}`, scene.slug);
                }}
                onPointerEnter={() => {
                  warmSceneEntry(`/scene/${scene.slug}`, scene.slug);
                }}
                onFocus={() => {
                  warmSceneEntry(`/scene/${scene.slug}`, scene.slug);
                }}
              >
                <LoadingOverlay
                  loading={isOpeningScene}
                  loadingText="进入场景中..."
                />
                <div className="min-w-0 flex-1">
                  <div className="scene-title mb-[6px] text-[16px] leading-[1.35] font-extrabold tracking-[-0.025em] text-[#1D1D1F]">
                    {scene.title}
                  </div>
                  <div className="mb-4 text-[13px] leading-[1.4] text-[#86868B]">
                    {scene.subtitle}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-[10px] gap-y-2">
                    <span className="inline-flex h-6 items-center rounded-full bg-[#F2F2F7] px-[10px] text-[11px] font-bold whitespace-nowrap text-[#636366]">
                      {difficultyLabel[scene.difficulty] ?? "Intermediate"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap text-[#6E6E73]">
                      <Clock3 className="size-[13px]" />
                      {scene.estimatedMinutes} 分钟
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap text-[#6E6E73]">
                      <MessageSquareText className="size-[13px]" />
                      {scene.sentenceCount} {scene.sentenceCount === 1 ? "句" : "句"}
                    </span>
                    {scene.variantLinks.length > 0 ? (
                      <button
                        type="button"
                        data-scene-variant-view="true"
                        className="inline-flex h-6 items-center rounded-full bg-[#F2F2F7] px-[10px] text-[11px] font-bold whitespace-nowrap text-[#636366] transition-colors hover:bg-[#EAEAF0] hover:text-[#1D1D1F]"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          warmSceneEntry(`/scene/${scene.slug}?view=variants`, scene.slug);
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void openSceneRoute(`/scene/${scene.slug}?view=variants`, scene.slug);
                        }}
                        onPointerEnter={() => {
                          warmSceneEntry(`/scene/${scene.slug}?view=variants`, scene.slug);
                        }}
                        onFocus={() => {
                          warmSceneEntry(`/scene/${scene.slug}?view=variants`, scene.slug);
                        }}
                      >
                        查看变体
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="min-w-[72px] shrink-0 pt-0.5 text-right">
                  <div className={`mb-2 text-[12px] font-extrabold tracking-[-0.01em] ${statusClassName[scene.learningStatus]}`}>
                    {learningStatusLabel[scene.learningStatus]}
                  </div>
                  <div className="text-[28px] leading-none font-extrabold tracking-[-0.04em] text-[#1D1D1F]">
                    {Math.round(scene.progressPercent)}%
                  </div>
                </div>
              </article>
            </div>
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
      <div className="grid grid-cols-2 gap-3 pb-4">
        <Button
          type="button"
          radius="lg"
          className="h-11 gap-1.5 text-[14px]"
          onClick={() => setGenerateSheetOpen(true)}
        >
          <Sparkles className="size-4" />
          生成场景
        </Button>
        <Button
          type="button"
          variant="secondary"
          radius="lg"
          className="h-11 gap-1.5 text-[14px]"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-4" />
          导入自定义
        </Button>
      </div>

      {topTask ? (
        <div
          className={`text-sm ${
            topTask.status === "running"
              ? APPLE_BANNER_INFO
              : topTask.status === "done"
                ? APPLE_BANNER_SUCCESS
                : APPLE_BANNER_DANGER
          }`}
        >
          {topTask.message}
        </div>
      ) : null}

      <div onScroll={() => closeOpenedSwipe()}>{renderSceneCards()}</div>

      <GenerateSceneSheet
        open={generateSheetOpen}
        onOpenChange={setGenerateSheetOpen}
        onGeneratingStatusChange={(payload) => {
          if (payload.status === "running") {
            setTopTask({ status: "running", message: payload.message ?? "正在生成场景..." });
            return;
          }
          setTopTask({ status: "failed", message: payload.message ?? "生成失败，请稍后重试。" });
        }}
        onGenerated={handleGenerateSuccess}
      />

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[10px] animate-in fade-in-0 duration-200">
          <button
            type="button"
            aria-label="关闭导入弹窗"
            className="absolute inset-0"
            onClick={closeDialog}
          />
          <div className="absolute inset-x-0 bottom-0 z-10 animate-in slide-in-from-bottom-6 fade-in-0 duration-300 sm:inset-auto sm:bottom-6 sm:left-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:zoom-in-95 sm:rounded-[24px]">
            <div
              data-import-dialog="true"
              className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-[#F2F2F7] sm:rounded-[24px]"
            >
              <div className="mx-auto my-[10px] h-[5px] w-9 rounded-[3px] bg-[#C7C7CC]" />

              <div className="px-5 pb-4">
                <h2 className="mb-1 text-[20px] font-bold text-[#1d1d1f]">导入自定义场景</h2>
                <p className="text-[14px] text-[#86868B]">
                  粘贴英文对话内容，系统会自动解析成当前场景结构。
                </p>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-5">
                <div className={sheetPanelClassName}>
                  <label htmlFor="scene-import-input" className={sheetLabelClassName}>
                    场景文本
                  </label>
                  <Textarea
                    id="scene-import-input"
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      if (error) setError("");
                    }}
                    placeholder={placeholderExample}
                    className="min-h-44 border-0 bg-transparent px-0 py-0 text-[15px] leading-[1.5] text-[#1d1d1f] shadow-none focus-visible:ring-0"
                    disabled={importing}
                  />
                  <p className="mt-2.5 text-[12px] leading-[1.4] text-[#86868B]">
                    建议按对话格式粘贴，例如每行一条，包含说话人和内容。
                  </p>
                </div>

                {error ? (
                  <div className="rounded-[14px] bg-[#fff1f0] px-4 py-3 text-sm text-[#d93025]">
                    {error}
                  </div>
                ) : null}
              </div>

              <div className="bg-[#F2F2F7] px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    radius="lg"
                    className="h-[50px] text-[16px]"
                    onClick={closeDialog}
                    disabled={importing}
                  >
                    取消
                  </Button>
                  <LoadingButton
                    type="button"
                    variant="default"
                    radius="lg"
                    className="h-[50px] w-full text-[16px]"
                    onClick={handleImport}
                    loading={importing}
                    loadingText="导入中..."
                  >
                    导入场景
                  </LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        data-delete-modal="true"
        className={`fixed inset-0 z-30 flex items-center justify-center bg-black/20 px-6 backdrop-blur-[10px] transition-opacity duration-200 ${
          pendingDeleteScene ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setPendingDeleteSceneId(null);
          }
        }}
      >
        <div className={`w-full max-w-[300px] overflow-hidden rounded-[22px] bg-[rgba(255,255,255,0.88)] shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-[24px] transition-transform duration-200 ${
          pendingDeleteScene ? "translate-y-0 scale-100" : "translate-y-[10px] scale-[0.96]"
        }`}>
          <div className="px-5 pb-[18px] pt-[22px] text-center">
            <div className="mb-2 text-[18px] font-extrabold tracking-[-0.02em] text-[#1D1D1F]">
              删除场景？
            </div>
            <div className="text-[13px] leading-[1.45] text-[#86868B]">
              这个场景会从列表中移除，删除后无法恢复。
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-[rgba(60,60,67,0.12)] bg-[rgba(255,255,255,0.6)]">
            <button
              type="button"
              className="h-[50px] cursor-pointer bg-transparent text-[16px] font-bold text-[#007AFF]"
              onClick={() => setPendingDeleteSceneId(null)}
            >
              取消
            </button>
            <button
              type="button"
              className="h-[50px] cursor-pointer border-l border-[rgba(60,60,67,0.12)] bg-transparent text-[16px] font-bold text-[#FF3B30] disabled:opacity-60"
              disabled={!pendingDeleteScene || deletingSceneId === pendingDeleteScene.id}
              onClick={() => {
                if (!pendingDeleteScene) return;
                void handleDeleteCustomScene(pendingDeleteScene);
              }}
            >
              {deletingSceneId === pendingDeleteScene?.id ? "删除中..." : "删除"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}






