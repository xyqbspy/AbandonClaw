import assert from "node:assert/strict";
import test from "node:test";
import { buildSceneGenerateUserPrompt } from "@/lib/server/prompts/scene-generate-prompt";

test("buildSceneGenerateUserPrompt 在 anchor_sentence 模式下会写入锚点约束", () => {
  const prompt = buildSceneGenerateUserPrompt({
    promptText: "I don't care",
    mode: "anchor_sentence",
    sentenceCount: 6,
    preferredKnownChunks: [],
    relatedChunkVariants: [],
    reuseKnownChunks: false,
  });

  assert.match(prompt, /Generation mode:\s+anchor_sentence/);
  assert.match(prompt, /Anchor sentence:\s+I don't care/);
  assert.match(prompt, /must appear in the final dialogue text/i);
});

test("buildSceneGenerateUserPrompt 在 context 模式下仍按情境描述处理", () => {
  const prompt = buildSceneGenerateUserPrompt({
    promptText: "我想练礼貌拒绝加班",
    mode: "context",
    sentenceCount: 10,
    preferredKnownChunks: [],
    relatedChunkVariants: [],
    reuseKnownChunks: true,
  });

  assert.match(prompt, /Generation mode:\s+context/);
  assert.match(prompt, /User intent \(CN or EN\):/);
  assert.doesNotMatch(prompt, /Anchor sentence rules:/);
});
