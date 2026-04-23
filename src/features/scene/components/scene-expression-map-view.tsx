"use client";

import { ReactNode } from "react";
import { ExpressionCluster } from "@/lib/types/expression-map";
import {
  APPLE_BANNER_DANGER,
  APPLE_META_TEXT,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";
import {
  SCENE_EXPRESSION_MAP_CHIP_CLASSNAME,
  SCENE_EXPRESSION_MAP_LIST_ITEM_CLASSNAME,
  SCENE_EXPRESSION_MAP_SECTION_CLASSNAME,
  SCENE_EXPRESSION_MAP_STACK_CLASSNAME,
} from "./scene-page-styles";
import { SceneExpressionMapViewLabels } from "./scene-view-labels";

type SceneExpressionMapViewProps = {
  clusters: ExpressionCluster[];
  error: string | null;
  appleButtonSmClassName: string;
  labels: SceneExpressionMapViewLabels;
  onBack: () => void;
  onOpenExpressionDetail: (expression: string, relatedChunks: string[]) => void;
  chunkDetailSheet?: ReactNode;
};

export function SceneExpressionMapView({
  clusters,
  error,
  appleButtonSmClassName,
  labels,
  onBack,
  onOpenExpressionDetail,
  chunkDetailSheet,
}: SceneExpressionMapViewProps) {
  return (
    <div className={SCENE_EXPRESSION_MAP_STACK_CLASSNAME}>
      <section className={SCENE_EXPRESSION_MAP_SECTION_CLASSNAME}>
        <div className="flex items-center gap-[var(--mobile-adapt-space-sm)]">
          <button
            type="button"
            className={`${appleButtonSmClassName} px-[var(--mobile-adapt-space-md)] py-[var(--mobile-adapt-space-2xs)] text-[length:var(--mobile-adapt-font-body-sm)]`}
            onClick={onBack}
          >
            {labels.back}
          </button>
        </div>
        <p className={APPLE_META_TEXT}>{labels.description}</p>
        {error ? <p className={APPLE_BANNER_DANGER}>{error}</p> : null}
      </section>

      <section className={SCENE_EXPRESSION_MAP_SECTION_CLASSNAME}>
        {clusters.length === 0 ? (
          <p className={APPLE_META_TEXT}>{labels.empty}</p>
        ) : (
          <ul className="space-y-[var(--mobile-adapt-space-sm)]">
            {clusters.map((cluster) => (
              <li key={cluster.id} className={SCENE_EXPRESSION_MAP_LIST_ITEM_CLASSNAME}>
                <p className={APPLE_TITLE_SM}>{cluster.anchor}</p>
                <p className={APPLE_META_TEXT}>{cluster.meaning}</p>
                <p className={APPLE_META_TEXT}>
                  {labels.sourceSceneCountPrefix}{cluster.sourceSceneIds.length}
                </p>
                <div className="flex flex-wrap gap-[var(--mobile-adapt-space-sm)]">
                  {cluster.expressions.map((expression) => (
                    <button
                      key={`${cluster.id}-${expression}`}
                      type="button"
                      className={SCENE_EXPRESSION_MAP_CHIP_CLASSNAME}
                      onClick={() => onOpenExpressionDetail(expression, cluster.expressions)}
                    >
                      {expression}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {chunkDetailSheet}
    </div>
  );
}
