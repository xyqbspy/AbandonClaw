import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { getScenesFromApi } from "./scenes-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("getScenesFromApi 会对默认列表请求做并发去重", async () => {
  let requestCount = 0;
  let resolveFetch: ((value: Response) => void) | null = null;

  globalThis.fetch = (async () => {
    requestCount += 1;
    return await new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
  }) as typeof fetch;

  const first = getScenesFromApi();
  const second = getScenesFromApi();

  assert.equal(requestCount, 1);

  resolveFetch?.(
    new Response(
      JSON.stringify({
        scenes: [{ id: "scene-1", slug: "scene-1", title: "Scene 1" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.length, 1);
  assert.deepEqual(firstResult, secondResult);
});

test("getScenesFromApi 在 noStore 模式下不会复用并发请求", async () => {
  let requestCount = 0;

  globalThis.fetch = (async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ scenes: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  await Promise.all([
    getScenesFromApi({ noStore: true }),
    getScenesFromApi({ noStore: true }),
  ]);

  assert.equal(requestCount, 2);
});
