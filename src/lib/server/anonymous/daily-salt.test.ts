import assert from "node:assert/strict";
import test from "node:test";
import { getDailySalt, getTodayUtcDateKey, hashIp } from "./daily-salt";

const ORIGINAL_SECRET = process.env.ANON_DAILY_SALT_SECRET;

const restore = () => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.ANON_DAILY_SALT_SECRET;
  } else {
    process.env.ANON_DAILY_SALT_SECRET = ORIGINAL_SECRET;
  }
};

test("getTodayUtcDateKey 输出 YYYY-MM-DD", () => {
  const fixed = new Date("2026-05-28T14:35:00Z");
  assert.equal(getTodayUtcDateKey(fixed), "2026-05-28");
});

test("getDailySalt 拼接当日日期(env 缺失时用 fallback)", () => {
  delete process.env.ANON_DAILY_SALT_SECRET;
  const fixed = new Date("2026-05-28T00:00:00Z");
  const salt = getDailySalt(fixed);
  assert.ok(salt.endsWith(":2026-05-28"), `expected suffix 2026-05-28, got ${salt}`);
  restore();
});

test("getDailySalt 使用 env 配置时拼接当日日期", () => {
  process.env.ANON_DAILY_SALT_SECRET = "test-secret";
  const fixed = new Date("2026-05-28T00:00:00Z");
  assert.equal(getDailySalt(fixed), "test-secret:2026-05-28");
  restore();
});

test("hashIp 对同 IP + 同盐输出一致", async () => {
  const a = await hashIp("203.0.113.10", "salt-2026-05-28");
  const b = await hashIp("203.0.113.10", "salt-2026-05-28");
  assert.equal(a, b);
});

test("hashIp 对同 IP 不同盐输出不同(每日盐轮换防长期归因)", async () => {
  const a = await hashIp("203.0.113.10", "salt-2026-05-28");
  const b = await hashIp("203.0.113.10", "salt-2026-05-29");
  assert.notEqual(a, b);
});

test("hashIp 对不同 IP 同盐输出不同", async () => {
  const a = await hashIp("203.0.113.10", "salt");
  const b = await hashIp("203.0.113.11", "salt");
  assert.notEqual(a, b);
});

test("hashIp 输出 64 字符十六进制(SHA-256)", async () => {
  const out = await hashIp("203.0.113.10", "salt");
  assert.match(out, /^[0-9a-f]{64}$/);
});
