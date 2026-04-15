import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeterministicIdempotencyKey,
  clearIdempotencyStore,
  getRequestIdempotencyKey,
  runIdempotentMutation,
} from "./idempotency";

test("runIdempotentMutation 会复用同 key 的已完成结果", async () => {
  clearIdempotencyStore();
  let count = 0;

  const first = await runIdempotentMutation({
    scope: "test-scope",
    key: "same-key",
    execute: async () => {
      count += 1;
      return { value: count };
    },
  });

  const second = await runIdempotentMutation({
    scope: "test-scope",
    key: "same-key",
    execute: async () => {
      count += 1;
      return { value: count };
    },
  });

  assert.equal(count, 1);
  assert.deepEqual(first, { value: 1 });
  assert.deepEqual(second, { value: 1 });
});

test("runIdempotentMutation 会复用同 key 的进行中 promise", async () => {
  clearIdempotencyStore();
  let count = 0;

  const [first, second] = await Promise.all([
    runIdempotentMutation({
      scope: "test-scope",
      key: "in-flight",
      execute: async () => {
        count += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return count;
      },
    }),
    runIdempotentMutation({
      scope: "test-scope",
      key: "in-flight",
      execute: async () => {
        count += 1;
        return count;
      },
    }),
  ]);

  assert.equal(count, 1);
  assert.equal(first, 1);
  assert.equal(second, 1);
});

test("getRequestIdempotencyKey 优先读取 header 否则回退到默认 key", () => {
  const requestWithHeader = new Request("http://localhost/test", {
    method: "POST",
    headers: {
      "x-idempotency-key": "header-key",
    },
  });
  const requestWithoutHeader = new Request("http://localhost/test", {
    method: "POST",
  });

  assert.equal(getRequestIdempotencyKey(requestWithHeader, "fallback-key"), "header-key");
  assert.equal(getRequestIdempotencyKey(requestWithoutHeader, "fallback-key"), "fallback-key");
});

test("buildDeterministicIdempotencyKey 对相同输入生成稳定结果", () => {
  const left = buildDeterministicIdempotencyKey("review", { userId: "user-1", value: 1 });
  const right = buildDeterministicIdempotencyKey("review", { value: 1, userId: "user-1" });
  const different = buildDeterministicIdempotencyKey("review", { userId: "user-1", value: 2 });

  assert.equal(left, right);
  assert.notEqual(left, different);
});
