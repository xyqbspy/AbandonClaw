import {
  buildSceneFullTtsCacheKey,
  buildSentenceTtsCacheKey,
  ensureSceneFullAudio,
  ensureSentenceAudio,
  getSceneFullAudioCooldown,
} from "@/lib/utils/tts-api";
import { recordClientEvent } from "@/lib/utils/client-events";
import { markAudioWarmed, type WarmupSource } from "@/lib/utils/tts-warmup-registry";

export type SceneAudioWarmupTaskKind = "sentence" | "scene_full";
export type SceneAudioWarmupTaskStatus = "queued" | "loading" | "loaded" | "failed" | "skipped";
export type SceneAudioWarmupTaskPriority =
  | "immediate"
  | "next-up"
  | "idle-warm"
  | "background";
export type SceneAudioWarmupTaskSource = "initial" | "idle" | "playback" | "user-click";

export type SceneSentenceWarmupPayload = {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
};

export type SceneFullWarmupPayload = {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
};

type SceneAudioWarmupTaskPayload =
  | { kind: "sentence"; payload: SceneSentenceWarmupPayload }
  | { kind: "scene_full"; payload: SceneFullWarmupPayload };

type InternalSceneAudioWarmupTask = SceneAudioWarmupTaskPayload & {
  key: string;
  status: SceneAudioWarmupTaskStatus;
  priority: SceneAudioWarmupTaskPriority;
  source: SceneAudioWarmupTaskSource;
  sequence: number;
  errorMessage?: string;
  startedAt?: number;
};

export type SceneAudioWarmupTask = Omit<InternalSceneAudioWarmupTask, "sequence">;

const priorityRank: Record<SceneAudioWarmupTaskPriority, number> = {
  immediate: 0,
  "next-up": 1,
  "idle-warm": 2,
  background: 3,
};

const sceneAudioWarmupTasks = new Map<string, InternalSceneAudioWarmupTask>();
const taskAbortControllers = new Map<string, AbortController>();
let activeTaskCount = 0;
let sequence = 0;
const maxConcurrentWarmupTasks = 2;
// 防止 task map 在长时间运行（多 scene 切换）后无限增长。命中上限时清理已结束的旧任务。
const MAX_WARMUP_TASKS = 200;
const WARMUP_TASKS_PRUNE_TARGET = 120;

const pruneFinishedWarmupTasks = () => {
  if (sceneAudioWarmupTasks.size <= MAX_WARMUP_TASKS) return;
  const finished = Array.from(sceneAudioWarmupTasks.entries())
    .filter(([, task]) => task.status === "loaded" || task.status === "failed" || task.status === "skipped")
    .sort((a, b) => a[1].sequence - b[1].sequence);
  const toRemove = sceneAudioWarmupTasks.size - WARMUP_TASKS_PRUNE_TARGET;
  for (let i = 0; i < toRemove && i < finished.length; i += 1) {
    sceneAudioWarmupTasks.delete(finished[i][0]);
  }
};

const cloneTask = (task: InternalSceneAudioWarmupTask): SceneAudioWarmupTask => ({
  key: task.key,
  kind: task.kind,
  payload: { ...task.payload },
  status: task.status,
  priority: task.priority,
  source: task.source,
  errorMessage: task.errorMessage,
});

export const buildSceneSentenceWarmupTaskKey = (payload: SceneSentenceWarmupPayload) => {
  return buildSentenceTtsCacheKey(payload);
};

export const buildSceneFullWarmupTaskKey = (payload: SceneFullWarmupPayload) => {
  return buildSceneFullTtsCacheKey(payload);
};

const shouldPromotePriority = (
  current: SceneAudioWarmupTaskPriority,
  next: SceneAudioWarmupTaskPriority,
) => priorityRank[next] < priorityRank[current];

const runTask = async (task: InternalSceneAudioWarmupTask, signal: AbortSignal) => {
  if (task.kind === "sentence") {
    await ensureSentenceAudio({ ...task.payload, signal });
    return "loaded" as const;
  }
  const cooldown = getSceneFullAudioCooldown(task.payload);
  if (cooldown) return "skipped" as const;
  await ensureSceneFullAudio({ ...task.payload, signal });
  return "loaded" as const;
};

const getTaskSceneSlug = (task: InternalSceneAudioWarmupTask) => task.payload.sceneSlug;

const recordWarmupTaskFinishedEvent = (
  task: InternalSceneAudioWarmupTask,
  status: SceneAudioWarmupTaskStatus,
) => {
  recordClientEvent("warmup_task_finished", {
    sceneSlug: getTaskSceneSlug(task),
    kind: task.kind,
    priority: task.priority,
    source: task.source,
    status,
    durationMs: task.startedAt ? Date.now() - task.startedAt : null,
    ...(task.errorMessage ? { errorMessage: task.errorMessage } : {}),
  });
};

const getNextQueuedTask = () =>
  Array.from(sceneAudioWarmupTasks.values())
    .filter((task) => task.status === "queued")
    .sort((left, right) => {
      const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
      if (priorityDelta !== 0) return priorityDelta;
      return left.sequence - right.sequence;
    })[0] ?? null;

const pumpSceneAudioWarmupQueue = () => {
  while (activeTaskCount < maxConcurrentWarmupTasks) {
    const task = getNextQueuedTask();
    if (!task) return;

    activeTaskCount += 1;
    task.status = "loading";
    task.errorMessage = undefined;
    task.startedAt = Date.now();
    const controller = new AbortController();
    taskAbortControllers.set(task.key, controller);

    void runTask(task, controller.signal)
      .then((status) => {
        if (controller.signal.aborted) return;
        task.status = status;
        task.errorMessage =
          status === "skipped" ? "Scene full warmup skipped during cooldown." : undefined;
        recordWarmupTaskFinishedEvent(task, status);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        task.status = "failed";
        task.errorMessage = error instanceof Error ? error.message : "Scene audio warmup failed.";
        recordWarmupTaskFinishedEvent(task, "failed");
      })
      .finally(() => {
        taskAbortControllers.delete(task.key);
        activeTaskCount = Math.max(0, activeTaskCount - 1);
        pruneFinishedWarmupTasks();
        pumpSceneAudioWarmupQueue();
      });
  }
};

const enqueueSceneAudioWarmupTask = (
  taskPayload: SceneAudioWarmupTaskPayload,
  key: string,
  options?: {
    priority?: SceneAudioWarmupTaskPriority;
    source?: SceneAudioWarmupTaskSource;
  },
) => {
  const priority = options?.priority ?? "idle-warm";
  const source = options?.source ?? "initial";
  if (source !== "user-click") {
    markAudioWarmed(key, source as WarmupSource);
  }
  const existing = sceneAudioWarmupTasks.get(key);

  if (existing) {
    if (shouldPromotePriority(existing.priority, priority)) {
      const previousPriority = existing.priority;
      existing.priority = priority;
      existing.source = source;
      recordClientEvent("warmup_task_promoted", {
        sceneSlug: getTaskSceneSlug(existing),
        kind: existing.kind,
        previousPriority,
        nextPriority: priority,
        source,
      });
    }
    if (existing.status === "failed" || existing.status === "skipped") {
      const previousStatus = existing.status;
      existing.status = "queued";
      existing.errorMessage = undefined;
      existing.sequence = sequence;
      sequence += 1;
      recordClientEvent("warmup_task_reset", {
        sceneSlug: getTaskSceneSlug(existing),
        kind: existing.kind,
        previousStatus,
        priority: existing.priority,
        source: existing.source,
      });
      pumpSceneAudioWarmupQueue();
    }
    return key;
  }

  sceneAudioWarmupTasks.set(key, {
    ...taskPayload,
    key,
    status: "queued",
    priority,
    source,
    sequence,
  });
  sequence += 1;
  pumpSceneAudioWarmupQueue();
  return key;
};

export const enqueueSceneSentenceWarmup = (
  payload: SceneSentenceWarmupPayload,
  options?: {
    priority?: SceneAudioWarmupTaskPriority;
    source?: SceneAudioWarmupTaskSource;
  },
) =>
  enqueueSceneAudioWarmupTask(
    { kind: "sentence", payload },
    buildSceneSentenceWarmupTaskKey(payload),
    options,
  );

export const enqueueSceneFullWarmup = (
  payload: SceneFullWarmupPayload,
  options?: {
    priority?: SceneAudioWarmupTaskPriority;
    source?: SceneAudioWarmupTaskSource;
  },
) =>
  enqueueSceneAudioWarmupTask(
    { kind: "scene_full", payload },
    buildSceneFullWarmupTaskKey(payload),
    options,
  );

export const promoteSceneAudioWarmupTask = (
  key: string,
  priority: SceneAudioWarmupTaskPriority,
) => {
  const task = sceneAudioWarmupTasks.get(key);
  if (!task) return false;
  if (shouldPromotePriority(task.priority, priority)) {
    task.priority = priority;
    pumpSceneAudioWarmupQueue();
  }
  return true;
};

export const cancelWarmupsBySceneSlug = (sceneSlug: string) => {
  const target = sceneSlug.trim();
  if (!target) return 0;
  let cancelled = 0;
  for (const [key, task] of sceneAudioWarmupTasks) {
    if (task.payload.sceneSlug !== target) continue;
    if (task.status === "queued") {
      task.status = "skipped";
      task.errorMessage = "Cancelled because scene navigated away.";
      recordClientEvent("warmup_task_cancelled", {
        sceneSlug: target,
        kind: task.kind,
        previousStatus: "queued",
        priority: task.priority,
        source: task.source,
      });
      cancelled += 1;
      continue;
    }
    if (task.status === "loading") {
      const controller = taskAbortControllers.get(key);
      if (controller) {
        controller.abort();
      }
      task.status = "skipped";
      task.errorMessage = "Cancelled because scene navigated away.";
      recordClientEvent("warmup_task_cancelled", {
        sceneSlug: target,
        kind: task.kind,
        previousStatus: "loading",
        priority: task.priority,
        source: task.source,
      });
      cancelled += 1;
    }
  }
  if (cancelled > 0) {
    pruneFinishedWarmupTasks();
    pumpSceneAudioWarmupQueue();
  }
  return cancelled;
};

export const listSceneAudioWarmupTasks = () =>
  Array.from(sceneAudioWarmupTasks.values())
    .sort((left, right) => left.sequence - right.sequence)
    .map(cloneTask);

export const resetSceneAudioWarmupSchedulerForTests = () => {
  for (const controller of taskAbortControllers.values()) {
    controller.abort();
  }
  taskAbortControllers.clear();
  sceneAudioWarmupTasks.clear();
  activeTaskCount = 0;
  sequence = 0;
};
