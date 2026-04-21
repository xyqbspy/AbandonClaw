import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { toast } from "sonner";
import {
  notifySceneMilestone,
  notifySceneSessionCompleted,
  resetSceneDetailToastDedupForTests,
} from "./scene-detail-notify";

const originalToastSuccess = toast.success;
const successCalls: Array<{ message?: string; description?: string }> = [];

afterEach(() => {
  toast.success = originalToastSuccess;
  successCalls.length = 0;
  resetSceneDetailToastDedupForTests();
});

test("notifySceneSessionCompleted 会附带当前学习结果摘要", () => {
  toast.success = ((message?: string, options?: { description?: string }) => {
    successCalls.push({ message: String(message), description: options?.description });
    return "";
  }) as typeof toast.success;

  notifySceneSessionCompleted({
    savedPhraseCount: 3,
    nextStepHint: "下一步可以直接打开变体训练。",
  });

  assert.equal(successCalls.length, 1);
  assert.equal(successCalls[0]?.description, "今天已沉淀 3 条表达。 下一步可以直接打开变体训练。");
});

test("notifySceneMilestone 同一里程碑在页面会话内只提示一次", () => {
  toast.success = ((message?: string) => {
    successCalls.push({ message: String(message) });
    return "";
  }) as typeof toast.success;

  notifySceneMilestone("practice_sentence", "Scene 1");
  notifySceneMilestone("practice_sentence", "Scene 1");
  notifySceneMilestone("practice_sentence", "Scene 1");

  assert.equal(successCalls.length, 1);
  assert.match(successCalls[0]?.message ?? "", /句子练习/);
});
