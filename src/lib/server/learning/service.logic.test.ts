import assert from "node:assert/strict";
import test from "node:test";

import { evaluateSceneSessionDone } from "./service";

test("evaluateSceneSessionDone 不会再把仅进入句子练习近似当成完成条件", () => {
  assert.equal(
    evaluateSceneSessionDone({
      full_play_count: 1,
      opened_expression_count: 1,
      completed_sentence_count: 0,
      scene_practice_completed: true,
    }),
    false,
  );
});

test("evaluateSceneSessionDone 只有在句子完成和场景练习完成都满足后才判定 done", () => {
  assert.equal(
    evaluateSceneSessionDone({
      full_play_count: 1,
      opened_expression_count: 1,
      completed_sentence_count: 1,
      scene_practice_completed: true,
    }),
    true,
  );
});
