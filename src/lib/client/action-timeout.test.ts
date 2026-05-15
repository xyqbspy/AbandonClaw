import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientActionTimeoutError,
  isClientActionTimeoutError,
  withClientActionTimeout,
} from "./action-timeout";

test("withClientActionTimeout 在 timeout 内 resolve 时返回原值", async () => {
  const result = await withClientActionTimeout(Promise.resolve("ok"), { timeoutMs: 100 });
  assert.equal(result, "ok");
});

test("withClientActionTimeout 超时时抛 ClientActionTimeoutError", async () => {
  const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 200));
  await assert.rejects(
    () => withClientActionTimeout(slow, { timeoutMs: 50, timeoutMessage: "登录超时" }),
    (error) => {
      assert.ok(isClientActionTimeoutError(error));
      assert.equal((error as ClientActionTimeoutError).message, "登录超时");
      return true;
    },
  );
});

test("withClientActionTimeout 原 Promise reject 时透传错误", async () => {
  await assert.rejects(
    () => withClientActionTimeout(Promise.reject(new Error("boom")), { timeoutMs: 100 }),
    (error) => {
      assert.equal((error as Error).message, "boom");
      assert.equal(isClientActionTimeoutError(error), false);
      return true;
    },
  );
});
