import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const prefetchSentenceAudioCalls: Array<Record<string, unknown>> = [];
const prefetchChunkAudioCalls: Array<Record<string, unknown>> = [];
const prefetchSceneFullAudioCalls: Array<Record<string, unknown>> = [];

const mockedModules = {
  "@/lib/utils/tts-api": {
    prefetchSentenceAudio: async (payload: Record<string, unknown>) => {
      prefetchSentenceAudioCalls.push(payload);
    },
    prefetchChunkAudio: async (payload: Record<string, unknown>) => {
      prefetchChunkAudioCalls.push(payload);
    },
    prefetchSceneFullAudio: async (payload: Record<string, unknown>) => {
      prefetchSceneFullAudioCalls.push(payload);
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

const getWarmupLessonAudio = () => {
  if (!warmupLessonAudio) {
    const modulePath = localRequire.resolve("./audio-warmup");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./audio-warmup") as typeof import("./audio-warmup");
    warmupLessonAudio = imported.warmupLessonAudio;
  }
  return warmupLessonAudio;
};

afterEach(() => {
  prefetchSentenceAudioCalls.length = 0;
  prefetchChunkAudioCalls.length = 0;
  prefetchSceneFullAudioCalls.length = 0;
  warmupLessonAudio = undefined as unknown as typeof import("./audio-warmup").warmupLessonAudio;
});

test("warmupLessonAudio 在 includeSceneFull 开启时会预热整段场景音频", () => {
  const runWarmupLessonAudio = getWarmupLessonAudio();
  runWarmupLessonAudio(
    {
      id: "scene-1",
      slug: "scene-1",
      title: "Scene 1",
      difficulty: "Beginner",
      estimatedMinutes: 5,
      completionRate: 0,
      tags: [],
      sceneType: "dialogue",
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
              ],
            },
          ],
        },
      ],
      explanations: [],
    },
    {
      sentenceLimit: 1,
      chunkLimit: 1,
      includeSceneFull: true,
    },
  );

  assert.equal(prefetchSentenceAudioCalls.length, 1);
  assert.equal(prefetchChunkAudioCalls.length, 1);
  assert.deepEqual(prefetchSceneFullAudioCalls, [
    {
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
      ],
    },
  ]);
});

test("warmupLessonAudio 在 includeSceneFull 关闭时不会预热整段场景音频", () => {
  const runWarmupLessonAudio = getWarmupLessonAudio();
  runWarmupLessonAudio(
    {
      id: "scene-2",
      slug: "scene-2",
      title: "Scene 2",
      difficulty: "Beginner",
      estimatedMinutes: 5,
      completionRate: 0,
      tags: [],
      sceneType: "monologue",
      sections: [
        {
          id: "section-1",
          blocks: [
            {
              id: "block-1",
              sentences: [
                {
                  id: "s-1",
                  text: "We should head out now.",
                  translation: "",
                  chunks: ["head out"],
                  chunkDetails: [],
                },
              ],
            },
          ],
        },
      ],
      explanations: [],
    },
    {
      includeSceneFull: false,
    },
  );

  assert.equal(prefetchSceneFullAudioCalls.length, 0);
});
