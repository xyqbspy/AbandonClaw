"use client";

import { useEffect, useState } from "react";
import { CircleHelp, Clock3, MessageSquareText, Plus, Repeat2, Sparkles } from "lucide-react";
import { AudioStateIcon } from "@/components/audio/audio-state-icon";
import { GenerateSceneSheet } from "@/components/scenes/generate-scene-sheet";
import {
  LoadingOverlay,
  LoadingState,
} from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import {
  APPLE_BANNER_DANGER,
  APPLE_BANNER_INFO,
  APPLE_BANNER_SUCCESS,
  APPLE_BUTTON_TEXT_MD,
  APPLE_CARD_INTERACTIVE,
} from "@/lib/ui/apple-style";
import { SceneDeleteDialog } from "./scene-delete-dialog";
import { SceneImportDialog } from "./scene-import-dialog";
import { useSceneRandomReviewPlayback } from "./use-scene-random-review-playback";
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

const sceneStatusBadgeToneClassName = {
  not_started: "bg-[#F1F1F1] text-[#71717A]",
  in_progress: "bg-[#E3F9E5] text-[#22C55E]",
  completed: "bg-[#E3F9E5] text-[#22C55E]",
  paused: "bg-[#F1F1F1] text-[#71717A]",
} as const;

const sceneActionButtonClassName = `h-[var(--mobile-adapt-button-height)] gap-[var(--mobile-adapt-space-sm)] text-[length:var(--mobile-adapt-font-body-sm)] ${APPLE_BUTTON_TEXT_MD}`;
const sceneSecondaryActionButtonClassName =
  `${sceneActionButtonClassName} bg-[var(--app-button-secondary-bg)] text-[var(--app-button-secondary-text)] border-[var(--app-button-secondary-border)]`;
const sceneRandomReviewButtonClassName =
  "size-[var(--mobile-adapt-button-height)] rounded-full border-[var(--border)] bg-white px-0 text-[var(--app-foreground-muted)] shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:bg-white hover:text-[var(--app-foreground)]";
const sceneCardClassName =
  `${APPLE_CARD_INTERACTIVE} relative z-10 flex cursor-pointer items-center justify-between gap-[var(--mobile-adapt-space-md)] rounded-[20px] border border-[rgba(226,232,240,0.5)] bg-white p-[var(--mobile-adapt-space-sheet)] shadow-[0_4px_6px_rgba(0,0,0,0.01)] will-change-transform transition-[transform,box-shadow,opacity] duration-[280ms]`;
const sceneMetaPillClassName =
  "inline-flex min-h-[clamp(22px,5.5vw,26px)] items-center rounded-[6px] bg-[var(--app-scene-card-meta-bg)] px-[var(--mobile-adapt-space-sm)] text-[length:var(--mobile-adapt-font-caption)] font-semibold whitespace-nowrap text-[var(--app-scene-card-meta-text)]";
const sceneMetaTextClassName =
  `inline-flex items-center gap-[var(--mobile-adapt-space-2xs)] text-[length:var(--mobile-adapt-font-caption)] font-medium whitespace-nowrap text-[#94A3B8]`;
const sceneTitleClassName =
  "min-w-0 truncate text-[length:clamp(1rem,4.4vw,1.0625rem)] leading-[1.3] font-bold text-[#1E293B]";
const sceneSubtitleClassName =
  "mt-[6px] line-clamp-2 text-[length:var(--mobile-adapt-font-caption)] leading-[1.45] text-[#64748B]";
const sceneStatusClassName =
  "inline-flex shrink-0 items-center rounded-[8px] px-[10px] py-[4px] text-[12px] font-normal leading-none";
const sceneProgressClassName =
  "text-[length:clamp(1.1rem,5.5vw,1.25rem)] leading-none font-bold text-[#1E293B]";
const sceneRandomReviewStatusClassName =
  "flex min-h-[18px] items-center justify-end gap-[var(--mobile-adapt-space-2xs)] text-right text-[length:var(--mobile-adapt-font-caption)] font-bold text-[var(--app-foreground-muted)]";
const sceneRandomReviewInfoButtonClassName =
  "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full text-[var(--app-foreground-muted)] transition-colors hover:bg-[var(--app-scene-card-meta-bg)] hover:text-[var(--app-foreground)]";
const sceneRandomReviewPackListClassName =
  "absolute right-0 top-[calc(100%+var(--mobile-adapt-space-2xs))] z-30 w-[min(320px,calc(100vw-32px))] rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.98)] p-5 text-left shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-[20px]";
const sceneRandomReviewPackTitleClassName =
  "mb-4 flex items-center gap-[6px] text-[14px] font-semibold text-[#86868B]";
const sceneRandomReviewPackItemClassName =
  "flex items-start border-b border-[rgba(0,0,0,0.03)] py-2 last:border-b-0";
const sceneRandomReviewPackIndexClassName =
  "mr-3 mt-[2px] flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-[rgba(0,122,255,0.1)] text-[12px] font-semibold text-[#007AFF]";
const sceneRandomReviewPackItemTitleClassName =
  "truncate text-[15px] font-semibold leading-[1.4] text-[#1D1D1F]";

export default function ScenesPage() {
  const [reviewPackListOpen, setReviewPackListOpen] = useState(false);
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
  const {
    eligibleScenes,
    isRandomReviewActive,
    reviewPackScenes,
    randomReviewStatus,
    reviewPackPrepareStatus,
    toggleRandomReview,
  } = useSceneRandomReviewPlayback(allScenes);

  const randomReviewTitle =
    eligibleScenes.length === 0
      ? "完成 60% 以上的场景后可循环播放"
      : isRandomReviewActive
        ? `循环播放中：${eligibleScenes.length} 个场景`
        : reviewPackPrepareStatus === "preparing"
          ? "循环播放音频准备中"
          : reviewPackPrepareStatus === "ready"
            ? `已准备好，可后台循环 ${reviewPackScenes.length} 个场景`
            : reviewPackPrepareStatus === "skipped"
              ? "点击后准备音频"
              : reviewPackPrepareStatus === "failed"
                ? "准备失败，点击仍可播放"
                : `可循环 ${eligibleScenes.length} 个场景`;
  const randomReviewStatusText =
    eligibleScenes.length === 0
      ? null
      : isRandomReviewActive
        ? `循环播放中：${eligibleScenes.length} 个场景`
        : reviewPackPrepareStatus === "preparing"
          ? "循环音频准备中"
          : reviewPackPrepareStatus === "ready"
            ? "已准备好，可后台循环"
            : reviewPackPrepareStatus === "skipped"
              ? "点击后准备音频"
              : reviewPackPrepareStatus === "failed"
                ? "准备失败，点击仍可播放"
                : `可循环 ${eligibleScenes.length} 个场景`;

  useEffect(() => {
    if (reviewPackScenes.length > 0) return;
    // Keep the disclosure closed when the random review pack becomes unavailable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviewPackListOpen(false);
  }, [reviewPackScenes.length]);

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
      <div className="space-y-[15px]">
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
              className={`relative overflow-hidden rounded-[20px] bg-white transition-[max-height,margin,opacity] duration-250 ease-out ${removingSceneId === scene.id ? "mb-0 max-h-0 opacity-0" : "max-h-[200px]"}`}
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
                  <div className="flex min-w-0 items-center gap-[var(--mobile-adapt-space-sm)]">
                    <div className={sceneTitleClassName}>{scene.title}</div>
                    <div className={`${sceneStatusClassName} ${sceneStatusBadgeToneClassName[scene.learningStatus]}`}>
                      {learningStatusLabel[scene.learningStatus]}
                    </div>
                  </div>
                  <div className={sceneSubtitleClassName}>{scene.subtitle}</div>
                  <div className="mt-[var(--mobile-adapt-space-sm)] flex flex-wrap items-center gap-x-[var(--mobile-adapt-space-xs)] gap-y-[var(--mobile-adapt-space-xs)]">
                    <span className={sceneMetaTextClassName}>
                      {difficultyLabel[scene.difficulty] ?? "Intermediate"}
                    </span>
                    <span className="text-[length:var(--mobile-adapt-font-caption)] text-[#CBD5E1]">·</span>
                    <span className={sceneMetaTextClassName}>
                      <Clock3 className="size-[clamp(12px,3.6vw,14px)]" />
                      {scene.estimatedMinutes} 分钟
                    </span>
                    <span className="text-[length:var(--mobile-adapt-font-caption)] text-[#CBD5E1]">·</span>
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

                <div className="flex min-w-[clamp(48px,14vw,64px)] shrink-0 justify-end text-right">
                  <div className={sceneProgressClassName}>
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

  return (
    <div className="space-y-[var(--mobile-adapt-space-md)]">
      <div className="space-y-[calc(var(--mobile-adapt-space-md)/2)] pb-[var(--mobile-adapt-space-md)]">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-[var(--mobile-adapt-space-sm)]">
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
          <Button
            type="button"
            variant="secondary"
            radius="lg"
            className={`${sceneRandomReviewButtonClassName} ${isRandomReviewActive ? "border-primary/20 text-primary ring-2 ring-primary/10 hover:text-primary" : ""}`}
            disabled={!isRandomReviewActive && eligibleScenes.length === 0}
            title={randomReviewTitle}
            aria-label={
              isRandomReviewActive
                ? "停止循环播放"
                : eligibleScenes.length === 0
                  ? "暂无可循环播放的场景"
                  : "循环播放场景"
            }
            onClick={toggleRandomReview}
          >
            {isRandomReviewActive && randomReviewStatus === "playing" ? (
              <AudioStateIcon
                family="loop"
                state="playing"
                className="size-[clamp(14px,4.2vw,17px)]"
              />
            ) : (
              <Repeat2
                data-random-review-icon="loop"
                className="size-[clamp(14px,4.2vw,17px)]"
              />
            )}
          </Button>
        </div>
        {randomReviewStatusText ? (
          <div className="relative">
            <div className={sceneRandomReviewStatusClassName} data-random-review-status="true">
              <span>{randomReviewStatusText}</span>
              {reviewPackScenes.length > 0 ? (
                <button
                  type="button"
                  className={sceneRandomReviewInfoButtonClassName}
                  aria-label="查看循环播放内容"
                  aria-expanded={reviewPackListOpen}
                  aria-controls="scene-review-pack-list"
                  title="查看循环播放内容"
                  onClick={() => setReviewPackListOpen((open) => !open)}
                >
                  <CircleHelp className="size-[14px]" />
                </button>
              ) : null}
            </div>
            {reviewPackListOpen ? (
              <div
                id="scene-review-pack-list"
                className={sceneRandomReviewPackListClassName}
                data-random-review-pack-list="true"
              >
                <div className={sceneRandomReviewPackTitleClassName}>
                  <Repeat2 className="size-[14px]" strokeWidth={2.5} />
                  本次循环包含 ({reviewPackScenes.length})
                </div>
                <ul className="m-0 list-none p-0">
                  {reviewPackScenes.map((scene, index) => (
                    <li key={scene.id} className={sceneRandomReviewPackItemClassName}>
                      <span className={sceneRandomReviewPackIndexClassName}>{index + 1}</span>
                      <span className={sceneRandomReviewPackItemTitleClassName}>
                        {scene.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
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
