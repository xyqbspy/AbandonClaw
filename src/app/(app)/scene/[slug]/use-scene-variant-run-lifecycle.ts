"use client";

import { useEffect } from "react";
import { getSceneVariantRunCache, setSceneVariantRunCache } from "@/lib/cache/scene-runtime-cache";
import { Lesson } from "@/lib/types";
import {
  getSceneVariantRunSnapshotFromApi,
  SceneVariantRunResponse,
  startSceneVariantRunFromApi,
} from "@/lib/utils/learning-api";
import { hydrateVariantSetFromRun } from "@/lib/utils/scene-learning-flow-storage";
import { SceneViewMode } from "./scene-detail-page-logic";

type SearchParamsLike = {
  get(name: string): string | null;
};

export function useSceneVariantRunLifecycle({
  baseLesson,
  viewMode,
  latestVariantSetId,
  latestVariantSetStatus,
  activeVariantId,
  searchParams,
  setActiveVariantId,
  refreshGeneratedState,
}: {
  baseLesson: Lesson | null;
  viewMode: SceneViewMode;
  latestVariantSetId: string | null;
  latestVariantSetStatus: string | null;
  activeVariantId: string | null;
  searchParams: SearchParamsLike;
  setActiveVariantId: (variantId: string | null) => void;
  refreshGeneratedState: (sceneKey: string) => void;
}) {
  useEffect(() => {
    if (!baseLesson || !latestVariantSetId) return;
    let cancelled = false;

    void (async () => {
      const applyVariantRun = (result: SceneVariantRunResponse) => {
        if (!result.run) return;
        hydrateVariantSetFromRun(baseLesson.id, latestVariantSetId, result.run);
        refreshGeneratedState(baseLesson.id);
        if (!activeVariantId && !searchParams.get("variant") && result.run.activeVariantId) {
          setActiveVariantId(result.run.activeVariantId);
        }
      };

      const cache = await getSceneVariantRunCache(baseLesson.slug, latestVariantSetId);
      if (!cancelled && cache.found && cache.record && !cache.isExpired) {
        applyVariantRun(cache.record.data.snapshot);
        return;
      }

      try {
        const result = await getSceneVariantRunSnapshotFromApi(baseLesson.slug, {
          variantSetId: latestVariantSetId,
        });
        if (cancelled) return;
        applyVariantRun(result);
        void setSceneVariantRunCache(baseLesson.slug, latestVariantSetId, result).catch(() => {
          // Ignore cache failures.
        });
      } catch {
        // Non-blocking.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeVariantId,
    baseLesson,
    latestVariantSetId,
    refreshGeneratedState,
    searchParams,
    setActiveVariantId,
  ]);

  useEffect(() => {
    if (
      !baseLesson ||
      viewMode !== "variants" ||
      !latestVariantSetId ||
      latestVariantSetStatus !== "generated"
    ) {
      return;
    }

    void startSceneVariantRunFromApi(baseLesson.slug, {
      variantSetId: latestVariantSetId,
    })
      .then((result) => {
        void setSceneVariantRunCache(baseLesson.slug, latestVariantSetId, result).catch(() => {
          // Ignore cache failures.
        });
      })
      .catch(() => {
        // Non-blocking.
      });
  }, [baseLesson, latestVariantSetId, latestVariantSetStatus, viewMode]);
}

