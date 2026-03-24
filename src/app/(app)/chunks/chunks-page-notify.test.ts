import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { after } from "node:test";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const calls: Array<{ type: "success" | "error" | "message"; value: string }> = [];

const mockedModules = {
  sonner: {
    toast: {
      success: (value: string) => {
        calls.push({ type: "success", value });
      },
      error: (value: string) => {
        calls.push({ type: "error", value });
      },
      message: (value: string) => {
        calls.push({ type: "message", value });
      },
    },
  },
};

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

after(() => {
  nodeModule.Module.prototype.require = originalRequire;
});

const notify = localRequire("./chunks-page-notify.ts") as typeof import("./chunks-page-notify");

test("chunks notify 会把高频提示统一发到对应 toast 通道", () => {
  calls.length = 0;

  notify.notifyChunksReviewStarted();
  notify.notifyChunksSentenceReviewPending();
  notify.notifyChunksMissingExpression();
  notify.notifyChunksActionSucceeded("已保存");
  notify.notifyChunksActionMessage("继续下一步");
  notify.notifyChunksLoadFailed(null);

  assert.deepEqual(calls, [
    { type: "success", value: "已开始复习这个表达" },
    { type: "message", value: "句子复习待开放" },
    { type: "error", value: "请输入表达文本" },
    { type: "success", value: "已保存" },
    { type: "message", value: "继续下一步" },
    { type: "error", value: "加载表达失败。" },
  ]);
});

test("chunks notify 会在有具体错误时优先使用外部错误文本", () => {
  calls.length = 0;

  notify.notifyChunksRetryEnrichmentFailed("自定义补全失败");
  notify.notifyChunksRegenerateAudioFailed("音频生成失败");
  notify.notifyChunksSpeechUnsupported("浏览器不支持");

  assert.deepEqual(calls, [
    { type: "error", value: "自定义补全失败" },
    { type: "error", value: "音频生成失败" },
    { type: "error", value: "浏览器不支持" },
  ]);
});
