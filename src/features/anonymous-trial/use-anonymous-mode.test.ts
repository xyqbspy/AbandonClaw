import assert from "node:assert/strict";
import test from "node:test";
import {
  isQuotaCritical,
  isQuotaExhausted,
  readQuotaFromResponse,
  type AnonymousQuotaSnapshot,
} from "./use-anonymous-mode";

const makeResponse = (entries: Record<string, string>) => ({
  headers: {
    get: (name: string) => entries[name.toLowerCase()] ?? entries[name] ?? null,
  },
});

test("readQuotaFromResponse 解析 6 个配额头到 snapshot", () => {
  const response = makeResponse({
    "X-Quota-Type": "explain_selection",
    "X-Quota-Daily-Limit": "200",
    "X-Quota-Daily-Remaining": "180",
    "X-Quota-Session-Limit": "3",
    "X-Quota-Session-Remaining": "2",
    "X-Quota-Reset-At": "2026-05-29T00:00:00.000Z",
  });
  const snapshot = readQuotaFromResponse(response);
  assert.deepEqual(snapshot, {
    capability: "explain_selection",
    dailyLimit: 200,
    dailyRemaining: 180,
    sessionLimit: 3,
    sessionRemaining: 2,
    resetAt: "2026-05-29T00:00:00.000Z",
  });
});

test("readQuotaFromResponse 在缺 X-Quota-Type 时返 null", () => {
  const response = makeResponse({ "X-Quota-Daily-Limit": "200" });
  assert.equal(readQuotaFromResponse(response), null);
});

test("readQuotaFromResponse 处理负数/无限上限(-1)与缺失项", () => {
  const response = makeResponse({
    "X-Quota-Type": "tts_play",
    "X-Quota-Daily-Limit": "-1",
    "X-Quota-Session-Limit": "30",
    "X-Quota-Session-Remaining": "30",
    "X-Quota-Reset-At": "2026-05-29T00:00:00.000Z",
  });
  const snapshot = readQuotaFromResponse(response);
  assert.equal(snapshot?.dailyLimit, -1);
  assert.equal(snapshot?.dailyRemaining, null);
  assert.equal(snapshot?.sessionRemaining, 30);
});

test("isQuotaCritical 在 sessionRemaining <= 1 时返 true", () => {
  const base: AnonymousQuotaSnapshot = {
    capability: "explain_selection",
    dailyLimit: 200,
    dailyRemaining: 100,
    sessionLimit: 3,
    sessionRemaining: 1,
    resetAt: null,
  };
  assert.equal(isQuotaCritical(base), true);
  assert.equal(isQuotaCritical({ ...base, sessionRemaining: 2 }), false);
  assert.equal(isQuotaCritical({ ...base, sessionRemaining: 0 }), true);
  assert.equal(isQuotaCritical({ ...base, sessionRemaining: null }), false);
});

test("isQuotaExhausted 在 session 或 daily remaining 为 0 时返 true", () => {
  const base: AnonymousQuotaSnapshot = {
    capability: "explain_selection",
    dailyLimit: 200,
    dailyRemaining: 1,
    sessionLimit: 3,
    sessionRemaining: 3,
    resetAt: null,
  };
  assert.equal(isQuotaExhausted(base), false);
  assert.equal(isQuotaExhausted({ ...base, sessionRemaining: 0 }), true);
  assert.equal(isQuotaExhausted({ ...base, dailyRemaining: 0 }), true);
});
