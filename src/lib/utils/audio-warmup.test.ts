import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const prefetchChunkAudioCalls: Array<Record<string, unknown>> = [];
const enqueueSceneSentenceWarmupCalls: Array<{
  payload: Record<string, unknown>;
  options?: Record<string, unknown>;
}> = [];
const enqueueSceneFullWarmupCalls: Array<{
  payload: Record<string, unknown>;
  options?: Record<string, unknown>;
}> = [];

const mockedModules = {
  "@/lib/utils/tts-api": {
    prefetchChunkAudio: async (payload: Record<string, unknown>) => {
      prefetchChunkAudioCalls.push(payload);
    },
  },
  "@/lib/utils/scene-audio-warmup-scheduler": {
    enqueueSceneSentenceWarmup: (
      payload: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => {
      enqueueSceneSentenceWarmupCalls.push({ payload, options });
      return `sentence:${String(payload.sceneSlug)}:${String(payload.sentenceId)}`;
    },
    enqueueSceneFullWarmup: (
      payload: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => {
      enqueueSceneFullWarmupCalls.push({ payload, options });
      return `scene:${String(payload.sceneSlug)}`;
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

let warmupLessonAudio: typeof import("./audio-warmup").warmupLessonAudio;
let enqueueLessonIdleSentenceWarmups: typeof import("./audio-warmup").enqueueLessonIdleSentenceWarmups;
let promoteLessonPlaybackAudioWarmups: typeof import("./audio-warmup").promoteLessonPlaybackAudioWarmups;

const getAudioWarmupModule = () => {
  if (!warmupLessonAudio) {
    const modulePath = localRequire.resolve("./audio-warmup");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./audio-warmup") as typeof import("./audio-warmup");
    warmupLessonAudio = imported.warmupLessonAudio;
    enqueueLessonIdleSentenceWarmups = imported.enqueueLessonIdleSentenceWarmups;
    promoteLessonPlaybackAudioWarmups = imported.promoteLessonPlaybackAudioWarmups;
  }
  return { warmupLessonAudio, enqueueLessonIdleSentenceWarmups, promoteLessonPlaybackAudioWarmups };
};

const buildLesson = () => ({
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  difficulty: "Beginner" as const,
  estimatedMinutes: 5,
  completionRate: 0,
  tags: [],
  sceneType: "dialogue" as const,
  sections: [
    {
      id: "section-1",
      blocks: [
        {
          id: "block-1",
          speaker: "A",
          sentences: [
            {
              id: "s-1",
              speaker: "A",
              text: "Hello there.",
              translation: "",
              chunks: ["hello there"],
              chunkDetails: [],
            },
            {
              id: "s-2",
              speaker: "B",
              text: "Nice to meet you.",
              translation: "",
              chunks: ["nice to meet you"],
              chunkDetails: [],
            },
            {
              id: "s-3",
              speaker: "A",
              text: "How is your day?",
              translation: "",
              chunks: [],
              chunkDetails: [],
            },
            {
              id: "s-4",
              speaker: "B",
              text: "Pretty good.",
              translation: "",
              chunks: [],
              chunkDetails: [],
            },
          ],
        },
      ],
    },
  ],
  explanations: [],
});

afterEach(() => {
  prefetchChunkAudioCalls.length = 0;
  enqueueSceneSentenceWarmupCalls.length = 0;
  enqueueSceneFullWarmupCalls.length = 0;
  warmupLessonAudio = undefined as unknown as typeof import("./audio-warmup").warmupLessonAudio;
  enqueueLessonIdleSentenceWarmups =
    undefined as unknown as typeof import("./audio-warmup").enqueueLessonIdleSentenceWarmups;
  promoteLessonPlaybackAudioWarmups =
    undefined as unknown as typeof import("./audio-warmup").promoteLessonPlaybackAudioWarmups;
});

test("warmupLessonAudio 会通过 scene 调度器预热首屏句子", () => {
  const { warmupLessonAudio: runWarmupLessonAudio } = getAudioWarmupModule();
  runWarmupLessonAudio(buildLesson(), {
    sentenceLimit: 2,
    chunkLimit: 1,
    includeSceneFull: false,
  });

  assert.equal(enqueueSceneSentenceWarmupCalls.length, 2);
  assert.deepEqual(enqueueSceneSentenceWarmupCalls[0], {
    payload: {
      sceneSlug: "scene-1",
      sentenceId: "s-1",
      text: "Hello there.",
      speaker: "A",
      mode: "normal",
    },
    options: {
      priority: "next-up",
      source: "initial",
    },
  });
  assert.equal(prefetchChunkAudioCalls.length, 1);
});

test("warmupLessonAudio 在 includeSceneFull 开启时会通过调度器预热整段场景音频", () => {
  const { warmupLessonAudio: runWarmupLessonAudio } = getAudioWarmupModule();
  runWarmupLessonAudio(buildLesson(), {
    sentenceLimit: 1,
    chunkLimit: 1,
    includeSceneFull: true,
  });

  assert.equal(enqueueSceneSentenceWarmupCalls.length, 1);
  assert.deepEqual(enqueueSceneFullWarmupCalls, [
    {
      payload: {
        sceneSlug: "scene-1",
        sceneType: "dialogue",
        segments: [
          {
            text: "Hello there.",
            speaker: "A",
          },
          {
            text: "Nice to meet you.",
            speaker: "B",
          },
          {
            text: "How is your day?",
            speaker: "A",
          },
          {
            text: "Pretty good.",
            speaker: "B",
          },
        ],
      },
      options: {
        priority: "background",
        source: "initial",
      },
    },
  ]);
});

test("warmupLessonAudio 在 includeSceneFull 关闭时不会入队整段场景音频", () => {
  const { warmupLessonAudio: runWarmupLessonAudio } = getAudioWarmupModule();
  runWarmupLessonAudio(buildLesson(), {
    includeSceneFull: false,
  });

  assert.equal(enqueueSceneFullWarmupCalls.length, 0);
});

test("enqueueLessonIdleSentenceWarmups 会从指定位置小批量入队后续句子", () => {
  const { enqueueLessonIdleSentenceWarmups: enqueueIdleWarmups } = getAudioWarmupModule();

  const result = enqueueIdleWarmups(buildLesson(), {
    startIndex: 2,
    batchSize: 2,
  });

  assert.equal(result.enqueuedCount, 2);
  assert.equal(result.nextIndex, 4);
  assert.equal(result.done, true);
  assert.deepEqual(
    enqueueSceneSentenceWarmupCalls.map((call) => ({
      sentenceId: call.payload.sentenceId,
      priority: call.options?.priority,
      source: call.options?.source,
    })),
    [
      {
        sentenceId: "s-3",
        priority: "idle-warm",
        source: "idle",
      },
      {
        sentenceId: "s-4",
        priority: "idle-warm",
        source: "idle",
      },
    ],
  );
});

test("promoteLessonPlaybackAudioWarmups 会提升当前句之后三句并可选提升 scene full", () => {
  const { promoteLessonPlaybackAudioWarmups: promoteWarmups } = getAudioWarmupModule();

  const result = promoteWarmups(buildLesson(), "s-1", {
    includeSceneFull: true,
  });

  assert.deepEqual(result, {
    promotedSentenceCount: 3,
    promotedSceneFull: true,
  });
  assert.deepEqual(
    enqueueSceneSentenceWarmupCalls.map((call) => ({
      sentenceId: call.payload.sentenceId,
      priority: call.options?.priority,
      source: call.options?.source,
    })),
    [
      {
        sentenceId: "s-2",
        priority: "next-up",
        source: "playback",
      },
      {
        sentenceId: "s-3",
        priority: "next-up",
        source: "playback",
      },
      {
        sentenceId: "s-4",
        priority: "next-up",
        source: "playback",
      },
    ],
  );
  assert.equal(enqueueSceneFullWarmupCalls.length, 1);
  assert.equal(enqueueSceneFullWarmupCalls[0]?.options?.priority, "next-up");
  assert.equal(enqueueSceneFullWarmupCalls[0]?.options?.source, "playback");
});
