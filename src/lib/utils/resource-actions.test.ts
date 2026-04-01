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
  Object.defineProperty(globalThis, "window", {
    value: {
      requestIdleCallback: ((callback: () => void) => {
        idleCallbacks.push(callback);
        return idleCallbacks.length;
      }) as unknown as (typeof globalThis & Window)["requestIdleCallback"],
      cancelIdleCallback: (() => undefined) as unknown as (typeof globalThis & Window)["cancelIdleCallback"],
      setTimeout,
      clearTimeout,
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: {},
    configurable: true,
  });
  return {
    runNextIdle() {
      const callback = idleCallbacks.shift();
      callback?.();
    },
  };
};

afterEach(() => {
  lessonWarmupCalls.length = 0;
  chunkWarmupCalls.length = 0;
  resourceActionsModule = null;
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "navigator");
});

test("buildLessonAudioWarmupKey 会为等价 lesson 级预热生成同一 key", () => {
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
