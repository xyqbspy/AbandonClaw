import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const localRequire = createRequire(import.meta.url);

const state = {
  success: [] as string[],
  error: [] as string[],
  message: [] as string[],
};

localRequire.cache[localRequire.resolve("sonner")] = {
  exports: {
    toast: {
      success(value: string) {
        state.success.push(value);
      },
      error(value: string) {
        state.error.push(value);
      },
      message(value: string) {
        state.message.push(value);
      },
    },
  },
};

const notify = localRequire("./chunks-focus-detail-notify.ts") as typeof import("./chunks-focus-detail-notify");
const { chunksPageMessages: zh } = localRequire("./chunks-page-messages.ts") as typeof import("./chunks-page-messages");

test("focus detail notify 会把详情动作路由到统一提示层", () => {
  state.success.length = 0;
  state.error.length = 0;
  state.message.length = 0;

  notify.notifyChunksFocusDetailCandidateSaved("已添加关联表达");
  notify.notifyChunksFocusDetailQuickAddValidation("这条已经存在");
  notify.notifyChunksFocusDetailQuickAddSucceeded("已建立关联");
  notify.notifyChunksFocusDetailRetryEnrichmentSuccess();
  notify.notifyChunksFocusDetailCopyTargetSuccess();
  notify.notifyChunksFocusDetailRegenerateAudioSuccess();
  notify.notifyChunksFocusDetailMissingExpression();
  notify.notifyChunksFocusDetailNoSourceSentence();

  assert.deepEqual(state.success, [
    "已添加关联表达",
    "已建立关联",
    zh.retryEnrichmentSuccess,
    zh.quickAddCopySuccess,
    zh.regenerateAudioSuccess,
  ]);
  assert.deepEqual(state.error, [zh.missingExpression]);
  assert.deepEqual(state.message, ["这条已经存在", zh.noSourceSentence]);
});

test("focus detail notify 在失败时会优先使用外部错误文本", () => {
  state.success.length = 0;
  state.error.length = 0;
  state.message.length = 0;

  notify.notifyChunksFocusDetailQuickAddFailed("保存失败");
  notify.notifyChunksFocusDetailRetryEnrichmentFailed("补全失败");
  notify.notifyChunksFocusDetailRegenerateAudioFailed("音频失败");

  assert.deepEqual(state.error, ["保存失败", "补全失败", "音频失败"]);
});
