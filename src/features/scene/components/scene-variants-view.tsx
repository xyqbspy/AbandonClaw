"use client";

import { ReactNode } from "react";
import { LoadingContent } from "@/components/shared/action-loading";
import { Lesson } from "@/lib/types";
import { VariantSet } from "@/lib/types/learning-flow";
import {
  APPLE_BUTTON_BASE,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL_RAISED,
  APPLE_TITLE_MD,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";
import { SceneVariantsViewLabels } from "./scene-view-labels";

type SceneVariantsViewProps = {
  baseLesson: Lesson;
  variantSet: VariantSet | null;
  expressionMapLoading: boolean;
  appleButtonSmClassName: string;
  appleDangerButtonSmClassName: string;
  labels: SceneVariantsViewLabels;
  onBack: () => void;
  onComplete: () => void;
  onRepeatVariants?: () => void;
  onDeleteSet: () => void;
  onOpenExpressionMap: () => void;
  onOpenChunk: (chunk: string) => void;
  onOpenVariant: (variantId: string) => void;
  onDeleteVariant: (variantId: string) => void;
  toVariantTitle: (title: string) => string;
  toVariantStatusLabel: (status: "unviewed" | "viewed" | "completed") => string;
  chunkDetailSheet?: ReactNode;
};

export function SceneVariantsView({
  baseLesson,
  variantSet,
  expressionMapLoading,
  appleButtonSmClassName,
  appleDangerButtonSmClassName,
  labels,
  onBack,
  onComplete,
  onRepeatVariants,
  onDeleteSet,
  onOpenExpressionMap,
  onOpenChunk,
  onOpenVariant,
  onDeleteVariant,
  toVariantTitle,
  toVariantStatusLabel,
  chunkDetailSheet,
}: SceneVariantsViewProps) {
  return (
    <div className="space-y-5">
      <section className={`space-y-4 p-4 sm:p-5 ${APPLE_PANEL_RAISED}`}>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className={`h-8 whitespace-nowrap ${appleButtonSmClassName}`}
            onClick={onBack}
          >
            {labels.back}
          </button>
          {variantSet?.status === "completed" && onRepeatVariants ? (
            <button
              type="button"
              className={`h-8 whitespace-nowrap ${appleButtonSmClassName}`}
              onClick={onRepeatVariants}
            >
              {labels.repeat}
            </button>
          ) : (
            <button
              type="button"
              className={`h-8 whitespace-nowrap ${appleButtonSmClassName} disabled:opacity-60`}
              onClick={onComplete}
              disabled={!variantSet || variantSet.status === "completed"}
            >
              {labels.complete}
            </button>
          )}
          <button
            type="button"
            className={`h-8 whitespace-nowrap px-3 ${appleDangerButtonSmClassName} disabled:opacity-60`}
            onClick={onDeleteSet}
            disabled={!variantSet}
          >
            {labels.deleteSet}
          </button>
        </div>

        <div className={`space-y-0.5 ${APPLE_META_TEXT}`}>
          <p>{labels.sourceScenePrefix}{baseLesson.title}</p>
          <p>{labels.variantsHint}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className={APPLE_TITLE_MD}>{labels.reusedChunksTitle}</h3>
            <button
              type="button"
              className={`h-8 whitespace-nowrap ${APPLE_BUTTON_BASE} px-3 text-[11px] font-semibold ${APPLE_META_TEXT} disabled:opacity-60`}
              onClick={onOpenExpressionMap}
              disabled={!variantSet || expressionMapLoading}
            >
              <LoadingContent loading={expressionMapLoading} loadingText={labels.loadingMap}>
                {labels.openMap}
              </LoadingContent>
            </button>
          </div>
          {variantSet?.reusedChunks?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {variantSet.reusedChunks.map((chunk) => (
                <button
                  key={chunk}
                  type="button"
                  className={`${APPLE_BUTTON_BASE} px-2.5 py-1 text-[11px] font-medium`}
                  onClick={() => onOpenChunk(chunk)}
                >
                  {chunk}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {!variantSet ? (
        <p className={APPLE_META_TEXT}>{labels.empty}</p>
      ) : (
        <section className={`space-y-3 p-4 sm:p-5 ${APPLE_PANEL_RAISED}`}>
          <div className="space-y-1">
            <h3 className={APPLE_TITLE_SM}>变体列表</h3>
            <p className={APPLE_META_TEXT}>按顺序浏览和完成本轮变体，已完成后可重新开启一轮。</p>
          </div>
          <ul className="space-y-2">
            {variantSet.variants.map((variant) => (
              <li
                key={variant.id}
                className={`flex items-center justify-between gap-3 p-3 ${APPLE_LIST_ITEM}`}
              >
                <div className="min-w-0 flex-1">
                  <p className={APPLE_TITLE_SM}>{toVariantTitle(variant.lesson.title)}</p>
                  <p className={`mt-0.5 line-clamp-2 ${APPLE_META_TEXT}`}>
                    {variant.lesson.sections[0]?.summary ?? variant.lesson.subtitle}
                  </p>
                  <p className={`mt-1 ${APPLE_META_TEXT}`}>
                    {labels.statusPrefix}{toVariantStatusLabel(variant.status)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className={`h-8 whitespace-nowrap ${appleButtonSmClassName}`}
                    onClick={() => onOpenVariant(variant.id)}
                  >
                    {labels.open}
                  </button>
                  <button
                    type="button"
                    className={`h-8 whitespace-nowrap px-2.5 ${appleDangerButtonSmClassName}`}
                    onClick={() => onDeleteVariant(variant.id)}
                  >
                    {labels.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {chunkDetailSheet}
    </div>
  );
}
