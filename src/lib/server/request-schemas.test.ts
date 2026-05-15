import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeGenerateScenePayload,
  normalizeSavePhraseBatchPayload,
  normalizeSavePhrasePayload,
} from "@/lib/server/request-schemas";

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

test("normalizeSavePhrasePayload 会保留 scene chunk 保存所需的来源字段", () => {
  const normalized = normalizeSavePhrasePayload({
    text: " call it a day ",
    translation: " 今天先到这里 ",
    usageNote: " 用于结束一段工作或练习。 ",
    sourceSceneSlug: " daily-greeting ",
    sourceType: "scene",
    sourceSentenceIndex: 0,
    sourceSentenceText: " Let's call it a day. ",
    sourceChunkText: " call it a day ",
  });

  assert.deepEqual(normalized, {
    text: "call it a day",
    learningItemType: "expression",
    sentenceText: undefined,
    translation: "今天先到这里",
    usageNote: "用于结束一段工作或练习。",
    difficulty: undefined,
    tags: [],
    sourceSceneSlug: "daily-greeting",
    sourceType: "scene",
    sourceNote: undefined,
    sourceSentenceIndex: 0,
    sourceSentenceText: "Let's call it a day.",
    sourceChunkText: "call it a day",
    expressionClusterId: undefined,
    relationSourceUserPhraseId: undefined,
    relationType: undefined,
  });
});

test("normalizeSavePhraseBatchPayload 会按表达文本去重，避免 save-all 重复保存同一 chunk", () => {
  const normalized = normalizeSavePhraseBatchPayload({
    items: [
      {
        text: "Call it a day",
        sourceSceneSlug: "daily-greeting",
        sourceType: "scene",
      },
      {
        text: " call   it a day ",
        sourceSceneSlug: "daily-greeting",
        sourceType: "scene",
      },
    ],
  });

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0]?.text, "Call it a day");
  assert.equal(normalized[0]?.sourceType, "scene");
  assert.equal(normalized[0]?.sourceSceneSlug, "daily-greeting");
});
