"use client";

import { ReactNode } from "react";
import { ExpressionCluster } from "@/lib/types/expression-map";
import {
  APPLE_BUTTON_BASE,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL_RAISED,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";
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
    <div className="space-y-4">
      <section className={`space-y-3 p-4 ${APPLE_PANEL_RAISED}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`${appleButtonSmClassName} px-3 py-1.5 text-sm`}
            onClick={onBack}
          >
            {labels.back}
          </button>
        </div>
        <p className={APPLE_META_TEXT}>{labels.description}</p>
        {error ? <p className={`font-medium text-destructive ${APPLE_META_TEXT}`}>{error}</p> : null}
      </section>

      <section className={`space-y-3 p-4 ${APPLE_PANEL_RAISED}`}>
        {clusters.length === 0 ? (
          <p className={APPLE_META_TEXT}>{labels.empty}</p>
        ) : (
          <ul className="space-y-2">
            {clusters.map((cluster) => (
              <li key={cluster.id} className={`space-y-2 p-3 ${APPLE_LIST_ITEM}`}>
                <p className={APPLE_TITLE_SM}>{cluster.anchor}</p>
                <p className={APPLE_META_TEXT}>{cluster.meaning}</p>
                <p className={APPLE_META_TEXT}>
                  {labels.sourceSceneCountPrefix}{cluster.sourceSceneIds.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cluster.expressions.map((expression) => (
                    <button
                      key={`${cluster.id}-${expression}`}
                      type="button"
                      className={`${APPLE_BUTTON_BASE} px-2 py-1 text-xs`}
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
