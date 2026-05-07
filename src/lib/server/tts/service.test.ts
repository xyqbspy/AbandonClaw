import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@/lib/server/errors";
import { generateTtsAudio, regenerateChunkTtsAudioBatch } from "./service";

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
          source: "inline-fallback" as const,
        };
      },
    },
  );

  assert.equal(maxActiveCount, 2);
});

test("generateTtsAudio 会把 scene full 空 segments 标记为 segment_assembly_failed", async () => {
  await assert.rejects(
    () =>
      generateTtsAudio({
        kind: "scene_full",
        sceneSlug: "demo-scene",
        sceneType: "dialogue",
        segments: [],
      }),
    (error) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).details?.failureReason, "segment_assembly_failed");
      return true;
    },
  );
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
              source: "inline-fallback" as const,
            };
          },
        },
      ),
    /Failed to regenerate 1\/2 chunk audios/,
  );
});
