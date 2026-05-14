"use client";

import type { HTMLAttributes } from "react";
import { Clock3 } from "lucide-react";
import { LoadingOverlay } from "@/components/shared/action-loading";
import type { SceneListItemResponse } from "@/lib/utils/scenes-api";
import {
  getSceneLevelLabel,
  getSceneSourceLabel,
  getSceneStatus,
  splitSceneTitleParts,
} from "./scene-display";

type SceneListCardProps = {
  scene: SceneListItemResponse;
  isOpening: boolean;
  isImported: boolean;
  removing: boolean;
  swipeOffset: number;
  swipeOpen: boolean;
  openingLocked: boolean;
  gestureHandlers: HTMLAttributes<HTMLElement>;
  onOpen: () => void;
  onWarm: () => void;
  onDelete?: () => void;
  featured?: boolean;
};

const statusToneClassName = {
  idle: "text-slate-300",
  progress: "text-blue-600",
  paused: "text-amber-600",
  done: "text-emerald-600",
} as const;

export function SceneListCard({
  scene,
  isOpening,
  isImported,
  removing,
  swipeOffset,
  swipeOpen,
  openingLocked,
  gestureHandlers,
  onOpen,
  onWarm,
  onDelete,
  featured = false,
}: SceneListCardProps) {
  const status = getSceneStatus(scene);
  const titleParts = splitSceneTitleParts(scene.title);
  const subtitle = scene.subtitle?.trim() || titleParts.chineseTitle || "";
  const showProgress = scene.progressPercent > 0;

  return (
    <div
      data-swipe-row="true"
      className={`relative overflow-hidden rounded-[2rem] bg-white transition-[max-height,margin,opacity] duration-200 ${
        removing ? "mb-0 max-h-0 opacity-0" : "max-h-[260px]"
      }`}
    >
      {isImported ? (
        <div className="absolute inset-y-0 right-0 z-0 flex w-24">
          <button
            type="button"
            aria-label="删除"
            data-scene-delete="true"
            className="flex h-full w-full items-center justify-center bg-rose-500 text-sm font-bold text-white"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete?.();
            }}
          >
            删除
          </button>
        </div>
      ) : null}

      <article
        className={`relative z-10 cursor-pointer rounded-[2rem] border bg-white p-6 shadow-sm transition-[transform,box-shadow,opacity] duration-300 active:scale-[0.98] active:opacity-90 ${
          featured ? "border-blue-500 shadow-xl shadow-blue-50" : "border-slate-100"
        } ${swipeOpen ? "shadow-[0_18px_40px_rgba(15,23,42,0.14)]" : ""} ${openingLocked ? "pointer-events-none" : ""}`}
        style={{
          transform: `translate3d(${swipeOffset}px,0,0)`,
          touchAction: "pan-y",
          transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
        {...gestureHandlers}
        onClick={onOpen}
        onPointerEnter={onWarm}
        onFocus={onWarm}
      >
        <LoadingOverlay loading={isOpening} loadingText="进入场景中..." />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className={`${featured ? "text-xl" : "text-lg"} truncate font-black text-slate-900`}>
              {titleParts.englishTitle || scene.title}
            </h3>
            {subtitle ? (
              <p className="line-clamp-2 text-[11px] font-bold text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          {showProgress ? (
            <div className="shrink-0 text-right">
              <span className="text-2xl font-black text-blue-600">{Math.round(scene.progressPercent)}%</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
          <span className={`rounded px-2 py-1 ${featured ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"}`}>
            {scene.level ?? "L?"} {getSceneLevelLabel(scene.level)}
          </span>
          <span className="rounded bg-slate-50 px-2 py-1 text-slate-500">
            {getSceneSourceLabel(scene.sourceType)}
          </span>
          {scene.estimatedMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {scene.estimatedMinutes} Min
            </span>
          ) : null}
          <span className={statusToneClassName[status.tone]}>{status.label}</span>
        </div>
      </article>
    </div>
  );
}
