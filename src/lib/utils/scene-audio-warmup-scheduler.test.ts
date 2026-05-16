import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const ensureSentenceAudioCalls: Array<Record<string, unknown>> = [];
const ensureSceneFullAudioCalls: Array<Record<string, unknown>> = [];
const markAudioWarmedCalls: Array<{ cacheKey: string; source: string }> = [];
const recordedClientEvents: Array<{ name: string; payload: Record<string, unknown> }> = [];
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
    buildSentenceTtsCacheKey: (payload: Record<string, unknown>) =>
      `sentence:${String(payload.sceneSlug)}:${String(payload.sentenceId)}`,
    buildSceneFullTtsCacheKey: (payload: Record<string, unknown>) =>
      `scene:${String(payload.sceneSlug)}`,
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
  "@/lib/utils/tts-warmup-registry": {
    markAudioWarmed: (cacheKey: string, source: string) => {
      markAudioWarmedCalls.push({ cacheKey, source });
    },
  },
  "@/lib/utils/client-events": {
    recordClientEvent: (name: string, payload: Record<string, unknown> = {}) => {
      recordedClientEvents.push({ name, payload });
    },
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
  markAudioWarmedCalls.length = 0;
  recordedClientEvents.length = 0;
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
  assert.deepEqual(markAudioWarmedCalls[0], {
    cacheKey: "sentence:scene-a:s-1",
    source: "initial",
  });
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

test("任务加载成功时发出 warmup_task_finished 事件，附 status/kind/sceneSlug/source/durationMs", async () => {
  const scheduler = loadScheduler();

  scheduler.enqueueSceneSentenceWarmup(
    {
      sceneSlug: "scene-evt-success",
      sentenceId: "s-1",
      text: "Observability check.",
      speaker: "A",
      mode: "normal",
    },
    { priority: "next-up", source: "playback" },
  );

  await waitForQueueTurn();
  await waitForQueueTurn();

  const finished = recordedClientEvents.filter((evt) => evt.name === "warmup_task_finished");
  assert.equal(finished.length, 1);
  const payload = finished[0].payload;
  assert.equal(payload.status, "loaded");
  assert.equal(payload.kind, "sentence");
  assert.equal(payload.sceneSlug, "scene-evt-success");
  assert.equal(payload.priority, "next-up");
  assert.equal(payload.source, "playback");
  assert.equal(typeof payload.durationMs, "number");
  assert.ok((payload.durationMs as number) >= 0);
});

test("任务失败时 warmup_task_finished 事件 status=failed 并附 errorMessage", async () => {
  const scheduler = loadScheduler();
  failNextSentenceRequest = true;

  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-evt-fail",
    sentenceId: "s-1",
    text: "fail me",
  });

  await waitForQueueTurn();
  await waitForQueueTurn();

  const finished = recordedClientEvents.filter((evt) => evt.name === "warmup_task_finished");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].payload.status, "failed");
  assert.equal(finished[0].payload.kind, "sentence");
  assert.equal(finished[0].payload.errorMessage, "sentence failed");
});

test("scene_full 命中冷却被跳过时发 warmup_task_finished status=skipped", async () => {
  const scheduler = loadScheduler();
  const payload = {
    sceneSlug: "scene-evt-skip",
    sceneType: "monologue" as const,
    segments: [{ text: "Cooling content." }],
  };

  sceneFullCoolingDown = true;
  scheduler.enqueueSceneFullWarmup(payload);
  await waitForQueueTurn();
  await waitForQueueTurn();

  const finished = recordedClientEvents.filter((evt) => evt.name === "warmup_task_finished");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].payload.status, "skipped");
  assert.equal(finished[0].payload.kind, "scene_full");
  assert.equal(finished[0].payload.sceneSlug, "scene-evt-skip");
});

test("已存在任务被高优先级再入队时发 warmup_task_promoted", async () => {
  const scheduler = loadScheduler();
  scheduler.enqueueSceneSentenceWarmup(
    {
      sceneSlug: "scene-evt-promote",
      sentenceId: "s-1",
      text: "hold first",
    },
    { priority: "background", source: "initial" },
  );

  // 第二次同 key 入队，优先级提升
  scheduler.enqueueSceneSentenceWarmup(
    {
      sceneSlug: "scene-evt-promote",
      sentenceId: "s-1",
      text: "hold first",
    },
    { priority: "immediate", source: "playback" },
  );

  const promoted = recordedClientEvents.filter((evt) => evt.name === "warmup_task_promoted");
  assert.equal(promoted.length, 1);
  assert.equal(promoted[0].payload.sceneSlug, "scene-evt-promote");
  assert.equal(promoted[0].payload.previousPriority, "background");
  assert.equal(promoted[0].payload.nextPriority, "immediate");
  assert.equal(promoted[0].payload.source, "playback");

  for (const resolve of pendingResolvers.splice(0)) resolve();
  await waitForQueueTurn();
});

test("失败任务再入队 reset 为 queued 时发 warmup_task_reset", async () => {
  const scheduler = loadScheduler();
  failNextSentenceRequest = true;

  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-evt-reset",
    sentenceId: "s-1",
    text: "fail me",
  });

  await waitForQueueTurn();
  await waitForQueueTurn();

  // 同 key 重新入队（已是 failed → 触发 reset）
  scheduler.enqueueSceneSentenceWarmup(
    {
      sceneSlug: "scene-evt-reset",
      sentenceId: "s-1",
      text: "fail me",
    },
    { priority: "next-up", source: "playback" },
  );

  const resetEvents = recordedClientEvents.filter((evt) => evt.name === "warmup_task_reset");
  assert.equal(resetEvents.length, 1);
  assert.equal(resetEvents[0].payload.previousStatus, "failed");
  assert.equal(resetEvents[0].payload.kind, "sentence");
  assert.equal(resetEvents[0].payload.sceneSlug, "scene-evt-reset");

  await waitForQueueTurn();
  await waitForQueueTurn();
});

test("cancelWarmupsBySceneSlug：queued 任务标 skipped 不再执行；loading 任务收到 abort", async () => {
  const scheduler = loadScheduler();

  // 入队 3 个 sentence，前 2 个 hold（占满 concurrency=2 进入 loading），第 3 个 queued
  const holdPayloadOne = {
    sceneSlug: "scene-cancel",
    sentenceId: "s-loading-1",
    text: "hold first",
  };
  const holdPayloadTwo = {
    sceneSlug: "scene-cancel",
    sentenceId: "s-loading-2",
    text: "hold second",
  };
  const queuedPayload = {
    sceneSlug: "scene-cancel",
    sentenceId: "s-queued",
    text: "do not run",
  };

  scheduler.enqueueSceneSentenceWarmup(holdPayloadOne);
  scheduler.enqueueSceneSentenceWarmup(holdPayloadTwo);
  scheduler.enqueueSceneSentenceWarmup(queuedPayload);

  await waitForQueueTurn();

  const beforeCancel = scheduler.listSceneAudioWarmupTasks();
  assert.equal(beforeCancel.filter((task) => task.status === "loading").length, 2);
  assert.equal(beforeCancel.filter((task) => task.status === "queued").length, 1);

  // 验证 ensureSentenceAudio 被调到的两次都收到 signal
  for (const call of ensureSentenceAudioCalls) {
    assert.ok(call.signal instanceof AbortSignal, "loading task should pass AbortSignal");
    assert.equal((call.signal as AbortSignal).aborted, false);
  }

  const cancelled = scheduler.cancelWarmupsBySceneSlug("scene-cancel");
  assert.equal(cancelled, 3);

  // loading task 的 signal 应被 aborted
  for (const call of ensureSentenceAudioCalls) {
    assert.equal((call.signal as AbortSignal).aborted, true);
  }

  const afterCancel = scheduler.listSceneAudioWarmupTasks();
  for (const task of afterCancel) {
    assert.equal(task.status, "skipped");
    assert.equal(task.errorMessage, "Cancelled because scene navigated away.");
  }

  // 等 hold 的 promise 收尾：abort 后 status 不应再被覆盖
  for (const resolve of pendingResolvers.splice(0)) resolve();
  await waitForQueueTurn();
  await waitForQueueTurn();

  // queued 任务从未进入 loading（fetch 调用还是 2 次）
  assert.equal(ensureSentenceAudioCalls.length, 2);

  // 应记录 3 条 warmup_task_cancelled 事件
  const cancelledEvents = recordedClientEvents.filter(
    (evt) => evt.name === "warmup_task_cancelled",
  );
  assert.equal(cancelledEvents.length, 3);
  const previousStatuses = cancelledEvents.map((evt) => evt.payload.previousStatus).sort();
  assert.deepEqual(previousStatuses, ["loading", "loading", "queued"]);
});

test("cancelWarmupsBySceneSlug 只影响目标 sceneSlug，其它 scene 任务保持运行", async () => {
  const scheduler = loadScheduler();

  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-keep",
    sentenceId: "s-1",
    text: "hold keep",
  });
  scheduler.enqueueSceneSentenceWarmup({
    sceneSlug: "scene-drop",
    sentenceId: "s-2",
    text: "hold drop",
  });

  await waitForQueueTurn();
  const cancelled = scheduler.cancelWarmupsBySceneSlug("scene-drop");
  assert.equal(cancelled, 1);

  const tasks = scheduler.listSceneAudioWarmupTasks();
  const keep = tasks.find((task) => task.payload.sceneSlug === "scene-keep");
  const drop = tasks.find((task) => task.payload.sceneSlug === "scene-drop");
  assert.equal(keep?.status, "loading");
  assert.equal(drop?.status, "skipped");

  for (const resolve of pendingResolvers.splice(0)) resolve();
  await waitForQueueTurn();
  await waitForQueueTurn();
});

