import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const ensureSentenceAudioCalls: Array<Record<string, unknown>> = [];
const ensureSceneFullAudioCalls: Array<Record<string, unknown>> = [];
const pendingResolvers: Array<() => void> = [];
let failNextSentenceRequest = false;
let sceneFullCoolingDown = false;

const waitForQueueTurn = () => new Promise((resolve) => setTimeout(resolve, 0));

const createPendingPromise = () =>
  new Promise<void>((resolve) => {
    pendingResolvers.push(resolve);
  });

const mockedModules = {
  "@/lib/utils/tts-api": {
    ensureSentenceAudio: async (payload: Record<string, unknown>) => {
      ensureSentenceAudioCalls.push(payload);
      if (failNextSentenceRequest) {
        failNextSentenceRequest = false;
        throw new Error("sentence failed");
      }
      if (String(payload.text).startsWith("hold")) {
        await createPendingPromise();
      }
      return `sentence-url:${String(payload.sentenceId)}`;
    },
    ensureSceneFullAudio: async (payload: Record<string, unknown>) => {
      ensureSceneFullAudioCalls.push(payload);
      return `scene-url:${String(payload.sceneSlug)}`;
    },
    getSceneFullAudioCooldown: () =>
      sceneFullCoolingDown
        ? {
            failureReason: "provider_error",
            failedAt: Date.now(),
            remainingMs: 45_000,
          }
        : null,
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

const loadScheduler = () => {
  const modulePath = localRequire.resolve("./scene-audio-warmup-scheduler");
  delete localRequire.cache[modulePath];
  return localRequire("./scene-audio-warmup-scheduler") as typeof import("./scene-audio-warmup-scheduler");
};

afterEach(() => {
  const scheduler = loadScheduler();
  scheduler.resetSceneAudioWarmupSchedulerForTests();
  for (const resolve of pendingResolvers.splice(0)) resolve();
  ensureSentenceAudioCalls.length = 0;
  ensureSceneFullAudioCalls.length = 0;
  failNextSentenceRequest = false;
  sceneFullCoolingDown = false;
});

test("同一 sentence 任务重复入队只会执行一次", async () => {
  const scheduler = loadScheduler();

  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-a",
    sentenceId: "s-1",
    text: "Hello there.",
    speaker: "A",
    mode: "normal",
  });
  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-a",
    sentenceId: "s-1",
    text: "Hello there.",
    speaker: "A",
    mode: "normal",
  });

  await waitForQueueTurn();
  await waitForQueueTurn();

  assert.equal(ensureSentenceAudioCalls.length, 1);
  assert.equal(scheduler.listSceneAudioWarmupTasks()[0]?.status, "loaded");
});

test("同一 scene full 任务重复入队只会执行一次", async () => {
  const scheduler = loadScheduler();
  const payload = {
    sceneSlug: "scene-a",
    sceneType: "dialogue" as const,
    segments: [
      { text: "Hello there.", speaker: "A" },
      { text: "Nice to meet you.", speaker: "B" },
    ],
  };

  scheduler.enqueueSceneFullWarmup(payload);
  scheduler.enqueueSceneFullWarmup(payload);

  await waitForQueueTurn();
  await waitForQueueTurn();

  assert.equal(ensureSceneFullAudioCalls.length, 1);
  assert.equal(scheduler.listSceneAudioWarmupTasks()[0]?.status, "loaded");
});

test("后入队高优先级任务可以提升已有任务优先级", async () => {
  const scheduler = loadScheduler();
  const key = scheduler.enqueueSceneSentenceWarmup(
    {
      sceneSlug: "scene-a",
      sentenceId: "s-1",
      text: "hold first",
    },
    { priority: "background", source: "initial" },
  );

  scheduler.enqueueSceneSentenceWarmup(
    {
      sceneSlug: "scene-a",
      sentenceId: "s-1",
      text: "hold first",
    },
    { priority: "immediate", source: "playback" },
  );

  const task = scheduler.listSceneAudioWarmupTasks().find((item) => item.key === key);
  assert.equal(task?.priority, "immediate");
  assert.equal(task?.source, "playback");

  for (const resolve of pendingResolvers.splice(0)) resolve();
  await waitForQueueTurn();
});

test("并发上限为 2 时第三个任务会等待前两个任务之一完成", async () => {
  const scheduler = loadScheduler();

  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-a",
    sentenceId: "s-1",
    text: "hold one",
  });
  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-a",
    sentenceId: "s-2",
    text: "hold two",
  });
  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-a",
    sentenceId: "s-3",
    text: "hold three",
  });

  await waitForQueueTurn();
  assert.equal(ensureSentenceAudioCalls.length, 2);
  assert.equal(
    scheduler.listSceneAudioWarmupTasks().filter((task) => task.status === "queued").length,
    1,
  );

  pendingResolvers.shift()?.();
  await waitForQueueTurn();
  await waitForQueueTurn();

  assert.equal(ensureSentenceAudioCalls.length, 3);

  for (const resolve of pendingResolvers.splice(0)) resolve();
  await waitForQueueTurn();
});

test("任务失败后会进入 failed 状态且不会向调用方抛出", async () => {
  const scheduler = loadScheduler();
  failNextSentenceRequest = true;

  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-a",
    sentenceId: "s-1",
    text: "fail me",
  });

  await waitForQueueTurn();
  await waitForQueueTurn();

  const task = scheduler.listSceneAudioWarmupTasks()[0];
  assert.equal(task?.status, "failed");
  assert.equal(task?.errorMessage, "sentence failed");
});

test("已 loaded 的任务再次提权时不会重复请求", async () => {
  const scheduler = loadScheduler();
  const payload = {
    sceneSlug: "scene-a",
    sentenceId: "s-1",
    text: "Hello there.",
  };

  scheduler.enqueueSceneSentenceWarmup(payload, { priority: "idle-warm", source: "idle" });
  await waitForQueueTurn();
  await waitForQueueTurn();
  scheduler.enqueueSceneSentenceWarmup(payload, { priority: "next-up", source: "playback" });
  await waitForQueueTurn();

  assert.equal(ensureSentenceAudioCalls.length, 1);
  assert.equal(scheduler.listSceneAudioWarmupTasks()[0]?.status, "loaded");
});

test("scene full 预热命中冷却时会跳过网络请求，后续可重新入队", async () => {
  const scheduler = loadScheduler();
  const payload = {
    sceneSlug: "scene-a",
    sceneType: "dialogue" as const,
    segments: [{ text: "Hello there.", speaker: "A" }],
  };

  sceneFullCoolingDown = true;
  scheduler.enqueueSceneFullWarmup(payload);
  await waitForQueueTurn();
  await waitForQueueTurn();

  let task = scheduler.listSceneAudioWarmupTasks()[0];
  assert.equal(ensureSceneFullAudioCalls.length, 0);
  assert.equal(task?.status, "skipped");
  assert.equal(task?.errorMessage, "Scene full warmup skipped during cooldown.");

  sceneFullCoolingDown = false;
  scheduler.enqueueSceneFullWarmup(payload, { priority: "next-up", source: "playback" });
  await waitForQueueTurn();
  await waitForQueueTurn();

  task = scheduler.listSceneAudioWarmupTasks()[0];
  assert.equal(ensureSceneFullAudioCalls.length, 1);
  assert.equal(task?.status, "loaded");
  assert.equal(task?.errorMessage, undefined);
});
