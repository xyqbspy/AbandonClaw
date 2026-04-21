"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildSceneFullSegmentsFromLesson } from "@/lib/utils/audio-warmup";
import {
  getSceneDetailBySlugFromApi,
  SceneListItemResponse,
} from "@/lib/utils/scenes-api";
import {
  playSceneFullAudioOnce,
  stopTtsPlayback,
} from "@/lib/utils/tts-api";

export const SCENE_RANDOM_REVIEW_PROGRESS_THRESHOLD = 60;

type PlaybackStatus = "idle" | "loading" | "playing";

type PlaybackQueueItem = Pick<
  SceneListItemResponse,
  "id" | "slug" | "title" | "sceneType" | "progressPercent"
>;

const getNextIndex = (index: number, total: number) => (index + 1) % total;

const prefetchSceneDetailByQueueIndex = (queue: PlaybackQueueItem[], index: number) => {
  if (queue.length <= 1) return;
  const nextScene = queue[getNextIndex(index, queue.length)];
  if (!nextScene) return;
  void getSceneDetailBySlugFromApi(nextScene.slug).catch(() => undefined);
};

export function useSceneRandomReviewPlayback(allScenes: SceneListItemResponse[]) {
  const eligibleScenes = useMemo(
    () =>
      allScenes.filter(
        (scene) => scene.progressPercent >= SCENE_RANDOM_REVIEW_PROGRESS_THRESHOLD,
      ),
    [allScenes],
  );
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [currentScene, setCurrentScene] = useState<PlaybackQueueItem | null>(null);
  const runningRef = useRef(false);
  const queueRef = useRef<PlaybackQueueItem[]>([]);
  const indexRef = useRef(0);

  const stopRandomReview = useCallback(() => {
    runningRef.current = false;
    stopTtsPlayback();
    setStatus("idle");
    setCurrentScene(null);
  }, []);

  const playQueueFromIndex = useCallback(async (startIndex: number) => {
    const queue = eligibleScenes;
    if (queue.length === 0) {
      toast.message("完成 60% 以上的场景后可随机播放。");
      return;
    }

    runningRef.current = true;
    queueRef.current = queue;
    indexRef.current = startIndex;
    let failedInCurrentRound = 0;

    while (runningRef.current && queueRef.current.length > 0) {
      const currentQueue = queueRef.current;
      const scene = currentQueue[indexRef.current % currentQueue.length];
      setCurrentScene(scene);
      setStatus("loading");
      prefetchSceneDetailByQueueIndex(currentQueue, indexRef.current);

      try {
        const detail = await getSceneDetailBySlugFromApi(scene.slug);
        if (!runningRef.current) break;
        const segments = buildSceneFullSegmentsFromLesson(detail);
        if (segments.length === 0) {
          throw new Error("当前场景没有可播放内容。");
        }
        if (!runningRef.current) break;
        setStatus("playing");
        await playSceneFullAudioOnce({
          sceneSlug: detail.slug || scene.slug,
          sceneType: detail.sceneType ?? scene.sceneType,
          segments,
        });
        failedInCurrentRound = 0;
      } catch (error) {
        if (!runningRef.current) break;
        failedInCurrentRound += 1;
        if (failedInCurrentRound >= currentQueue.length) {
          runningRef.current = false;
          setStatus("idle");
          setCurrentScene(null);
          toast.error(
            error instanceof Error
              ? error.message
              : "随机复习播放暂时不可用，请稍后重试。",
          );
          break;
        }
        toast.message(`已跳过：${scene.title}`);
      }

      indexRef.current = getNextIndex(indexRef.current, currentQueue.length);
    }
  }, [eligibleScenes]);

  const toggleRandomReview = useCallback(() => {
    if (runningRef.current) {
      stopRandomReview();
      return;
    }
    const startIndex =
      eligibleScenes.length > 0 ? Math.floor(Math.random() * eligibleScenes.length) : 0;
    void playQueueFromIndex(startIndex);
  }, [eligibleScenes.length, playQueueFromIndex, stopRandomReview]);

  useEffect(
    () => () => {
      runningRef.current = false;
      stopTtsPlayback();
    },
    [],
  );

  return {
    eligibleScenes,
    currentScene,
    isRandomReviewActive: status !== "idle",
    randomReviewStatus: status,
    toggleRandomReview,
  };
}
