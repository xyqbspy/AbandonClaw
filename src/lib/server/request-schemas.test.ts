import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGenerateScenePayload } from "@/lib/server/request-schemas";

test("normalizeGenerateScenePayload 在未传 mode 时默认回落到 context", () => {
  const normalized = normalizeGenerateScenePayload({
    promptText: "practice ordering coffee",
  });

  assert.equal(normalized.mode, "context");
  assert.equal(normalized.promptText, "practice ordering coffee");
});

test("normalizeGenerateScenePayload 可以识别 anchor_sentence 模式", () => {
  const normalized = normalizeGenerateScenePayload({
    promptText: "I don't care",
    mode: "anchor_sentence",
    sentenceCount: 6,
  });

  assert.equal(normalized.mode, "anchor_sentence");
  assert.equal(normalized.promptText, "I don't care");
  assert.equal(normalized.sentenceCount, 6);
});
