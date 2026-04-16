import {
  buildSceneFullAudioKey,
  buildSentenceAudioKey,
} from "@/lib/shared/tts";
import {
  ensureSceneFullAudio,
  ensureSentenceAudio,
} from "@/lib/utils/tts-api";

export type SceneAudioWarmupTaskKind = "sentence" | "scene_full";
export type SceneAudioWarmupTaskStatus = "queued" | "loading" | "loaded" | "failed";
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
};

export type SceneAudioWarmupTask = Omit<InternalSceneAudioWarmupTask, "sequence">;

const priorityRank: Record<SceneAudioWarmupTaskPriority, number> = {
  immediate: 0,
  "next-up": 1,
  "idle-warm": 2,
  background: 3,
};

const sceneAudioWarmupTasks = new Map<string, InternalSceneAudioWarmupTask>();
let activeTaskCount = 0;
let sequence = 0;
const maxConcurrentWarmupTasks = 2;

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
  const sentenceAudioKey = buildSentenceAudioKey({
    sentenceId: payload.sentenceId,
    text: payload.text,
    speaker: payload.speaker,
    mode: payload.mode ?? "normal",
  });
  return `sentence:${payload.sceneSlug}:${sentenceAudioKey}`;
};

export const buildSceneFullWarmupTaskKey = (payload: SceneFullWarmupPayload) => {
  const sceneType = payload.sceneType ?? "monologue";
  const sceneFullAudioKey = buildSceneFullAudioKey(payload.segments, sceneType);
  return `scene:${payload.sceneSlug}:${sceneFullAudioKey}`;
};

const shouldPromotePriority = (
  current: SceneAudioWarmupTaskPriority,
  next: SceneAudioWarmupTaskPriority,
) => priorityRank[next] < priorityRank[current];

const runTask = async (task: InternalSceneAudioWarmupTask) => {
  if (task.kind === "sentence") {
    await ensureSentenceAudio(task.payload);
    return;
  }
  await ensureSceneFullAudio(task.payload);
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

    void runTask(task)
      .then(() => {
        task.status = "loaded";
      })
      .catch((error: unknown) => {
        task.status = "failed";
        task.errorMessage = error instanceof Error ? error.message : "Scene audio warmup failed.";
      })
      .finally(() => {
        activeTaskCount = Math.max(0, activeTaskCount - 1);
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
  const existing = sceneAudioWarmupTasks.get(key);

  if (existing) {
    if (shouldPromotePriority(existing.priority, priority)) {
      existing.priority = priority;
      existing.source = source;
    }
    if (existing.status === "failed") {
      existing.status = "queued";
      existing.errorMessage = undefined;
      existing.sequence = sequence;
      sequence += 1;
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

export const listSceneAudioWarmupTasks = () =>
  Array.from(sceneAudioWarmupTasks.values())
    .sort((left, right) => left.sequence - right.sequence)
    .map(cloneTask);

export const resetSceneAudioWarmupSchedulerForTests = () => {
  sceneAudioWarmupTasks.clear();
  activeTaskCount = 0;
  sequence = 0;
};
