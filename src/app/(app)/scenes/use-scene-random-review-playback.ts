"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getSceneCache, normalizeSceneSlug, setSceneCache } from "@/lib/cache/scene-cache";
import { Lesson } from "@/lib/types";
import { buildSceneFullSegmentsFromLesson } from "@/lib/utils/audio-warmup";
import {
  getSceneDetailBySlugFromApi,
  SceneListItemResponse,
} from "@/lib/utils/scenes-api";
import {
  playSceneFullAudioOnce,
  playSceneLoopAudio,
  prefetchSceneFullAudio,
  stopTtsPlayback,
} from "@/lib/utils/tts-api";
import { recordClientEvent } from "@/lib/utils/client-events";
import { shouldAvoidHeavyAudioWarmup } from "@/lib/utils/resource-actions";

export const SCENE_RANDOM_REVIEW_PROGRESS_THRESHOLD = 60;
const SCENE_RANDOM_REVIEW_PREPARE_WINDOW = 4;
const SCENE_RANDOM_REVIEW_PACK_LIMIT = 8;
const SCENE_RANDOM_REVIEW_PACK_SLUG = "scene-random-review-pack";

type PlaybackStatus = "idle" | "loading" | "playing";
export type ReviewPackPrepareStatus = "idle" | "preparing" | "ready" | "skipped" | "failed";
type ReviewPackPayload = {
  firstScene: PlaybackQueueItem;
  segments: Array<{ text: string; speaker?: string }>;
};

type PlaybackQueueItem = Pick<
  SceneListItemResponse,
  "id" | "slug" | "title" | "sceneType" | "progressPercent"
>;

const getNextIndex = (index: number, total: number) => (index + 1) % total;

const getQueueWindow = (
  queue: PlaybackQueueItem[],
  startIndex: number,
  limit: number,
) => {
  if (queue.length === 0) return [];
  const count = Math.min(queue.length, Math.max(1, limit));
  return Array.from({ length: count }, (_, offset) => queue[(startIndex + offset) % queue.length])
    .filter((scene): scene is PlaybackQueueItem => Boolean(scene));
};

const buildReviewPackQueueKey = (queue: PlaybackQueueItem[]) =>
  getQueueWindow(queue, 0, SCENE_RANDOM_REVIEW_PACK_LIMIT)
    .map((scene) => normalizeSceneSlug(scene.slug))
    .join("|");

const buildDailyReviewSeed = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const hashStableString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const buildDailyStableReviewQueue = (queue: PlaybackQueueItem[]) => {
  const seed = buildDailyReviewSeed();
  return queue
    .map((scene, index) => ({
      scene,
      index,
      score: hashStableString(`${seed}:${normalizeSceneSlug(scene.slug)}:${scene.id}`),
    }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ scene }) => scene);
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export function useSceneRandomReviewPlayback(allScenes: SceneListItemResponse[]) {
  const eligibleScenes = useMemo(
    () =>
      allScenes.filter(
        (scene) => scene.progressPercent >= SCENE_RANDOM_REVIEW_PROGRESS_THRESHOLD,
      ),
    [allScenes],
  );
  const reviewQueue = useMemo(
    () => buildDailyStableReviewQueue(eligibleScenes),
    [eligibleScenes],
  );
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [reviewPackPrepareStatus, setReviewPackPrepareStatusState] =
    useState<ReviewPackPrepareStatus>("idle");
  const [currentScene, setCurrentScene] = useState<PlaybackQueueItem | null>(null);
  const runningRef = useRef(false);
  const queueRef = useRef<PlaybackQueueItem[]>([]);
  const indexRef = useRef(0);
  const sceneDetailTaskMapRef = useRef(new Map<string, Promise<Lesson>>());
  const sceneDetailLessonMapRef = useRef(new Map<string, Lesson>());
  const preparedSceneFullSlugSetRef = useRef(new Set<string>());
  const reviewPackPrepareKeyRef = useRef<string | null>(null);
  const reviewPackPrepareTaskRef = useRef<Promise<ReviewPackPayload | null> | null>(null);
  const reviewPackPrepareStatusRef = useRef<ReviewPackPrepareStatus>("idle");

  const setReviewPackPrepareStatus = useCallback((nextStatus: ReviewPackPrepareStatus) => {
    reviewPackPrepareStatusRef.current = nextStatus;
    setReviewPackPrepareStatusState(nextStatus);
  }, []);

  const loadSceneDetailForPlayback = useCallback((scene: PlaybackQueueItem) => {
    const slug = normalizeSceneSlug(scene.slug);
    const cachedLesson = sceneDetailLessonMapRef.current.get(slug);
    if (cachedLesson) return Promise.resolve(cachedLesson);

    const existing = sceneDetailTaskMapRef.current.get(slug);
    if (existing) return existing;

    const task = (async () => {
      const cache = await getSceneCache(slug).catch(() => null);
      if (cache?.found && cache.record) {
        sceneDetailLessonMapRef.current.set(slug, cache.record.data);
        return cache.record.data;
      }

      const detail = await getSceneDetailBySlugFromApi(slug);
      sceneDetailLessonMapRef.current.set(slug, detail);
      void setSceneCache(slug, detail).catch(() => undefined);
      return detail;
    })().finally(() => {
      sceneDetailTaskMapRef.current.delete(slug);
    });

    sceneDetailTaskMapRef.current.set(slug, task);
    return task;
  }, []);

  const prepareSceneFullAudio = useCallback(
    async (scene: PlaybackQueueItem) => {
      const slug = normalizeSceneSlug(scene.slug);
      if (preparedSceneFullSlugSetRef.current.has(slug)) return;
      preparedSceneFullSlugSetRef.current.add(slug);
      try {
        const detail = await loadSceneDetailForPlayback(scene);
        const segments = buildSceneFullSegmentsFromLesson(detail);
        if (segments.length === 0) return;
        await prefetchSceneFullAudio({
          sceneSlug: detail.slug || scene.slug,
          sceneType: detail.sceneType ?? scene.sceneType,
          segments,
        });
      } catch (error) {
        preparedSceneFullSlugSetRef.current.delete(slug);
        throw error;
      }
    },
    [loadSceneDetailForPlayback],
  );

  const prepareQueueWindow = useCallback(
    (queue: PlaybackQueueItem[], startIndex: number) => {
      const candidates = getQueueWindow(
        queue,
        startIndex,
        SCENE_RANDOM_REVIEW_PREPARE_WINDOW,
      );
      void Promise.all(candidates.map((scene) => prepareSceneFullAudio(scene))).catch(() => undefined);
    },
    [prepareSceneFullAudio],
  );

  const buildReviewPackPayload = useCallback(
    async (queue: PlaybackQueueItem[]) => {
      const candidates = getQueueWindow(queue, 0, SCENE_RANDOM_REVIEW_PACK_LIMIT);
      const loadedResults = await Promise.allSettled(
        candidates.map(async (scene) => ({
          scene,
          lesson: await loadSceneDetailForPlayback(scene),
        })),
      );

      const loadedLessons = loadedResults.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const segments = loadedLessons.flatMap(({ lesson }) => buildSceneFullSegmentsFromLesson(lesson));
      const firstScene = loadedLessons[0]?.scene ?? candidates[0];
      if (!firstScene || segments.length === 0) {
        return null;
      }

      return { firstScene, segments };
    },
    [loadSceneDetailForPlayback],
  );

  const prepareReviewPack = useCallback(
    (queue: PlaybackQueueItem[], options?: { auto?: boolean }) => {
      const reviewPackKey = buildReviewPackQueueKey(queue);
      const auto = options?.auto === true;
      if (!reviewPackKey) {
        setReviewPackPrepareStatus("idle");
        return null;
      }
      if (auto && shouldAvoidHeavyAudioWarmup()) {
        reviewPackPrepareKeyRef.current = reviewPackKey;
        reviewPackPrepareTaskRef.current = null;
        setReviewPackPrepareStatus("skipped");
        recordClientEvent("scene_review_pack_prepare_skipped", {
          queueKey: reviewPackKey,
          candidateCount: queue.length,
          reason: "weak_network_or_save_data",
        });
        return null;
      }
      if (
        reviewPackPrepareKeyRef.current === reviewPackKey &&
        reviewPackPrepareTaskRef.current &&
        (reviewPackPrepareStatusRef.current === "preparing" ||
          reviewPackPrepareStatusRef.current === "ready")
      ) {
        return reviewPackPrepareTaskRef.current;
      }

      reviewPackPrepareKeyRef.current = reviewPackKey;
      setReviewPackPrepareStatus("preparing");
      recordClientEvent("scene_review_pack_prepare_started", {
        queueKey: reviewPackKey,
        candidateCount: queue.length,
        auto,
      });
      const task = (async () => {
        const payload = await buildReviewPackPayload(queue);
        if (!payload) {
          throw new Error("当前复习音频包没有可播放内容。");
        }
        await prefetchSceneFullAudio({
          sceneSlug: SCENE_RANDOM_REVIEW_PACK_SLUG,
          sceneType: "dialogue",
          segments: payload.segments,
        });
        setReviewPackPrepareStatus("ready");
        recordClientEvent("scene_review_pack_prepare_ready", {
          queueKey: reviewPackKey,
          candidateCount: queue.length,
          segmentCount: payload.segments.length,
          auto,
        });
        return payload;
      })().catch((error) => {
        setReviewPackPrepareStatus("failed");
        recordClientEvent("scene_review_pack_prepare_failed", {
          queueKey: reviewPackKey,
          candidateCount: queue.length,
          auto,
          message: getErrorMessage(error),
        });
        return null;
      });

      reviewPackPrepareTaskRef.current = task;
      return task;
    },
    [buildReviewPackPayload, setReviewPackPrepareStatus],
  );

  const playReviewPackFromQueue = useCallback(
    async (queue: PlaybackQueueItem[]) => {
      const reviewPackKey = buildReviewPackQueueKey(queue);
      const preparedPayload =
        reviewPackPrepareKeyRef.current === reviewPackKey
          ? await reviewPackPrepareTaskRef.current?.catch(() => null)
          : null;
      const payload =
        preparedPayload ??
        (await prepareReviewPack(queue, { auto: false })?.catch(() => null)) ??
        (await buildReviewPackPayload(queue));

      if (!runningRef.current) return false;
      if (!payload) {
        throw new Error("当前复习音频包没有可播放内容。");
      }

      setCurrentScene(payload.firstScene);
      setStatus("playing");
      recordClientEvent("scene_review_pack_play_started", {
        queueKey: reviewPackKey,
        candidateCount: queue.length,
        segmentCount: payload.segments.length,
      });
      await playSceneLoopAudio({
        sceneSlug: SCENE_RANDOM_REVIEW_PACK_SLUG,
        sceneType: "dialogue",
        segments: payload.segments,
      });
      return true;
    },
    [buildReviewPackPayload, prepareReviewPack],
  );

  const stopRandomReview = useCallback(() => {
    runningRef.current = false;
    stopTtsPlayback();
    setStatus("idle");
    setCurrentScene(null);
  }, []);

  const playPerSceneQueueFromIndex = useCallback(async (
    queue: PlaybackQueueItem[],
    startIndex: number,
  ) => {
    indexRef.current = startIndex;
    preparedSceneFullSlugSetRef.current.clear();
    let failedInCurrentRound = 0;
    prepareQueueWindow(queue, startIndex);

    while (runningRef.current && queueRef.current.length > 0) {
      const currentQueue = queueRef.current;
      const scene = currentQueue[indexRef.current % currentQueue.length];
      setCurrentScene(scene);
      setStatus("loading");
      if (currentQueue.length > 1) {
        prepareQueueWindow(currentQueue, getNextIndex(indexRef.current, currentQueue.length));
      }

      try {
        const detail = await loadSceneDetailForPlayback(scene);
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
              : "复习播放暂时不可用，请稍后重试。",
          );
          break;
        }
        toast.message(`已跳过：${scene.title}`);
      }

      indexRef.current = getNextIndex(indexRef.current, currentQueue.length);
    }
  }, [loadSceneDetailForPlayback, prepareQueueWindow]);

  const playQueueFromStart = useCallback(async () => {
    const queue = reviewQueue;
    if (queue.length === 0) {
      toast.message("完成 60% 以上的场景后可播放。");
      return;
    }

    runningRef.current = true;
    queueRef.current = queue;
    indexRef.current = 0;
    preparedSceneFullSlugSetRef.current.clear();
    setCurrentScene(queue[0] ?? null);
    setStatus("loading");

    try {
      const startedPack = await playReviewPackFromQueue(queue);
      if (startedPack) return;
    } catch (error) {
      if (!runningRef.current) return;
      recordClientEvent("scene_review_pack_fallback_to_queue", {
        queueKey: buildReviewPackQueueKey(queue),
        candidateCount: queue.length,
        message: getErrorMessage(error),
      });
      stopTtsPlayback();
    }

    if (!runningRef.current) return;
    await playPerSceneQueueFromIndex(queue, 0);
  }, [playPerSceneQueueFromIndex, playReviewPackFromQueue, reviewQueue]);

  const toggleRandomReview = useCallback(() => {
    if (runningRef.current) {
      stopRandomReview();
      return;
    }
    void playQueueFromStart();
  }, [playQueueFromStart, stopRandomReview]);

  useEffect(() => {
    if (reviewQueue.length === 0) {
      setReviewPackPrepareStatus("idle");
      return;
    }
    if (runningRef.current) return;
    void prepareReviewPack(reviewQueue, { auto: true });
  }, [prepareReviewPack, reviewQueue, setReviewPackPrepareStatus]);

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
    reviewPackScenes: getQueueWindow(reviewQueue, 0, SCENE_RANDOM_REVIEW_PACK_LIMIT),
    isRandomReviewActive: status !== "idle",
    randomReviewStatus: status,
    reviewPackPrepareStatus,
    toggleRandomReview,
  };
}
