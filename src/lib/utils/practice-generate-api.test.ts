import assert from "node:assert/strict";
import test from "node:test";
import {
  practiceGenerateFromApi,
  resetPracticeGenerateFailureGuardsForTests,
} from "./practice-generate-api";

const payload = {
  scene: {
    id: "scene-1",
    slug: "scene-1",
    title: "Scene 1",
    type: "dialogue",
    sections: [],
  },
  exerciseCount: 8,
} as const;

test.afterEach(() => {
  resetPracticeGenerateFailureGuardsForTests();
});

test("practiceGenerateFromApi 连续失败三次后会停止继续请求接口", async () => {
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({ error: "生成练习题失败，请稍后重试。" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const now = () => 1_000;

    await assert.rejects(practiceGenerateFromApi(payload, { now }), /生成练习题失败/);
    await assert.rejects(practiceGenerateFromApi(payload, { now }), /生成练习题失败/);
    await assert.rejects(practiceGenerateFromApi(payload, { now }), /多次失败/);
    await assert.rejects(practiceGenerateFromApi(payload, { now }), /多次失败/);

    assert.equal(fetchCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
