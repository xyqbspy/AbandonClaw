import assert from "node:assert/strict";
import test from "node:test";
import { regenerateChunkTtsAudioBatch } from "./service";

test("regenerateChunkTtsAudioBatch 使用有界并发执行批量任务", async () => {
  let activeCount = 0;
  let maxActiveCount = 0;

  await regenerateChunkTtsAudioBatch(
    [
      { text: "one", chunkKey: "one" },
      { text: "two", chunkKey: "two" },
      { text: "three", chunkKey: "three" },
      { text: "four", chunkKey: "four" },
    ],
    {
      concurrency: 2,
      removeLocalFile: async () => undefined,
      removeStorageFiles: async () => undefined,
      generateTtsAudio: async () => {
        activeCount += 1;
        maxActiveCount = Math.max(maxActiveCount, activeCount);
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeCount -= 1;
        return {
          url: "https://cdn.test/chunk.mp3",
          cached: false,
          source: "fresh-upload" as const,
        };
      },
    },
  );

  assert.equal(maxActiveCount, 2);
});

test("regenerateChunkTtsAudioBatch 会汇总失败项并在最后统一抛错", async () => {
  await assert.rejects(
    () =>
      regenerateChunkTtsAudioBatch(
        [
          { text: "one", chunkKey: "one" },
          { text: "two", chunkKey: "two" },
        ],
        {
          concurrency: 2,
          removeLocalFile: async () => undefined,
          removeStorageFiles: async () => undefined,
          generateTtsAudio: async ({ chunkKey }) => {
            if (chunkKey === "two") {
              throw new Error("mock tts failure");
            }
            return {
              url: "https://cdn.test/chunk.mp3",
              cached: false,
              source: "fresh-upload" as const,
            };
          },
        },
      ),
    /Failed to regenerate 1\/2 chunk audios/,
  );
});
