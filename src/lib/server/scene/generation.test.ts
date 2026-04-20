import assert from "node:assert/strict";
import test from "node:test";
import { generatedSceneContainsAnchorSentence } from "@/lib/server/scene/generation";

test("generatedSceneContainsAnchorSentence 能识别锚点句存在", () => {
  assert.equal(
    generatedSceneContainsAnchorSentence(
      "A: I don't care about that anymore. B: Then let's move on.",
      "I don't care",
    ),
    true,
  );
});

test("generatedSceneContainsAnchorSentence 在缺少锚点句时返回 false", () => {
  assert.equal(
    generatedSceneContainsAnchorSentence(
      "A: I'm done talking about this. B: Okay, let's stop.",
      "I don't care",
    ),
    false,
  );
});
