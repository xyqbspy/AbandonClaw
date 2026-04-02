"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

const SCENE_ENTRY_WARMUP_WAIT_MS = 180;

const normalizePathname = (pathname?: string | null) => {
  if (typeof pathname !== "string") return "/";
  return pathname.replace(/\/+$/, "") || "/";
};

export type TopTaskStatus = "running" | "done" | "failed";
export type TopTask = {
  status: TopTaskStatus;
  message: string;
};

export function useScenesPageData() {
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
  const [topTask, setTopTask] = useState<TopTask | null>(null);
  const [openingSceneTarget, setOpeningSceneTarget] = useState<string | null>(null);
  const activeLoadTokenRef = useRef(0);
  const visibleSceneCountRef = useRef(initialScenes.length);
  const removingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    visibleSceneCountRef.current = allScenes.length;
  }, [allScenes.length]);

  const warmSceneEntry = useCallback((href: string, sceneSlug: string) => {
    void router.prefetch?.(href);
    return prefetchSceneDetail(sceneSlug);
  }, [router]);

  const openSceneRoute = useCallback(async (href: string, sceneSlug: string) => {
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
      // Non-blocking.
    }
    router.push(href);
  }, [openingSceneTarget, router, warmSceneEntry]);

  const refreshScenes = useCallback(async (options?: { preferCache?: boolean; forceNetwork?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    let hasCacheFallback = false;
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
          setAllScenes(cache.record.data);
          setListDataSource("cache");
          setLoading(false);
        }
      } catch {
        // Non-blocking.
      }
    }

    try {
      const nextScenes = await getScenesFromApi({ noStore: forceNetwork });
      if (!canApply()) return;
      setAllScenes(nextScenes);
      setListDataSource("network");
      setLoading(false);
      void setSceneListCache(nextScenes).catch(() => undefined);
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
      void prefetchSceneDetail(scene.slug).catch(() => undefined);
    }
  }, [allScenes, router]);

  useEffect(() => {
    const handlePullRefresh = async (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname?: string; handled?: boolean }>;
      if (normalizePathname(customEvent.detail?.pathname) !== "/scenes") return;
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
      setError(message);
      setTopTask({ status: "failed", message });
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateSuccess = async (scene: {
    slug: string;
    title: string;
    migrationInsight?: {
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

  const handleDeleteCustomScene = async ({
    scene,
    closeSwipe,
  }: {
    scene: SceneListItemResponse;
    closeSwipe: (sceneId: string) => void;
  }) => {
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

  const pendingDeleteScene = useMemo(
    () =>
      pendingDeleteSceneId
        ? allScenes.find((scene) => scene.id === pendingDeleteSceneId) ?? null
        : null,
    [allScenes, pendingDeleteSceneId],
  );

  return {
    dialogOpen,
    setDialogOpen,
    generateSheetOpen,
    setGenerateSheetOpen,
    input,
    setInput,
    error,
    loading,
    allScenes,
    listDataSource,
    setPendingDeleteSceneId,
    pendingDeleteScene,
    deletingSceneId,
    removingSceneId,
    topTask,
    openingSceneTarget,
    importing,
    warmSceneEntry,
    openSceneRoute,
    closeDialog,
    handleImport,
    handleGenerateSuccess,
    handleDeleteCustomScene,
  };
}
