import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";

import type { Lesson } from "@/lib/types";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const lessonWarmupCalls: Array<{
  lesson: Lesson;
  options?: { sentenceLimit?: number; chunkLimit?: number; includeSceneFull?: boolean };
}> = [];
const chunkWarmupCalls: Array<{ chunkTexts: string[]; limit: number }> = [];
const idleSentenceWarmupCalls: Array<{
  lesson: Lesson;
  options?: { startIndex?: number; batchSize?: number };
}> = [];
let playbackStatus: "idle" | "loading" | "playing" = "idle";
let idleWarmupDone = false;

const mockedModules = {
  "@/lib/utils/audio-warmup": {
    warmupLessonAudio: (
      lesson: Lesson,
      options?: { sentenceLimit?: number; chunkLimit?: number; includeSceneFull?: boolean },
    ) => {
      lessonWarmupCalls.push({ lesson, options });
    },
    warmupChunkTextsAudio: (chunkTexts: string[], limit = 2) => {
      chunkWarmupCalls.push({ chunkTexts, limit });
    },
    enqueueLessonIdleSentenceWarmups: (
      lesson: Lesson,
      options?: { startIndex?: number; batchSize?: number },
    ) => {
      idleSentenceWarmupCalls.push({ lesson, options });
      return {
        enqueuedCount: options?.batchSize ?? 2,
        nextIndex: (options?.startIndex ?? 0) + (options?.batchSize ?? 2),
        total: 6,
        done: idleWarmupDone,
      };
    },
  },
  "@/lib/utils/tts-api": {
    getTtsPlaybackState: () => ({
      kind: null,
      status: playbackStatus,
    }),
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

let resourceActionsModule: typeof import("./resource-actions") | null = null;

const lesson: Lesson = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  difficulty: "Beginner",
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue",
  sections: [],
  explanations: [],
};

const getResourceActions = () => {
  if (!resourceActionsModule) {
    const modulePath = localRequire.resolve("./resource-actions");
    delete localRequire.cache[modulePath];
    resourceActionsModule = localRequire("./resource-actions") as typeof import("./resource-actions");
  }
  return resourceActionsModule;
};

const setupWindow = () => {
  const idleCallbacks: Array<() => void> = [];
  const timeoutCallbacks: Array<() => void> = [];
  const windowListeners = new Map<string, Array<() => void>>();
  let visibilityState: DocumentVisibilityState = "visible";
  let connection: { effectiveType?: string; saveData?: boolean } | undefined;

  Object.defineProperty(globalThis, "window", {
    value: {
      requestIdleCallback: ((callback: () => void) => {
        idleCallbacks.push(callback);
        return idleCallbacks.length;
      }) as unknown as (typeof globalThis & Window)["requestIdleCallback"],
      cancelIdleCallback: (() => undefined) as unknown as (typeof globalThis & Window)["cancelIdleCallback"],
      setTimeout: ((callback: () => void) => {
        timeoutCallbacks.push(callback);
        return timeoutCallbacks.length;
      }) as unknown as typeof window.setTimeout,
      clearTimeout: (() => undefined) as unknown as typeof window.clearTimeout,
      addEventListener: ((type: string, listener: () => void) => {
        windowListeners.set(type, [...(windowListeners.get(type) ?? []), listener]);
      }) as unknown as typeof window.addEventListener,
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: {
      get connection() {
        return connection;
      },
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: {
      get visibilityState() {
        return visibilityState;
      },
    },
    configurable: true,
  });

  return {
    runNextIdle() {
      const callback = idleCallbacks.shift();
      callback?.();
    },
    runNextTimer() {
      const callback = timeoutCallbacks.shift();
      callback?.();
    },
    setConnection(next: { effectiveType?: string; saveData?: boolean } | undefined) {
      connection = next;
    },
    setHidden(hidden: boolean) {
      visibilityState = hidden ? "hidden" : "visible";
    },
    dispatchWindowEvent(type: string) {
      for (const listener of windowListeners.get(type) ?? []) {
        listener();
      }
    },
  };
};

afterEach(() => {
  lessonWarmupCalls.length = 0;
  chunkWarmupCalls.length = 0;
  idleSentenceWarmupCalls.length = 0;
  resourceActionsModule = null;
  playbackStatus = "idle";
  idleWarmupDone = false;
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "navigator");
  Reflect.deleteProperty(globalThis, "document");
});

test("buildLessonAudioWarmupKey 会为等价 lesson 级预热生成同一个 key", () => {
  const { buildLessonAudioWarmupKey } = getResourceActions();

  const first = buildLessonAudioWarmupKey(lesson, {
    sentenceLimit: 2,
    chunkLimit: 2,
    includeSceneFull: true,
  });
  const second = buildLessonAudioWarmupKey(
    { id: "scene-1", slug: "scene-1" },
    {
      sentenceLimit: 2,
      chunkLimit: 2,
      includeSceneFull: true,
    },
  );
  const third = buildLessonAudioWarmupKey(lesson, {
    sentenceLimit: 2,
    chunkLimit: 2,
    includeSceneFull: false,
  });

  assert.equal(first, second);
  assert.notEqual(first, third);
});

test("scheduleLessonAudioWarmup 会对同一 lesson 级预热去重", () => {
  const idle = setupWindow();
  const { scheduleLessonAudioWarmup } = getResourceActions();

  const first = scheduleLessonAudioWarmup(lesson, {
    sentenceLimit: 2,
    chunkLimit: 2,
    includeSceneFull: true,
  });
  const second = scheduleLessonAudioWarmup(lesson, {
    sentenceLimit: 2,
    chunkLimit: 2,
    includeSceneFull: true,
  });

  assert.equal(first, true);
  assert.equal(second, false);
  idle.runNextIdle();
  assert.equal(lessonWarmupCalls.length, 1);
  assert.deepEqual(lessonWarmupCalls[0]?.options, {
    sentenceLimit: 2,
    chunkLimit: 2,
    includeSceneFull: true,
  });
});

test("scheduleChunkAudioWarmup 会按归一化后的 chunk key 去重", () => {
  const idle = setupWindow();
  const { scheduleChunkAudioWarmup } = getResourceActions();

  const first = scheduleChunkAudioWarmup([" Hang in there ", "Call it a day"], { limit: 2 });
  const second = scheduleChunkAudioWarmup(["hang in there", "call it a day"], { limit: 2 });

  assert.equal(first, true);
  assert.equal(second, false);
  idle.runNextIdle();
  assert.equal(chunkWarmupCalls.length, 1);
  assert.deepEqual(chunkWarmupCalls[0], {
    chunkTexts: [" Hang in there ", "Call it a day"],
    limit: 2,
  });
});

test("scheduleSceneIdleAudioWarmup 会在页面稳定后小批量入队后续句子", () => {
  const idle = setupWindow();
  const { scheduleSceneIdleAudioWarmup } = getResourceActions();
  idleWarmupDone = true;

  const key = scheduleSceneIdleAudioWarmup(lesson, {
    initialDelayMs: 1000,
    initialSentenceOffset: 2,
    batchSize: 2,
  });

  assert.equal(typeof key, "string");
  idle.runNextTimer();
  idle.runNextTimer();
  idle.runNextIdle();

  assert.equal(idleSentenceWarmupCalls.length, 1);
  assert.deepEqual(idleSentenceWarmupCalls[0]?.options, {
    startIndex: 2,
    batchSize: 2,
  });
});

test("scheduleSceneIdleAudioWarmup 在页面 hidden 或播放 loading 时暂停低优先级预热", () => {
  const idle = setupWindow();
  const { scheduleSceneIdleAudioWarmup } = getResourceActions();
  idleWarmupDone = true;

  scheduleSceneIdleAudioWarmup(lesson, {
    initialDelayMs: 1000,
    initialSentenceOffset: 2,
    batchSize: 2,
  });

  idle.setHidden(true);
  idle.runNextTimer();
  idle.runNextTimer();
  idle.runNextIdle();
  assert.equal(idleSentenceWarmupCalls.length, 0);

  idle.setHidden(false);
  playbackStatus = "loading";
  idle.runNextTimer();
  idle.runNextIdle();
  assert.equal(idleSentenceWarmupCalls.length, 0);

  playbackStatus = "idle";
  idle.runNextTimer();
  idle.runNextIdle();
  assert.equal(idleSentenceWarmupCalls.length, 1);
});

test("scheduleSceneIdleAudioWarmup 在普通播放中不暂停低优先级预热", () => {
  const idle = setupWindow();
  const { scheduleSceneIdleAudioWarmup } = getResourceActions();
  idleWarmupDone = true;
  playbackStatus = "playing";

  scheduleSceneIdleAudioWarmup(lesson, {
    initialDelayMs: 1000,
    initialSentenceOffset: 2,
    batchSize: 2,
  });

  idle.runNextTimer();
  idle.runNextTimer();
  idle.runNextIdle();

  assert.equal(idleSentenceWarmupCalls.length, 1);
});

test("scheduleSceneIdleAudioWarmup 在近期高频交互后暂停一轮低优先级预热", () => {
  const idle = setupWindow();
  const { scheduleSceneIdleAudioWarmup } = getResourceActions();
  idleWarmupDone = true;

  scheduleSceneIdleAudioWarmup(lesson, {
    initialDelayMs: 1000,
    initialSentenceOffset: 2,
    batchSize: 2,
    interactionQuietWindowMs: 1000,
  });

  idle.dispatchWindowEvent("scroll");
  idle.runNextTimer();
  idle.runNextTimer();
  idle.runNextIdle();

  assert.equal(idleSentenceWarmupCalls.length, 0);
});

test("scheduleSceneIdleAudioWarmup 在 save-data 场景下不启动", () => {
  const idle = setupWindow();
  const { scheduleSceneIdleAudioWarmup } = getResourceActions();
  idle.setConnection({ saveData: true });

  const result = scheduleSceneIdleAudioWarmup(lesson);

  assert.equal(result, false);
  assert.equal(idleSentenceWarmupCalls.length, 0);
});
