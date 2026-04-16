import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { toast } from "sonner";
import { notifySceneSessionCompleted } from "./scene-detail-notify";

const originalToastSuccess = toast.success;
const successCalls: Array<{ message?: string; description?: string }> = [];

afterEach(() => {
  toast.success = originalToastSuccess;
  successCalls.length = 0;
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
