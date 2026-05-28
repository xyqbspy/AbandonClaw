import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  clearAnonymousCounterStore,
  decrDailyCounter,
  incrDailyCounter,
  peekDailyCounter,
} from "./counter";

const FIXED_NOW = new Date("2026-05-28T10:00:00Z").getTime();
const TTL_SECONDS = 60 * 60 * 25;

beforeEach(() => {
  clearAnonymousCounterStore();
});

test("decrDailyCounter: 把现有 INCR 后的计数回退 1", async () => {
  await incrDailyCounter("test:rollback:key", TTL_SECONDS, FIXED_NOW);
  await incrDailyCounter("test:rollback:key", TTL_SECONDS, FIXED_NOW);

  let peek = await peekDailyCounter("test:rollback:key", FIXED_NOW);
  assert.equal(peek.count, 2);

  await decrDailyCounter("test:rollback:key", FIXED_NOW);
  peek = await peekDailyCounter("test:rollback:key", FIXED_NOW);
  assert.equal(peek.count, 1);
});

test("decrDailyCounter: 不存在的 key 调 DECR no-op,peek 仍返回 0(不会变成负数)", async () => {
  await decrDailyCounter("test:nonexistent:key", FIXED_NOW);
  const peek = await peekDailyCounter("test:nonexistent:key", FIXED_NOW);
  assert.equal(peek.count, 0);
});

test("decrDailyCounter: 已过期 key 调 DECR 不创建新条目(避免 EXPIRE 漂移)", async () => {
  const expired = FIXED_NOW - 26 * 60 * 60 * 1000;
  await incrDailyCounter("test:expired:key", 60, expired);
  await decrDailyCounter("test:expired:key", FIXED_NOW);
  const peek = await peekDailyCounter("test:expired:key", FIXED_NOW);
  assert.equal(peek.count, 0);
});

test("decrDailyCounter: 已经 0 的 key DECR 后仍是 0(防止下溢)", async () => {
  await incrDailyCounter("test:floor:key", TTL_SECONDS, FIXED_NOW);
  await decrDailyCounter("test:floor:key", FIXED_NOW);
  await decrDailyCounter("test:floor:key", FIXED_NOW); // 第二次本应让 count 变 -1
  const peek = await peekDailyCounter("test:floor:key", FIXED_NOW);
  assert.equal(peek.count, 0);
});
