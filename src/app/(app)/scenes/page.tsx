"use client";

import { useEffect } from "react";
import { Clock3, MessageSquareText, Plus, Sparkles } from "lucide-react";
import { GenerateSceneSheet } from "@/components/scenes/generate-scene-sheet";
import {
  LoadingOverlay,
  LoadingState,
} from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import { SCENE_STATUS_TEXT_CLASSNAME } from "@/features/scene/scene-status-theme";
import {
  APPLE_BANNER_DANGER,
  APPLE_BANNER_INFO,
  APPLE_BANNER_SUCCESS,
  APPLE_BUTTON_TEXT_MD,
  APPLE_CARD_INTERACTIVE,
  APPLE_META_TEXT,
} from "@/lib/ui/apple-style";
import { SceneDeleteDialog } from "./scene-delete-dialog";
import { SceneImportDialog } from "./scene-import-dialog";
import { useSceneSwipeActions } from "./use-scene-swipe-actions";
import { useScenesPageData } from "./use-scenes-page-data";

const difficultyLabel: Record<string, string> = {
  Beginner: "初级",
  Intermediate: "中级",
  Advanced: "高级",
};

const learningStatusLabel = {
  not_started: "未开始",
  in_progress: "学习中",
  completed: "已完成",
  paused: "已暂停",
} as const;

const sceneActionButtonClassName = `h-[var(--mobile-adapt-button-height)] gap-[var(--mobile-adapt-space-sm)] text-[length:var(--mobile-adapt-font-body-sm)] ${APPLE_BUTTON_TEXT_MD}`;
const sceneSecondaryActionButtonClassName =
  `${sceneActionButtonClassName} bg-[var(--app-button-secondary-bg)] text-[var(--app-button-secondary-text)] border-[var(--app-button-secondary-border)]`;
const sceneCardClassName =
  `${APPLE_CARD_INTERACTIVE} relative z-10 flex cursor-pointer justify-between gap-[var(--mobile-adapt-space-md)] rounded-[var(--app-radius-card)] bg-[var(--app-scene-card-bg)] p-[var(--mobile-adapt-space-sheet)] will-change-transform transition-[transform,box-shadow,opacity] duration-[280ms]`;
const sceneMetaPillClassName =
  "inline-flex min-h-[clamp(24px,6vw,28px)] items-center rounded-full bg-[var(--app-scene-card-meta-bg)] px-[var(--mobile-adapt-space-md)] text-[length:var(--mobile-adapt-font-caption)] font-bold whitespace-nowrap text-[var(--app-scene-card-meta-text)]";
const sceneMetaTextClassName =
  `inline-flex items-center gap-[var(--mobile-adapt-space-2xs)] text-[length:var(--mobile-adapt-font-caption)] font-bold whitespace-nowrap ${APPLE_META_TEXT}`;
const sceneTitleClassName =
  "mb-[var(--mobile-adapt-space-2xs)] text-[length:clamp(0.98rem,4.4vw,1.05rem)] leading-[1.35] font-extrabold tracking-[-0.025em] text-[#1D1D1F]";
const sceneSubtitleClassName =
  "mb-[var(--mobile-adapt-space-lg)] text-[length:var(--mobile-adapt-font-body-sm)] leading-[1.45] text-[var(--app-scene-card-subtitle)]";
const sceneStatusClassName =
  "mb-[var(--mobile-adapt-space-2xs)] text-[length:var(--mobile-adapt-font-meta)] font-extrabold tracking-[-0.01em]";
const sceneProgressClassName =
  "text-[length:clamp(1.5rem,7vw,1.75rem)] leading-none font-extrabold tracking-[-0.04em] text-[var(--app-scene-card-progress)]";

export default function ScenesPage() {
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
  } = useScenesPageData();
  const {
    openSwipeSceneId,
    swipeOffsetMap,
    closeOpenedSwipe,
    closeSwipe,
    getRowGestureHandlers,
  } = useSceneSwipeActions();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[scene-list-cache][debug]", {
      source: listDataSource,
      count: allScenes.length,
    });
  }, [allScenes.length, listDataSource]);

  const renderSceneCards = () => {
    if (loading) {
      return <LoadingState text="场景加载中..." className="py-10" />;
    }
    if (allScenes.length === 0) {
      return (
        <div className="rounded-[var(--app-radius-card)] px-[var(--mobile-adapt-space-sheet)] py-[calc(var(--mobile-adapt-space-xl)+var(--mobile-adapt-space-lg))] text-center text-[length:var(--mobile-adapt-font-body-sm)] text-[var(--muted-foreground)] shadow-[var(--app-shadow-raised)]">
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
          const gestureHandlers = getRowGestureHandlers({
            sceneId: scene.id,
            swipeEnabled,
            swipeOffset,
            onWarmup: () => warmSceneEntry(`/scene/${scene.slug}`, scene.slug),
          });

          return (
            <div
              key={scene.id}
              data-swipe-row="true"
              className={`relative mb-4 overflow-hidden rounded-[24px] bg-[var(--app-scene-card-bg)] transition-[max-height,margin,opacity] duration-250 ease-out ${removingSceneId === scene.id ? "mb-0 max-h-0 opacity-0" : "max-h-[180px]"}`}
            >
              {isImported ? (
                <div className="absolute inset-y-0 right-0 z-0 flex w-24 items-stretch justify-stretch">
                  <button
                    type="button"
                    data-scene-delete="true"
                    aria-label="删除"
                    className="flex h-full w-full items-center justify-center bg-linear-to-b from-[var(--app-scene-delete-start)] to-[var(--app-scene-delete-end)] text-[15px] font-bold tracking-[-0.01em] text-white"
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
                className={`${sceneCardClassName} ${swipeOpen ? "shadow-[0_14px_34px_rgba(15,23,42,0.12)]" : ""} ${removingSceneId === scene.id ? "scale-[0.96] opacity-0" : ""} ${openingSceneTarget ? "pointer-events-none" : ""}`}
                style={{
                  transform: `translate3d(${swipeOffset}px,0,0)`,
                  transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                  touchAction: "pan-y",
                }}
                {...gestureHandlers}
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
                <LoadingOverlay loading={isOpeningScene} loadingText="进入场景中..." />
                <div className="min-w-0 flex-1">
                  <div className={sceneTitleClassName}>{scene.title}</div>
                  <div className={sceneSubtitleClassName}>{scene.subtitle}</div>
                  <div className="flex flex-wrap items-center gap-x-[var(--mobile-adapt-space-sm)] gap-y-[var(--mobile-adapt-space-sm)]">
                    <span className={sceneMetaPillClassName}>
                      {difficultyLabel[scene.difficulty] ?? "Intermediate"}
                    </span>
                    <span className={sceneMetaTextClassName}>
                      <Clock3 className="size-[clamp(12px,3.6vw,14px)]" />
                      {scene.estimatedMinutes} 分钟
                    </span>
                    <span className={sceneMetaTextClassName}>
                      <MessageSquareText className="size-[clamp(12px,3.6vw,14px)]" />
                      {scene.sentenceCount} 句
                    </span>
                    {scene.variantLinks.length > 0 ? (
                      <button
                        type="button"
                        data-scene-variant-view="true"
                        className={`${sceneMetaPillClassName} transition-colors hover:bg-[#EAEAF0] hover:text-[#1D1D1F]`}
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

                <div className="flex min-w-[clamp(68px,18vw,84px)] shrink-0 flex-col text-right">
                  <div className={`${sceneStatusClassName} ${SCENE_STATUS_TEXT_CLASSNAME[scene.learningStatus]}`}>
                    {learningStatusLabel[scene.learningStatus]}
                  </div>
                  <div className="mt-auto flex justify-end">
                    <div className={sceneProgressClassName}>
                      {Math.round(scene.progressPercent)}%
                    </div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-[var(--mobile-adapt-space-md)]">
      <div className="grid grid-cols-2 gap-[var(--mobile-adapt-space-sm)] pb-[var(--mobile-adapt-space-md)]">
        <Button
          type="button"
          radius="lg"
          className={sceneActionButtonClassName}
          onClick={() => setGenerateSheetOpen(true)}
        >
          <Sparkles className="size-[clamp(14px,4vw,16px)]" />
          生成场景
        </Button>
        <Button
          type="button"
          variant="secondary"
          radius="lg"
          className={sceneSecondaryActionButtonClassName}
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-[clamp(14px,4vw,16px)]" />
          导入自定义
        </Button>
      </div>

      {topTask ? (
        <div
          className={`text-sm ${topTask.status === "running" ? APPLE_BANNER_INFO : topTask.status === "done" ? APPLE_BANNER_SUCCESS : APPLE_BANNER_DANGER}`}
        >
          {topTask.message}
        </div>
      ) : null}

      <div onScroll={() => closeOpenedSwipe()}>{renderSceneCards()}</div>

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
