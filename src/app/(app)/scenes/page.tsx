"use client";

import { useMemo, useState } from "react";
import { GenerateSceneSheet } from "@/components/scenes/generate-scene-sheet";
import { LoadingState } from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import {
  APPLE_BANNER_DANGER,
  APPLE_BANNER_INFO,
  APPLE_BANNER_SUCCESS,
} from "@/lib/ui/apple-style";
import { SceneEmptyState } from "./scene-empty-state";
import { SceneFilterBar } from "./scene-filter-bar";
import { SceneListCard } from "./scene-list-card";
import {
  filterScenes,
  getPrimarySceneAction,
  hasActiveFilters,
  SceneFilters,
  SceneSortOption,
  sortScenes,
  sortScenesByRecent,
} from "./scene-display";
import { SceneDeleteDialog } from "./scene-delete-dialog";
import { SceneImportDialog } from "./scene-import-dialog";
import { ScenesBottomActionBar } from "./scenes-bottom-action-bar";
import { useSceneRandomReviewPlayback } from "./use-scene-random-review-playback";
import { useSceneSwipeActions } from "./use-scene-swipe-actions";
import { useScenesPageData } from "./use-scenes-page-data";

const initialFilters: SceneFilters = {
  category: "all",
  level: "all",
  source: "all",
  search: "",
};

export default function ScenesPage() {
  const [filters, setFilters] = useState<SceneFilters>(initialFilters);
  const [sort, setSort] = useState<SceneSortOption>("recommended");
  const {
    dialogOpen,
    setDialogOpen,
    generateSheetOpen,
    setGenerateSheetOpen,
    input,
    setInput,
    error,
    loading,
    allScenes,
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
  } = useScenesPageData();
  const {
    openSwipeSceneId,
    swipeOffsetMap,
    closeOpenedSwipe,
    closeSwipe,
    getRowGestureHandlers,
  } = useSceneSwipeActions();
  const {
    eligibleScenes,
    isRandomReviewActive,
    reviewPackPrepareStatus,
    toggleRandomReview,
  } = useSceneRandomReviewPlayback(allScenes);

  const activeScene = useMemo(
    () =>
      sortScenesByRecent(
        allScenes.filter(
          (scene) =>
            scene.learningStatus === "in_progress" ||
            scene.learningStatus === "paused" ||
            (scene.progressPercent > 0 && scene.progressPercent < 100),
        ),
      )[0] ?? null,
    [allScenes],
  );
  const primaryAction = useMemo(() => getPrimarySceneAction(allScenes), [allScenes]);
  const sortedScenes = useMemo(() => sortScenes(allScenes, sort), [allScenes, sort]);
  const filteredScenes = useMemo(
    () =>
      filterScenes(sortedScenes, filters).filter((scene) => {
        if (!activeScene) return true;
        return scene.id !== activeScene.id;
      }),
    [activeScene, filters, sortedScenes],
  );
  const hasFilters = hasActiveFilters(filters);
  const showInitialLoading = loading && allScenes.length === 0;
  const randomReviewTitle =
    eligibleScenes.length === 0
      ? "完成 60% 以上的场景后可循环播放"
      : isRandomReviewActive
        ? `循环播放中：${eligibleScenes.length} 个场景`
        : reviewPackPrepareStatus === "preparing"
          ? "循环播放音频准备中"
          : reviewPackPrepareStatus === "ready"
            ? `已准备好，可后台循环 ${eligibleScenes.length} 个场景`
            : reviewPackPrepareStatus === "skipped"
              ? "点击后准备音频"
              : reviewPackPrepareStatus === "failed"
                ? "准备失败，点击仍可播放"
                : `可循环 ${eligibleScenes.length} 个场景`;

  const handleOpenScene = (sceneSlug: string, href = `/scene/${sceneSlug}`) => {
    void openSceneRoute(href, sceneSlug);
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setSort("recommended");
  };

  return (
    <div className="relative pb-[8rem] font-sans">
      <main onScroll={() => closeOpenedSwipe()}>
        {topTask ? (
          <div className="px-6">
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
          </div>
        ) : null}

        <section className="sticky top-0 z-20 border-b border-slate-100 bg-[var(--app-page-background)] py-4 backdrop-blur-md">
          <SceneFilterBar
            category={filters.category}
            level={filters.level}
            source={filters.source}
            sort={sort}
            onCategoryChange={(value) => setFilters((current) => ({ ...current, category: value }))}
            onLevelChange={(value) => setFilters((current) => ({ ...current, level: value }))}
            onSourceChange={(value) => setFilters((current) => ({ ...current, source: value }))}
            onSortChange={setSort}
            onOpenGenerate={() => setGenerateSheetOpen(true)}
            onOpenImport={() => setDialogOpen(true)}
          />
        </section>

        {activeScene ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">继续学习</span>
            </div>
            <SceneListCard
              scene={activeScene}
              isOpening={openingSceneTarget?.startsWith(`/scene/${activeScene.slug}`) ?? false}
              isImported={activeScene.sourceType === "imported"}
              removing={removingSceneId === activeScene.id}
              swipeOffset={swipeOffsetMap[activeScene.id] ?? 0}
              swipeOpen={openSwipeSceneId === activeScene.id}
              openingLocked={Boolean(openingSceneTarget || deletingSceneId)}
              gestureHandlers={getRowGestureHandlers({
                sceneId: activeScene.id,
                swipeEnabled: activeScene.sourceType === "imported" && !openingSceneTarget && !deletingSceneId,
                swipeOffset: swipeOffsetMap[activeScene.id] ?? 0,
                onWarmup: () => warmSceneEntry(`/scene/${activeScene.slug}`, activeScene.slug),
              })}
              featured
              onOpen={() => {
                if (openSwipeSceneId === activeScene.id) {
                  closeSwipe(activeScene.id);
                  return;
                }
                handleOpenScene(activeScene.slug);
              }}
              onWarm={() => warmSceneEntry(`/scene/${activeScene.slug}`, activeScene.slug)}
              onDelete={() => setPendingDeleteSceneId(activeScene.id)}
            />
          </section>
        ) : null}

        <section className="space-y-4 pb-[calc(100px+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between pt-4">
            <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">
              {hasFilters ? "筛选结果" : "为你推荐"}
            </span>
            {hasFilters ? (
              <Button
                type="button"
                variant="secondary"
                radius="pill"
                className="h-9 rounded-full border border-slate-100 bg-white px-3 text-xs font-bold text-slate-500 hover:bg-white"
                onClick={handleClearFilters}
              >
                清除筛选
              </Button>
            ) : null}
          </div>

          {showInitialLoading ? (
            <div className="px-6">
              <LoadingState text="场景加载中..." className="py-10" />
            </div>
          ) : allScenes.length === 0 ? (
            <div className="px-6">
              <SceneEmptyState
                title="还没有可学习的场景"
                description="可以从筛选区的更多操作生成或导入一个新场景。"
              />
            </div>
          ) : filteredScenes.length === 0 ? (
            <div className="px-6">
              <SceneEmptyState
                title="没有符合条件的场景"
                description="换一个分类、等级或来源试试，或者清除筛选回到推荐列表。"
                actionLabel="清除筛选"
                onAction={handleClearFilters}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredScenes.map((scene) => {
                const swipeOffset = swipeOffsetMap[scene.id] ?? 0;
                const swipeOpen = openSwipeSceneId === scene.id;
                return (
                  <SceneListCard
                    key={scene.id}
                    scene={scene}
                    isOpening={openingSceneTarget?.startsWith(`/scene/${scene.slug}`) ?? false}
                    isImported={scene.sourceType === "imported"}
                    removing={removingSceneId === scene.id}
                    swipeOffset={swipeOffset}
                    swipeOpen={swipeOpen}
                    openingLocked={Boolean(openingSceneTarget || deletingSceneId)}
                    gestureHandlers={getRowGestureHandlers({
                      sceneId: scene.id,
                      swipeEnabled: scene.sourceType === "imported" && !openingSceneTarget && !deletingSceneId,
                      swipeOffset,
                      onWarmup: () => warmSceneEntry(`/scene/${scene.slug}`, scene.slug),
                    })}
                    featured={false}
                    onOpen={() => {
                      if (swipeOpen) {
                        closeSwipe(scene.id);
                        return;
                      }
                      handleOpenScene(scene.slug);
                    }}
                    onWarm={() => warmSceneEntry(`/scene/${scene.slug}`, scene.slug)}
                    onDelete={() => setPendingDeleteSceneId(scene.id)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      {allScenes.length > 0 ? (
        <ScenesBottomActionBar
          primaryAction={primaryAction}
          onPrimaryAction={() => {
            if (!primaryAction.scene) return;
            handleOpenScene(primaryAction.scene.slug, primaryAction.href);
          }}
          onSecondaryAction={toggleRandomReview}
          secondaryDisabled={!isRandomReviewActive && eligibleScenes.length === 0}
          secondaryLabel="复习"
          secondaryAriaLabel={
            isRandomReviewActive
              ? "停止循环播放"
              : eligibleScenes.length === 0
                ? "暂无可循环播放的场景"
                : "循环播放场景"
          }
          secondaryTitle={randomReviewTitle}
        />
      ) : null}

      <GenerateSceneSheet
        open={generateSheetOpen}
        onOpenChange={setGenerateSheetOpen}
        onGeneratingStatusChange={() => undefined}
        onGenerated={handleGenerateSuccess}
      />

      <SceneImportDialog
        open={dialogOpen}
        input={input}
        error={error}
        importing={importing}
        onClose={closeDialog}
        onInputChange={setInput}
        onSubmit={() => {
          void handleImport();
        }}
      />

      <SceneDeleteDialog
        pendingDeleteScene={pendingDeleteScene}
        deletingSceneId={deletingSceneId}
        onCancel={() => setPendingDeleteSceneId(null)}
        onConfirm={() => {
          if (!pendingDeleteScene) return;
          void handleDeleteCustomScene({
            scene: pendingDeleteScene,
            closeSwipe,
          });
        }}
      />
    </div>
  );
}
